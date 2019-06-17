import _ from 'lodash';
import FS from 'fs';
import Database from './lib/database.mjs';
import * as Shutdown from './lib/shutdown.mjs';

// accessors
import Statistics from './lib/accessors/statistics.mjs';
import Listing from './lib/accessors/listing.mjs';
import Story from './lib/accessors/story.mjs';

//  analysers
import DailyActivities from './lib/analysers/daily-activities.mjs';
import DailyNotifications from './lib/analysers/daily-notifications.mjs';
import NotificationDateRange from './lib/analysers/notification-date-range.mjs';
import StoryDateRange from './lib/analysers/story-date-range.mjs';
import StoryPopularity from './lib/analysers/story-popularity.mjs';

// story raters
import ByDiversity from './lib/story-raters/by-diversity.mjs';
import ByPopularity from './lib/story-raters/by-popularity.mjs';
import ByRole from './lib/story-raters/by-role.mjs';
import ByType from './lib/story-raters/by-type.mjs';

const Analysers = [
    DailyActivities,
    DailyNotifications,
    NotificationDateRange,
    StoryDateRange,
    StoryPopularity,
];

const StoryRaters = [
    ByDiversity,
    ByPopularity,
    ByRole,
    ByType,
];

let database;

async function start() {
    // use persistent connection since we need to listen to events
    let db = database = await Database.open(true);
    await db.need('global');
    // get list of tables that the analyers make use of and listen for
    // changes in them
    let statsSources = _.uniq(_.flatten(_.map(Analysers, 'sourceTables')));
    await db.listen(statsSources, 'change', handleDatabaseChangesAffectingStatistics);

    // listings, meanwhile, are derived from story and statistics
    let listingSources = [ 'story', 'statistics' ];
    await db.listen(listingSources, 'change', handleDatabaseChangesAffectingListings);
}

async function stop() {
    if (database) {
        database.close();
        database = null;
    }
};

async function handleDatabaseChangesAffectingStatistics(events) {
    // filter out events from other tests
    if (process.env.DOCKER_MOCHA) {
        events = _.filter(events, (event) => {
            return (event.schema === 'test:LiveDataInvalidator');
        });
    }
    // process the events for each schema separately
    let db = this;
    let eventsBySchema = _.entries(_.groupBy(events, 'schema'));
    for (let [ schema, schemaEvents ] of eventsBySchema) {
        await invalidateStatistics(db, schema, schemaEvents);
    }
}

async function handleDatabaseChangesAffectingListings(events) {
    // filter out events from other tests
    if (process.env.DOCKER_MOCHA) {
        events = _.filter(events, (event) => {
            return (event.schema === 'test:LiveDataInvalidator');
        });
    }
    // process the events for each schema separately
    let db = this;
    let eventsBySchema = _.entries(_.groupBy(events, 'schema'));
    for (let [ schema, schemaEvents ] of eventsBySchema) {
        await invalidateListings(db, schema, schemaEvents);
    }
}

/**
 * Mark statistics impacted by database changes as dirty
 *
 * @param  {[type]} db
 * @param  {[type]} schema
 * @param  {[type]} events
 *
 * @return {[type]}
 */
async function invalidateStatistics(db, schema, events) {
    let ids = await findStatisticsImpactedByDatabaseChanges(db, schema, events);
    let idChunks = _.chunk(ids, 20);
    for (let idChunk of idChunks) {
        console.log(`Invalidating statistics in ${schema}: ${idChunk.join(', ')}`)
        await Statistics.invalidate(db, schema, idChunk);
    }
}

/**
 * Find statistics impacted by database changes
 *
 * @param  {Database} db
 * @param  {String} schema
 * @param  {Array<Object>} events
 *
 * @return {Promise<Array<Number>>}
 */
async function findStatisticsImpactedByDatabaseChanges(db, schema, events) {
    let impactedRows = [];
    for (let analyser of Analysers) {
        for (let table of analyser.sourceTables) {
            let filteredColumnMappings = analyser.filteredColumns[table];
            let filteredColumns = _.values(filteredColumnMappings);
            let depedentColumns = analyser.depedentColumns[table];
            let fixedFilterValues = analyser.fixedFilters[table];

            // filter out events that won't cause a change in the stats
            let relevantEvents = _.filter(events, (event) => {
                if (event.table !== table) {
                    return false;
                }
                let changedColumns = _.keys(event.diff);
                return _.some(changedColumns, (column) => {
                    if (_.includes(filteredColumns, column)) {
                        // the change could affect whether the object is included or not
                        return true;
                    }
                    if (_.includes(depedentColumns, column)) {
                        // the change could affect the results
                        return true;
                    }
                    if (!fixedFilterValues) {
                        return true;
                    }
                    let requiredValue = fixedFilterValues[column];
                    if (requiredValue !== undefined) {
                        // see if there's a change in whether the object meets the
                        // fixed filter's condition
                        let valueBefore = event.previous[column];
                        let valueAfter = event.current[column];
                        let conditionMetBefore = (valueBefore === requiredValue);
                        let conditionMetAfter = (valueAfter === requiredValue);
                        if (conditionMetBefore !== conditionMetAfter) {
                            return true;
                        }
                    }
                });
            });

            // extract the before and after values of the rows
            let sourceRowsBefore = extractPreviousValues(relevantEvents, filteredColumns);
            let sourceRowsAfter = extractCurrentValues(relevantEvents, filteredColumns);
            let sourceRows = _.concat(sourceRowsBefore, sourceRowsAfter);
            if (!_.isEmpty(sourceRows)) {
                // stored the value under the filter name, as required by the
                // stored proc matchAny()
                let matchingObjects = _.map(sourceRows, (row) => {
                    return _.mapValues(filteredColumnMappings, (column, filter) => {
                        return row[column];
                    });
                });

                // find statistics rows that cover these objects
                let criteria = {
                    type: analyser.type,
                    match_any: matchingObjects,
                    dirty: false,
                };
                let rows = await Statistics.find(db, schema, criteria, 'id, sample_count, atime');
                for (let row of rows) {
                    impactedRows.push(row);
                }
            }
        }
    }
    // return stats with fewer data points first, since they change more rapidly
    let orderedRows = _.orderBy(impactedRows, [ 'sample_count', 'atime' ], [ 'asc', 'desc' ]);
    let ids = _.map(orderedRows, 'id');
    return ids;
}

/**
 * Mark listings impacted by database changes as dirty
 *
 * @param  {Database} db
 * @param  {String} schema
 * @param  {Array<Object>} events
 *
 * @return {Promise}
 */
async function invalidateListings(db, schema, events) {
    let ids1 = await findListingsImpactedByStoryChanges(db, schema, events);
    let ids2 = await findListingsImpactedByStatisticsChange(db, schema, events);
    let ids = _.concat(ids1, ids2);
    let idChunks = _.chunk(ids, 20);
    for (let idChunk of idChunks) {
        console.log(`Invalidating story listings in ${schema}: ${idChunk.join(', ')}`)
        await Listing.invalidate(db, schema, idChunk);
    }
}

/**
 * Find listings impacted by story changes
 *
 * @param  {Database} db
 * @param  {String} schema
 * @param  {Array<Object>} events
 *
 * @return {Promise<Array<Number>>}
 */
async function findListingsImpactedByStoryChanges(db, schema, events) {
    // these columns determines whether a story is included in a listing or not
    let filteredColumnMappings = {
        published: 'published',
        ready: 'ready',
        public: 'public',
        deleted: 'deleted',
        user_ids: 'user_ids',
        role_ids: 'role_ids',
    };
    let filteredColumns = _.values(filteredColumnMappings);
    // columns that affects rating
    let ratingColumns = _.uniq(_.flatten(_.map(StoryRaters, 'columns')));
    // columns that affects order (hence whether it'd be excluded by the LIMIT clause)
    let orderingColumns = [ 'btime' ];
    let relevantEvents = _.filter(events, (event) => {
        if (event.table === 'story') {
            // only stories that are published (or have just been unpublished)
            // can impact listings
            if (event.current.published || event.diff.pubished) {
                let changedColumns = _.keys(event.diff);
                return _.some(changedColumns, (column) => {
                    if (_.includes(filteredColumns, column)) {
                        return true;
                    } else if (_.includes(ratingColumns, column)) {
                        return true;
                    } else if (_.includes(orderingColumns, column)) {
                        return true;
                    }
                });
            }
        }
    });
    // a listing gets updated if a changed row matches its criteria currently
    // or previously
    let storiesBefore = extractPreviousValues(relevantEvents, filteredColumns);
    let storiesAfter = extractCurrentValues(relevantEvents, filteredColumns);
    let stories = _.concat(storiesBefore, storiesAfter);
    if (_.isEmpty(stories)) {
        return [];
    }
    let matchingObjects = _.map(stories, (row) => {
        return _.mapValues(filteredColumnMappings, (column, filter) => {
            return row[column];
        });
    });
    // find listing rows that cover these stories
    let listingCriteria = {
        match_any: matchingObjects,
        dirty: false,
    };
    let rows = await Listing.find(db, schema, listingCriteria, 'id, atime');
    // return listings that have been accessed recently first
    let orderedRows = _.orderBy(rows, [ 'atime' ], [ 'desc' ]);
    let ids = _.map(orderedRows, 'id');
    return ids;
}

/**
 * Find listings impacted by statistic changes
 *
 * @param  {Database} db
 * @param  {String} schema
 * @param  {Array<Object>} events
 *
 * @return {Promise<Array<Number>>}
 */
async function findListingsImpactedByStatisticsChange(db, schema, events) {
    // only story-popularity is used
    let relevantEvents = _.filter(events, (event) => {
        if (event.table === 'statistics') {
            if (event.current.type === 'story-popularity') {
                return true;
            }
        }
    });
    // change object for Statistics contains the row's filters
    let storyIDs = _.map(relevantEvents, (event) => {
        return event.current.filters.story_id;
    });
    if (_.isEmpty(storyIDs)) {
        return [];
    }
    let listingCriteria = {
        has_candidates: storyIDs,
        dirty: false,
    };
    let rows = await Listing.find(db, schema, listingCriteria, 'id, atime');
    let orderedRows = _.orderBy(rows, [ 'atime' ], [ 'desc' ]);
    let ids = _.map(orderedRows, 'id');
    return ids;
}

/**
 * Extract the values of columns prior to a change from database change events.
 * Only columns provided to createNotificationTriggers() when the database
 * table was created would be available.
 *
 * @param  {Array<Object>} events
 * @param  {Array<String>} columns
 *
 * @return {Array<Object>}
 */
function extractCurrentValues(events, columns) {
    return _.filter(_.map(events, (event) => {
        if (event.op !== 'DELETE') {
            let row = event.current;
            return _.pick(row, columns);
        }
    }));
}

/**
 * Extract the values of columns prior to a change from database change events
 *
 * @param  {Array<Object>} events
 *
 * @return {Array<Object>}
 */
function extractPreviousValues(events, columns) {
    return _.filter(_.map(events, (event) => {
        if (event.op !== 'INSERT') {
            // include row only when the request columns have changed
            let changed = _.some(columns, (column) => {
                return event.diff[column];
            });
            if (changed) {
                // event.previous only contains properties that differ from the
                // current values--reconstruct the row
                let row = _.assign({}, event.current, event.previous);
                return _.pick(row, columns);
            }
        }
    }));
}

if ('file://' + process.argv[1] === import.meta.url) {
    start();
    Shutdown.addListener(stop);
}

export {
    start,
    stop,
};
