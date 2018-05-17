var _ = require('lodash');
var Promise = require('bluebird');
var FS = require('fs');
var Database = require('database');
var Shutdown = require('shutdown');

// accessors
var Statistics = require('accessors/statistics');
var Listing = require('accessors/listing');
var Story = require('accessors/story');

module.exports = {
    start,
    stop,
};

// load available analysers
var Analysers = _.filter(_.map(FS.readdirSync(`${__dirname}/lib/analysers`), (filename) => {
    if (/\.js$/.test(filename)) {
        var module = require(`analysers/${filename}`);
        return module;
    }
}));
// load available story raters
var StoryRaters = _.filter(_.map(FS.readdirSync(`${__dirname}/lib/story-raters`), (filename) => {
    if (/\.js$/.test(filename)) {
        var module = require(`story-raters/${filename}`);
        // certain ratings cannot be applied until the listing is being retrieved
        // (e.g. by retrieval time)
        if (module.calculation !== 'deferred') {
            return module;
        }
    }
}));

var database;

function start() {
    return Database.open(true).then((db) => {
        database = db;
        return db.need('global').then(() => {
            // get list of tables that the analyers make use of and listen
            // for changes in them
            var tables = _.uniq(_.flatten(_.map(Analysers, 'sourceTables')));
            return db.listen(tables, 'change', handleDatabaseChangesAffectingStatistics).then(() => {
                // listings, meanwhile, are derived from story and statistics
                var tables = [ 'story', 'statistics' ];
                return db.listen(tables, 'change', handleDatabaseChangesAffectingListings);
            });
        });
    });
}

function stop() {
    if (database) {
        database.close();
        database = null;
    }
    return Promise.resolve();
};

function handleDatabaseChangesAffectingStatistics(events) {
    // filter out events from other tests
    if (process.env.DOCKER_MOCHA) {
        events = _.filter(events, (event) => {
            return (event.schema === 'test:LiveDataInvalidator');
        });
    }
    // process the events for each schema separately
    var db = this;
    var eventGroups = _.groupBy(events, 'schema');
    var schemas = _.keys(eventGroups);
    return Promise.each(schemas, (schema) => {
        var schemaEvents = eventGroups[schema];
        return invalidateStatistics(db, schema, schemaEvents);
    });
}

function handleDatabaseChangesAffectingListings(events) {
    // filter out events from other tests
    if (process.env.DOCKER_MOCHA) {
        events = _.filter(events, (event) => {
            return (event.schema === 'test:LiveDataInvalidator');
        });
    }
    // process the events for each schema separately
    var db = this;
    var eventGroups = _.groupBy(events, 'schema');
    var schemas = _.keys(eventGroups);
    return Promise.each(schemas, (schema) => {
        var schemaEvents = eventGroups[schema];
        return invalidateListings(db, schema, schemaEvents);
    });
}

function invalidateStatistics(db, schema, events) {
    return Promise.each(Analysers, (analyser) => {
        // process events for each source table
        return Promise.map(analyser.sourceTables, (table) => {
            var filteredColumnMappings = analyser.filteredColumns[table];
            var filteredColumns = _.values(filteredColumnMappings);
            var depedentColumns = analyser.depedentColumns[table];
            var fixedFilterValues = analyser.fixedFilters[table];

            // filter out events that won't cause a change in the stats
            var relevantEvents = _.filter(events, (event) => {
                if (event.table !== table) {
                    return false;
                }
                var changedColumns = _.keys(event.diff);
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
                    var requiredValue = fixedFilterValues[column];
                    if (requiredValue !== undefined) {
                        // see if there's a change in whether the object meets the
                        // fixed filter's condition
                        var valueBefore = event.previous[column];
                        var valueAfter = event.current[column];
                        var conditionMetBefore = (valueBefore === requiredValue);
                        var conditionMetAfter = (valueAfter === requiredValue);
                        if (conditionMetBefore !== conditionMetAfter) {
                            return true;
                        }
                    }
                });
            });

            // extract the before and after values of the rows
            var sourceRowsBefore = extractPreviousValues(relevantEvents, filteredColumns);
            var sourceRowsAfter = extractCurrentValues(relevantEvents, filteredColumns);
            var sourceRows = _.concat(sourceRowsBefore, sourceRowsAfter);
            if (_.isEmpty(sourceRows)) {
                return [];
            }
            // stored the value under the filter name, as required by the
            // stored proc matchAny()
            var matchingObjects = _.map(sourceRows, (row) => {
                return _.mapValues(filteredColumnMappings, (column, filter) => {
                    return row[column];
                });
            });

            // find statistics rows that cover these objects
            var criteria = {
                type: analyser.type,
                match_any: matchingObjects,
                dirty: false,
            };
            return Statistics.find(db, schema, criteria, 'id, sample_count').then((rows) => {
                // invalidate those stats with fewer data points first
                var orderedRows = _.orderBy(rows, [ 'sample_count', 'atime' ], [ 'asc', 'desc' ]);
                var ids = _.map(orderedRows, 'id');
                var chunks = _.chunk(ids, 20);
                if (!_.isEmpty(ids)) {
                    console.log(`Invalidating statistics in ${schema}: ${ids.join(', ')}`)
                }
                return Promise.each(chunks, (ids) => {
                    return Statistics.invalidate(db, schema, ids);
                });
            });
        });
    });
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
function invalidateListings(db, schema, events) {
    return Promise.all([
        findListingsImpactedByStoryChanges(db, schema, events),
        findListingsImpactedByStatisticsChange(db, schema, events),
    ]).then((idLists) => {
        var ids = _.flatten(idLists);
        var chunks = _.chunk(ids, 20);
        if (!_.isEmpty(ids)) {
            console.log(`Invalidating story listings in ${schema}: ${ids.join(', ')}`)
        }
        return Promise.each(chunks, (ids) => {
            return Listing.invalidate(db, schema, ids);
        });
    });
}

/**
 * Mark listings impacted by story changes as dirty
 *
 * @param  {Database} db
 * @param  {String} schema
 * @param  {Array<Object>} events
 *
 * @return {Promise}
 */
function findListingsImpactedByStoryChanges(db, schema, events) {
    // these columns determines whether a story is included in a listing or not
    var filteredColumnMappings = {
        published: 'published',
        ready: 'ready',
        public: 'public',
        deleted: 'deleted',
        user_ids: 'user_ids',
        role_ids: 'role_ids',
    };
    var filteredColumns = _.values(filteredColumnMappings);
    // columns that affects rating
    var ratingColumns = _.uniq(_.flatten(_.map(StoryRaters, 'columns')));
    // columns that affects order (hence whether it'd be excluded by the LIMIT clause)
    var orderingColumns = [ 'btime' ];
    var relevantEvents = _.filter(events, (event) => {
        if (event.table === 'story') {
            // only stories that are published (or have just been unpublished)
            // can impact listings
            if (event.current.published || event.diff.pubished) {
                var changedColumns = _.keys(event.diff);
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
    var storiesBefore = extractPreviousValues(relevantEvents, filteredColumns);
    var storiesAfter = extractCurrentValues(relevantEvents, filteredColumns);
    var stories = _.concat(storiesBefore, storiesAfter);
    if (_.isEmpty(stories)) {
        return [];
    }
    var matchingObjects = _.map(stories, (row) => {
        return _.mapValues(filteredColumnMappings, (column, filter) => {
            return row[column];
        });
    });
    // find listing rows that cover these stories
    var listingCriteria = {
        match_any: matchingObjects,
        dirty: false,
    };
    return Listing.find(db, schema, listingCriteria, 'id').then((rows) => {
        return _.map(rows, 'id');
    });
}

/**
 * Mark listings impacted by statistic changes as dirty
 *
 * @param  {Database} db
 * @param  {String} schema
 * @param  {Array<Object>} events
 *
 * @return {Promise}
 */
function findListingsImpactedByStatisticsChange(db, schema, events) {
    // only story-popularity is used
    var relevantEvents = _.filter(events, (event) => {
        if (event.table === 'statistics') {
            if (event.current.type === 'story-popularity') {
                return true;
            }
        }
    });
    // change object for Statistics contains the row's filters
    var storyIds = _.map(relevantEvents, (event) => {
        return event.current.filters.story_id;
    });
    if (_.isEmpty(storyIds)) {
        return [];
    }
    var listingCriteria = {
        has_candidates: storyIds,
        dirty: false,
    };
    return Listing.find(db, schema, listingCriteria, 'id').then((rows) => {
        return _.map(rows, 'id');
    });
}

if (process.argv[1] === __filename) {
    start();
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
            var row = event.current;
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
            var changed = _.some(columns, (column) => {
                return event.diff[column];
            });
            if (changed) {
                // event.previous only contains properties that differ from the
                // current values--reconstruct the row
                var row = _.assign({}, event.current, event.previous);
                return _.pick(row, columns);
            }
        }
    }));
}

Shutdown.on(stop);
