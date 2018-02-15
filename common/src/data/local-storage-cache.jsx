var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;

var LocalSearch = require('data/local-search');

module.exports = React.createClass({
    displayName: 'LocalStorageCache',
    propTypes: {
        databaseName: PropTypes.string.isRequired,
    },

    statics: {
        /**
         * Return true if SQLite is available
         *
         * @return {Boolean}
         */
        isAvailable: function() {
            return !!window.localStorage;
        },
    },

    getInitialState: function() {
        var json = localStorage.getItem(this.props.databaseName);
        this.localData = decodeJSON(json) || {};
        this.remoteData = {};
        return {};
    },

    getRows: function(server, schema, table) {
        var store = (schema === 'local') ? this.localData : this.remoteData;
        var path = [
            server,
            schema,
            table,
        ];
        var rows = _.get(store, path);
        if (!rows) {
            rows = [];
            _.set(store, path, rows);
        }
        return rows;
    },

    saveRows: function(server, schema, table) {
        if (schema !== 'local') {
            return;
        }
        var json = JSON.stringify(this.localData);
        localStorage.setItem(this.props.databaseName, json);
    },

    /**
     * Look for objects in cache
     *
     * Query object contains the name of the origin server, schema, and table
     *
     * @param  {Object} query
     *
     * @return {Promise<Array<Object>>}
     */
    find: function(query) {
        var server = query.server || '';
        var schema = query.schema;
        var table = query.table;
        var criteria = query.criteria;
        var rows = this.getRows(server, schema, table);
        var objects;
        if (criteria && criteria.id !== undefined && _.size(criteria) === 1) {
            // look up by id
            var ids = criteria.id;
            if (!(ids instanceof Array)) {
                ids = [ ids ];
            }
            objects = _.filter(_.map(ids, (id) => {
                return findById(rows, id);
            }));
        } else {
            objects = _.filter(rows, (row) => {
                return LocalSearch.match(table, row, criteria);
            });
        }
        LocalSearch.limit(table, objects, criteria);
        return Promise.resolve(objects);
    },

    /**
     * Save objects originating from specified location into cache
     *
     * @param  {Object} location
     * @param  {Array<Object>} objects
     *
     * @return {Promise<Array<Object>>}
     */
    save: function(location, objects) {
        var server = location.server || '';
        var schema = location.schema;
        var table = location.table;
        var rows = this.getRows(server, schema, table);
        _.each(objects, (object) => {
            replaceById(rows, _.cloneDeep(object));
        });
        this.saveRows(server, schema, table);
        return Promise.resolve(objects);
    },

    /**
     * Remove objects from cache that originated from specified location
     *
     * @param  {Object} location
     * @param  {Array<Object>} objects
     *
     * @return {Promise<Array<Object>>}
     */
    remove: function(location, objects) {
        var server = location.server || '';
        var schema = location.schema;
        var table = location.table;
        var rows = this.getRows(server, schema, table);
        _.each(objects, (object) => {
            removeById(rows, object);
        });
        this.saveRows(server, schema, table);
        return Promise.resolve(objects);
    },

    /**
     * Remove objects by one of three criteria:
     *
     * server - remove all objects from specified server
     * count - remove certain number of objects, starting from those least recent
     * before - remove objects with retrieval time (rtime) earlier than given value
     *
     * Return value is the number of objects removed
     *
     * @param  {Object} criteria
     *
     * @return {Promise<Number>}
     */
    clean: function(criteria) {
        var sql, params;
        var store = this.remoteData;
        var count = 0;
        if (criteria.server !== undefined) {
            var server = criteria.server;
            var schemas = _.get(store, server);
            _.each(schemas, (schema) => {
                _.each(schema, (table) => {
                    count += table.length;
                });
            });
            _.set(store, server, undefined);
        } else if (criteria.count !== undefined) {
            // push all objects into a list
            var candidates = [];
            _.each(store, (schemas) => {
                _.each(schemas, (schema) => {
                    _.each(schema, (table) => {
                        for (var i = 0; i < table.length; i++) {
                            candidates.push(table[i]);
                        }
                    });
                });
            });
            // sort by rtime
            candidates.sort(function(a, b) {
                if (a.rtime < b.rtime) {
                    return -1;
                } else if (a.rtime > b.rtime) {
                    return +1;
                } else {
                    return 0;
                }
            });
            // leave only the least recent
            candidates.splice(criteria.count);
            // remove objects on the list
            _.each(store, (schemas) => {
                _.each(schemas, (schema) => {
                    _.each(schema, (table) => {
                        for (var i = table.length - 1; i >= 0; i--) {
                            var object = table[i];
                            if (candidates.indexOf(object) !== -1) {
                                table.splice(i, 1);
                                count++;
                            }
                        }
                    });
                });
            });
        } else if (criteria.before !== undefined) {
            // go through every table
            _.each(store, (schemas) => {
                _.each(schemas, (schema) => {
                    _.each(schema, (table) => {
                        for (var i = table.length - 1; i >= 0; i--) {
                            var object = table[i];
                            if (object.rtime < criteria.before) {
                                table.splice(i, 1);
                                count++;
                            }
                        }
                    });
                });
            });
        }
        return Promise.resolve(count);
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        return <div />;
    },
});

function decodeJSON(s) {
    try {
        return JSON.parse(s);
    } catch(err) {
        return null;
    }
}

function findById(rows, id) {
    var index = _.sortedIndexBy(rows, { id }, 'id');
    var target = rows[index];
    if (target && target.id === id) {
        return target;
    }
}

function replaceById(rows, object) {
    var index = _.sortedIndexBy(rows, object, 'id');
    var target = rows[index];
    if (target && target.id === object.id) {
        rows[index] = object;
    } else {
        rows.splice(index, 0, object);
    }
}

function removeById(rows, object) {
    var index = _.sortedIndexBy(rows, object, 'id');
    var target = rows[index];
    if (target && target.id === object.id) {
        rows.splice(index, 1);
    }
}
