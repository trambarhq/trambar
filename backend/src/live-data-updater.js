var _ = require('lodash');
var Promise = require('bluebird');
var Database = require('database');

Database.open(true).then((db) => {
    return Promise.resolve().then(() => {
        var tables = [
            'listing',
            'statistics'
        ];
        return db.listen(tables, 'clean', handleDatabaseCleanRequests);
    });
});

function handleDatabaseCleanRequests(events) {
    // process the events for each schema separately
    var db = this;
    var eventGroups = _.groupBy(events, 'schema');
    var schemas = _.keys(eventGroups);
    return Promise.each(schemas, (schema) => {
    });
}
