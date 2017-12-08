var _ = require('lodash');
var Promise = require('bluebird');
var Database = require('database');
var Shutdown = require('shutdown');

// accessors
var Statistics = require('accessors/statistics');
var Listing = require('accessors/listing');
var Story = require('accessors/story');

// analysers
var DailyActivities = require('analysers/daily-activities');
var DailyNotifications = require('analysers/daily-notifications');
var ProjectDateRange = require('analysers/story-date-range');
var StoryPopularity = require('analysers/story-popularity');

var analysers = [
    DailyActivities,
    DailyNotifications,
    ProjectDateRange,
    StoryPopularity,
];
var database;

function start() {
    return Database.open(true).then((db) => {
        database = db;
        return db.need('global').then(() => {
            // get list of tables that the analyers make use of and listen
            // for changes in them
            var tables = _.uniq(_.flatten(_.map(analysers, 'sourceTables')));
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
    return Promise.each(analysers, (analyser) => {
        // process events for each source table
        return Promise.map(analyser.sourceTables, (table) => {
            var filteredColumns = analyser.filteredColumns[table];
            var depedentColumns = analyser.depedentColumns[table];
            var fixedFilters = analyser.fixedFilters[table];

            // filter out events that won't cause a change in the stats
            var relevantEvents = _.filter(events, (event) => {
                if (event.table !== table) {
                    return false;
                }
                for (var column in event.diff) {
                    if (_.includes(filteredColumns, column)) {
                        // the change could affect whether the object is included or not
                        return true;
                    }
                    if (_.includes(depedentColumns, column)) {
                        // the change could affect the results
                        return true;
                    }
                    if (fixedFilters) {
                        var requiredValue = fixedFilters[column];
                        if (requiredValue !== undefined) {
                            // see if there's a change in whether the object meets the
                            // fixed filter's condition
                            var valueBefore = event.previous[column];
                            var valueAfter = event.current[column];
                            if (valueBefore === undefined || valueAfter === undefined) {
                                // column isn't included in the change object
                                // assume the change can lead to stats change
                                return true;
                            }
                            var conditionMetBefore = (valueBefore === requiredValue);
                            var conditionMetAfter = (valueAfter === requiredValue);
                            if (conditionMetBefore !== conditionMetAfter) {
                                return true;
                            }
                        }
                    }
                }
                return false;
            });
            if (_.isEmpty(relevantEvents)) {
                return;
            }

            return loadObjectsForFilters(db, schema, table, filteredColumns, fixedFilters, relevantEvents).then((rows) => {
                if (_.isEmpty(rows)) {
                    return [];
                }
                // find statistics rows that cover these objects
                var statsCriteria = {
                    match_any: rows,
                    dirty: false,
                };
                return Statistics.find(db, schema, statsCriteria, 'id, sample_count');
            }).then((rows) => {
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
 * Extract column values from change event objects if possible,
 * otherwise load the changed rows from database
 *
 * @param  {Database} db
 * @param  {String} schema
 * @param  {String} table
 * @param  {Object} filteredColumns
 * @param  {Object} fixedFilters
 * @param  {Array<Object>} events
 *
 * @return {Array<Object>}
 */
function loadObjectsForFilters(db, schema, table, filteredColumns, fixedFilters, events) {
    // first, see if the necessary properties are in the change event objects
    return Promise.try(() => {
        var objects = _.map(events, (event, index) => {
            var current = event.current;
            if (index === 0) {
                // make sure all the properties are there
                // only need to do this for the first event
                _.each(fixedFilters, (value, column) => {
                    if (!current.hasOwnProperty(column)) {
                        throw new Error(`Missing column: ${column}`);
                    }
                });
                _.each(filteredColumns, (column) => {
                    if (column !== 'id') {
                        if (!current.hasOwnProperty(column)) {
                            throw new Error(`Missing column: ${column}`);
                        }
                    }
                });
            }

            // all required fields are there in the change object already
            // see if the properties match the fixed filters (e.g. deleted, published, etc.)
            if (_.isMatch(current, fixedFilters)) {
                var object = {};
                _.each(filteredColumns, (column, filter) => {
                    // stored the value under the filter name, as required by the
                    // stored proc matchAny()
                    object[filter] = (column === 'id') ? event.id : current[column];
                });
                return object;
            } else {
                return null;
            }
        });
        return _.filter(objects);
    }).catch((err) => {
        console.warn(err.message);
        // need to actually load the objects
        var accessor = require(`accessors/${table}`);
        var ids = _.map(events, 'id');
        var objectCriteria = _.extend({ id: ids }, fixedFilters);
        var columns = [];
        _.each(filteredColumns, (column, filter) => {
            // use the filter name for the column as required by matchAny()
            if (column !== filter) {
                columns.push(`${column} AS ${filter}`);
            } else {
                columns.push(column);
            }
        });
        return accessor.find(db, schema, objectCriteria, columns.join(', '));
    });
}

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

function findListingsImpactedByStoryChanges(db, schema, events) {
    var relevantEvents = _.filter(events, (event) => {
        if (event.table === 'story') {
            if (event.current.published && event.current.ready) {
                return true;
            }
        }
    });
    // the change object for Story happens to have the properties
    // that Listing filters operate on
    var stories = _.map(relevantEvents, (event) => {
        return event.current;
    });
    if (_.isEmpty(stories)) {
        return [];
    }
    // find listing rows that cover these stories
    var listingCriteria = {
        match_any: stories,
        dirty: false,
    };
    return Listing.find(db, schema, listingCriteria, 'id').then((rows) => {
        return _.map(rows, 'id');
    });
}

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

exports.start = start;
exports.stop = stop;

if (process.argv[1] === __filename) {
    start();
}

Shutdown.on(stop);
