import _ from 'lodash';
import FS from 'fs';
import Database from './lib/database.mjs';
import * as TaskLog from './lib/task-log.mjs';
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
    const db = database = await Database.open(true);
    await db.need('global');
    // get list of tables that the analyers make use of and listen for
    // changes in them
    const statsSources = _.uniq(_.flatten(_.map(Analysers, 'sourceTables')));
    await db.listen(statsSources, 'change', handleDatabaseChangesAffectingStatistics);

    // listings, meanwhile, are derived from story and statistics
    const listingSources = [ 'story', 'statistics' ];
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
    const db = this;
    const eventsBySchema = _.entries(_.groupBy(events, 'schema'));
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
    const db = this;
    const eventsBySchema = _.entries(_.groupBy(events, 'schema'));
    for (let [ schema, schemaEvents ] of eventsBySchema) {
        await invalidateListings(db, schema, schemaEvents);
    }
}

/**
 * Mark statistics impacted by database changes as dirty
 *
 * @param  {Database} db
 * @param  {String} schema
 * @param  {Array<Object>} events
 *
 * @return {Promise}
 */
async function invalidateStatistics(db, schema, events) {
    const taskLog = TaskLog.start('statistics-invalidate', { project: schema });
    try {
        taskLog.describe(`searching for rows impacted`);
        const ids = await findStatisticsImpactedByDatabaseChanges(db, schema, events);
        const idChunks = _.chunk(ids, 20);
        taskLog.describe(`updating rows`);
        for (let idChunk of idChunks) {
            await Statistics.invalidate(db, schema, idChunk);
        }
        if (!_.isEmpty(ids)) {
            taskLog.set('invalidated', ids);
        }
        await taskLog.finish();
    } catch (err) {
        await taskLog.abort(err);
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
    const impactedRows = [];
    for (let analyser of Analysers) {
        for (let table of analyser.sourceTables) {
            const filteredColumnMappings = analyser.filteredColumns[table];
            const filteredColumns = _.values(filteredColumnMappings);
            const depedentColumns = analyser.depedentColumns[table];
            const fixedFilterValues = analyser.fixedFilters[table];

            // filter out events that won't cause a change in the stats
            const relevantEvents = _.filter(events, (event) => {
                if (event.table !== table) {
                    return false;
                }
                const changedColumns = _.keys(event.diff);
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
                    const requiredValue = fixedFilterValues[column];
                    if (requiredValue !== undefined) {
                        // see if there's a change in whether the object meets the
                        // fixed filter's condition
                        const valueBefore = event.previous[column];
                        const valueAfter = event.current[column];
                        const conditionMetBefore = (valueBefore === requiredValue);
                        const conditionMetAfter = (valueAfter === requiredValue);
                        if (conditionMetBefore !== conditionMetAfter) {
                            return true;
                        }
                    }
                });
            });

            // extract the before and after values of the rows
            const sourceRowsBefore = extractPreviousValues(relevantEvents, filteredColumns);
            const sourceRowsAfter = extractCurrentValues(relevantEvents, filteredColumns);
            const sourceRows = _.concat(sourceRowsBefore, sourceRowsAfter);
            if (!_.isEmpty(sourceRows)) {
                // stored the value under the filter name, as required by the
                // stored proc matchAny()
                const matchingObjects = _.map(sourceRows, (row) => {
                    return _.mapValues(filteredColumnMappings, (column, filter) => {
                        return row[column];
                    });
                });

                // find statistics rows that cover these objects
                const criteria = {
                    type: analyser.type,
                    match_any: matchingObjects,
                    dirty: false,
                };
                const rows = await Statistics.find(db, schema, criteria, 'id, sample_count, atime');
                for (let row of rows) {
                    impactedRows.push(row);
                }
            }
        }
    }
    // return stats with fewer data points first, since they change more rapidly
    const orderedRows = _.orderBy(impactedRows, [ 'sample_count', 'atime' ], [ 'asc', 'desc' ]);
    const ids = _.map(orderedRows, 'id');
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
    const taskLog = TaskLog.start('listing-invalidate', { project: schema });
    try {
        taskLog.describe('searching for rows impacted');
        const ids1 = await findListingsImpactedByStoryChanges(db, schema, events);
        const ids2 = await findListingsImpactedByStatisticsChange(db, schema, events);
        const ids = _.concat(ids1, ids2);
        const idChunks = _.chunk(ids, 20);
        taskLog.describe(`updating rows`);
        for (let idChunk of idChunks) {
            await Listing.invalidate(db, schema, idChunk);
        }
        if (!_.isEmpty(ids)) {
            taskLog.set('invalidated', ids);
        }
        await taskLog.finish();
    } catch (err) {
        await taskLog.abort(err);
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
    const filteredColumnMappings = {
        published: 'published',
        ready: 'ready',
        public: 'public',
        deleted: 'deleted',
        user_ids: 'user_ids',
        role_ids: 'role_ids',
    };
    const filteredColumns = _.values(filteredColumnMappings);
    // columns that affects rating
    const ratingColumns = _.uniq(_.flatten(_.map(StoryRaters, 'columns')));
    // columns that affects order (hence whether it'd be excluded by the LIMIT clause)
    const orderingColumns = [ 'btime' ];
    const relevantEvents = _.filter(events, (event) => {
        if (event.table === 'story') {
            // only stories that are published (or have just been unpublished)
            // can impact listings
            if (event.current.published || event.diff.pubished) {
                const changedColumns = _.keys(event.diff);
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
    const storiesBefore = extractPreviousValues(relevantEvents, filteredColumns);
    const storiesAfter = extractCurrentValues(relevantEvents, filteredColumns);
    const stories = _.concat(storiesBefore, storiesAfter);
    if (_.isEmpty(stories)) {
        return [];
    }
    const matchingObjects = _.map(stories, (row) => {
        return _.mapValues(filteredColumnMappings, (column, filter) => {
            return row[column];
        });
    });
    // find listing rows that cover these stories
    const listingCriteria = {
        match_any: matchingObjects,
        dirty: false,
    };
    const rows = await Listing.find(db, schema, listingCriteria, 'id, atime');
    // return listings that have been accessed recently first
    const orderedRows = _.orderBy(rows, [ 'atime' ], [ 'desc' ]);
    const ids = _.map(orderedRows, 'id');
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
    const relevantEvents = _.filter(events, (event) => {
        if (event.table === 'statistics') {
            if (event.current.type === 'story-popularity') {
                return true;
            }
        }
    });
    // change object for Statistics contains the row's filters
    const storyIDs = _.map(relevantEvents, (event) => {
        return event.current.filters.story_id;
    });
    if (_.isEmpty(storyIDs)) {
        return [];
    }
    const listingCriteria = {
        has_candidates: storyIDs,
        dirty: false,
    };
    const rows = await Listing.find(db, schema, listingCriteria, 'id, atime');
    const orderedRows = _.orderBy(rows, [ 'atime' ], [ 'desc' ]);
    const ids = _.map(orderedRows, 'id');
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
            const row = event.current;
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
            const changed = _.some(columns, (column) => {
                return event.diff[column];
            });
            if (changed) {
                // event.previous only contains properties that differ from the
                // current values--reconstruct the row
                const row = _.assign({}, event.current, event.previous);
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
