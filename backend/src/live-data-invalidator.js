var _ = require('lodash');
var Promise = require('bluebird');
var Database = require('database');

var DailyActivities = require('analysers/daily-activities');
var ProjectDateRange = require('analysers/project-date-range');
var StoryPopularity = require('analysers/story-popularity');

var analysers = [
    DailyActivities,
    ProjectDateRange,
    StoryPopularity,
];

Database.open(true).then((db) => {
    return Promise.resolve().then(() => {
        // get list of tables that analyers make use of
        var tables = _.reduce(analysers, (list, analyser) => {
            return _.union(list, analyser.sourceTables);
        }, []);
        return db.listen(tables, 'change', handleDatabaseChanges);
    });
});

function handleDatabaseChanges(events) {
    // process the events for each schema separately
    var db = this;
    var eventGroups = _.groupBy(events, 'schema');
    var schemas = _.keys(eventGroups);
    return Promise.each(schemas, (schema) => {
        var schemaEvents = eventGroups[schema];
        return invalidateStatistics(db, schema, events);
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
            var accessor = getAccessor(table);
            var objectCriteria = _.extend({ id: ids }, fixedFilters);
            var columns = _.join(_.mapValues(filteredColumns, (column, filter) => {
                // use the filter name for the column
                if (column !== filter) {
                    return `${column} AS ${filter}`;
                } else {
                    return column;
                }
            }), ', ');
            return accessor.find(db, schema, objectCriteria, columns).then((objects) => {
                if (_.isEmpty(objects)) {
                    return [];
                }
                // find statistics rows that cover these objects
                var statsCriteria = {
                    filters: objects,
                    dirty: false,
                };
                return Statistics.find(db, schema, statsCriteria, 'id, sample_count');
            }).then((rows) => {
                // invalidate those stats with fewer data points first
                var ids = _.map(_.sortBy(rows, 'sample_count'), 'id');
                var chunks = _.chunk(ids, 50);
                return Promise.map(chunks, (ids) => {
                    return Statistics.invalidate(db, schema, ids);
                });
            });
        });
    });
}
