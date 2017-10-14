var _ = require('lodash');
var Promise = require('bluebird');
var Database = require('database');

// accessors
var Statistics = require('accessors/statistics');
var Listing = require('accessors/listing');
var Story = require('accessors/story');

// analysers
var DailyActivities = require('analysers/daily-activities');
var DailyReactions = require('analysers/daily-reactions');
var ProjectDateRange = require('analysers/story-date-range');
var StoryPopularity = require('analysers/story-popularity');

var analysers = [
    DailyActivities,
    DailyReactions,
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
            var tables = _.uniq(_.map(analysers, 'analyser.sourceTables'));
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
                            var valueBefore = event.diff[column][0];
                            var valueAfter = event.diff[column][0];
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

            // load the changed objects, fetching only columns that are filtered on
            var ids = _.map(relevantEvents, 'id');
            var accessor = require(`accessors/${table}`);
            var objectCriteria = _.extend({ id: ids }, fixedFilters);
            var columns = [];
            _.each(filteredColumns, (column, filter) => {
                // use the filter name for the column
                if (column !== filter) {
                    columns.push(`${column} AS ${filter}`);
                } else {
                    columns.push(column);
                }
            });
            return accessor.find(db, schema, objectCriteria, columns.join(', ')).then((rows) => {
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
                var orderedRows = _.orderBy(rows, [ 'sample_count', 'atime' ], [ 'asc', 'desc' ])
                var ids = _.map(orderedRows, 'id');
                var chunks = _.chunk(ids, 10);
                return Promise.each(chunks, (ids) => {
                    return Statistics.invalidate(db, schema, ids);
                });
            });
        });
    });
}

function invalidateListings(db, schema, events) {
    return Promise.all([
        findListingsImpactedByStoryChanges(db, schema, events),
        findListingsImpactedByStatisticsChange(db, schema, events),
    ]).then((idLists) => {
        var ids = _.flatten(idLists);
        var chunks = _.chunk(ids, 10);
        return Promise.each(chunks, (ids) => {
            return Listing.invalidate(db, schema, ids);
        });
    });
}

function findListingsImpactedByStoryChanges(db, schema, events) {
    var relevantEvents = _.filter(events, (event) => {
        if (event.table === 'story') {
            if (event.diff.published || event.diff.ready) {
                return true;
            }
        }
    });
    if (_.isEmpty(relevantEvents)) {
        return [];
    }
    var storyCriteria = {
        id: _.map(relevantEvents, 'id'),
    };
    return Story.find(db, schema, storyCriteria, 'user_ids, role_ids').then((rows) => {
        if (_.isEmpty(rows)) {
            return [];
        }
        // find statistics rows that cover these objects
        var listingCriteria = {
            match_any: rows,
            dirty: false,
        };
        return Listing.find(db, schema, listingCriteria, 'id');
    }).then((rows) => {
        return _.map(rows, 'id');
    });
}

function findListingsImpactedByStatisticsChange(db, schema, events) {
    var relevantEvents = _.filter(events, (event) => {
        if (event.table === 'statistics') {
            return true;
        }
    });
    if (_.isEmpty(relevantEvents)) {
        return [];
    }
    var statsCriteria = {
        type: 'story-popularity',
        id: _.map(relevantEvents, 'id'),
    };
    return Statistics.find(db, schema, statsCriteria, 'filters').then((rows) => {
        var storyIds = _.filter(_.map(rows, 'filters.story_id'));
        if (_.isEmpty(storyIds)) {
            return [];
        }
        var listingCriteria = {
            has_candidates: storyIds,
            dirty: false,
        };
        return Listing.find(db, schema, listingCriteria, 'id')
    }).then((rows) => {
        return _.map(rows, 'id');
    });
}

exports.start = start;
exports.stop = stop;

if (process.argv[1] === __filename) {
    start();
}
