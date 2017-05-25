var _ = require('lodash');
var Promise = require('bluebird');
var Database = require('database');

var tables = [ 'listing', 'statistics' ];

Database.open(true).then((db) => {
    return Promise.resolve().then(() => {
        return db.listen(tables, 'change', handleDatabaseChanges);
    }).then(() => {
        return db.listen(tables, 'clean', handleDatabaseDirtyReads);
    });
});

function handleDatabaseChange(events) {

}

function handleDatabaseDirtyReads(events) {

}
