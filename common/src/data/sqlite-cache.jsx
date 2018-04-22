var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var LocalSearch = require('data/local-search');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var Diagnostics = require('widgets/diagnostics');
var DiagnosticsSection = require('widgets/diagnostics-section');

var openDatabase = window.openDatabase;
if (window.sqlitePlugin) {
    openDatabase = window.sqlitePlugin.openDatabase;
}

module.exports = React.createClass({
    displayName: 'SQLiteCache',
    mixins: [ UpdateCheck ],
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
            return !!openDatabase;
        },
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        this.tables = {};
        return {
            recordCounts: {},
            writeCount: 0,
            readCount: 0,
            deleteCount: 0,
        };
    },

    /**
     * Look for objects in cache
     *
     * Query object contains the name of the server address, schema, and table
     *
     * @param  {Object} query
     *
     * @return {Promise<Array<Object>>}
     */
    find: function(query) {
        var address = query.address || '';
        var schema = query.schema;
        var table = query.table;
        var criteria = query.criteria;
        return this.fetchTable(address, schema, table).then((objects) => {
            var keyName = this.getObjectKeyName(schema);
            var results = [];
            if (_.isEqual(_.keys(criteria), [ keyName ])) {
                var keys = criteria[keyName];
                if (keys instanceof Array) {
                    keys = _.sortBy(_.slice(keys));
                } else {
                    keys = [ keys ];
                }
                // look up by sorted key
                _.each(keys, (key) => {
                    var keyObj = {};
                    keyObj[keyName] = key;
                    var index = _.sortedIndexBy(objects, keyObj, keyName);
                    var object = objects[index];
                    if (object && object[keyName] === key) {
                        results.push(object);
                    }
                });
                return results;
            } else {
                _.each(objects, (object) => {
                    if (LocalSearch.match(table, object, criteria)) {
                        results.push(object);
                    }
                });
            }
            return results;
        }).then((objects) => {
            LocalSearch.limit(table, objects, query.criteria);
            var readCount = this.state.readCount;
            readCount += objects.length;
            this.setState({ readCount });
            return objects;
        });
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
        var address = location.address || '';
        var schema = location.schema;
        var table = location.table;
        var statements = [], paramSets = [];
        _.each(objects, (object) => {
            var json = JSON.stringify(object);
            if (schema === 'local') {
                statements.push(`
                    INSERT OR REPLACE INTO local_data
                    (table_name, key, json)
                    VALUES (?, ?, ?)
                `);
                paramSets.push([ table, object.key, json ]);
            } else {
                var rtime = (new Date(object.rtime)).getTime();
                statements.push(`
                    INSERT OR REPLACE INTO remote_data
                    (address, schema_name, table_name, id, json, rtime)
                    VALUES (?, ?, ?, ?, ?, ?)
                `);
                paramSets.push([ address, schema, table, object.id, json, rtime ]);
            }
        });
        return this.execute(statements, paramSets).then((affectedCount) => {
            var writeCount = this.state.writeCount;
            writeCount += affectedCount;
            this.setState({ writeCount });
            this.updateTableEntry(address, schema, table, objects, false);
            this.updateRecordCount(schema, 500);
            return objects;
        });
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
        var address = location.address || '';
        var schema = location.schema;
        var table = location.table;
        var statements = [], paramSets = [];
        _.each(objects, (object) => {
            if (schema === 'local') {
                statements.push(`
                    DELETE FROM local_data
                    WHERE table_name = ? AND key = ?
                `);
                paramSets.push([ table, object.key ]);
            } else {
                statements.push(`
                    DELETE FROM remote_data
                    WHERE address = ?
                    AND schema_name = ?
                    AND table_name = ?
                    AND id = ?
                `);
                paramSets.push([ address, schema, table, object.id ]);
            }
        });
        return this.execute(statements, paramSets).then((affectedCount) => {
            var deleteCount = this.state.deleteCount;
            deleteCount += affectedCount;
            this.setState({ deleteCount });
            this.updateTableEntry(address, schema, table, objects, true);

            this.updateRecordCount(schema, 500);
            return objects;
        });
    },

    /**
     * Remove objects by one of three criteria:
     *
     * address - remove all objects from specified address
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
        if (criteria.address !== undefined) {
            if (!criteria.schema || criteria.schema === '*') {
                sql = `
                    DELETE FROM remote_data
                    WHERE address = ?
                `;
                params = [ criteria.address || '' ];
            } else {
                sql = `
                    DELETE FROM remote_data
                    WHERE address = ? AND schema_name = ?
                `;
                params = [ criteria.address || '', criteria.schema ];
                console.log(sql);
            }
        } else if (criteria.count !== undefined) {
            sql = `
                DELETE FROM remote_data
                WHERE rowid IN (
                    SELECT rowid FROM remote_data ORDER BY rtime LIMIT ?
                )
            `;
            params = [ criteria.count ];
        } else if (criteria.before !== undefined) {
            var rtime = (new Date(criteria.before)).getTime();
            sql = `
                DELETE FROM remote_data
                WHERE rtime < ?
            `;
            params = [ rtime ];
        } else {
            if (process.env.NODE_ENV !== 'production') {
                console.warn('Invalid removal criteria: ', criteria);
            }
            return Promise.resolve(0);
        }
        return this.execute(sql, params).then((affectedCount) => {
            if (affectedCount > 0) {
                var deleteCount = this.state.deleteCount;
                deleteCount += affectedCount;
                this.setState({ deleteCount });
                this.updateRecordCount('remote_data');
                this.tables['remote'] = {};
            }
        });
    },

    /**
     * Run a query and return the resulting rows
     *
     * @param  {String} sql
     * @param  {Array<*>} params
     *
     * @return {Promise<Array<Object>>}
     */
    query: function(sql, params) {
        return this.open().then((db) => {
            return new Promise((resolve, reject) => {
                // annoyingly, SQLError isn't a subclass of Error
                var rejectT = (err) => { reject(new Error(err.message)) };
                db.transaction((tx) => {
                    tx.executeSql(sql, params, (tx, rs) => {
                        var rows = [];
                        for (var i = 0; i < rs.rows.length; i++) {
                            rows.push(rs.rows.item(i));
                        }
                        resolve(rows);
                    });
                }, rejectT);
            });
        });
    },

    /**
     * Execute a SQL statement
     *
     * @param  {String} sql
     * @param  {Array<*>} params
     *
     * @return {Promise}
     */
    execute: function(sql, params) {
        return this.open().then((db) => {
            return new Promise((resolve, reject) => {
                var affected = 0;
                var rejectT = (err) => { reject(new Error(err.message)) };
                var resolveT = () => { resolve(affected) };
                var callback = (tx, rs) => {
                    affected += rs.rowsAffected ;
                };
                db.transaction((tx) => {
                    if (sql instanceof Array) {
                        for (var i = 0; i < sql.length; i++) {
                            tx.executeSql(sql[i], params[i], callback);
                        }
                    } else {
                        tx.executeSql(sql, params, callback);
                    }
                }, rejectT, resolveT);
            });
        });
    },

    /**
     * Fetch cached rows of a table
     *
     * @param  {String} address
     * @param  {String} schema
     * @param  {String} table
     *
     * @return {Promise<Array<Object>>}
     */
    fetchTable: function(address, schema, table) {
        var tbl = this.getTableEntry(address, schema, table);
        if (!tbl.promise) {
            tbl.promise = this.loadTable(address, schema, table).then((objects) => {
                tbl.objects = objects;
                return tbl.objects;
            });
        }
        return tbl.promise;
    },

    /**
     * Load all rows for a table into memory
     *
     * @param  {String} address
     * @param  {String} schema
     * @param  {String} table
     *
     * @return {Promise<Object>}
     */
    loadTable: function(address, schema, table) {
        var sql, params;
        if (schema === 'local') {
            sql = `
                SELECT json FROM local_data
                WHERE table_name = ?
                ORDER BY key
            `;
            params = [ table ];
        } else {
            sql = `
                SELECT json FROM remote_data
                WHERE address = ?
                AND schema_name = ?
                AND table_name = ?
                ORDER BY id
            `;
            params = [ address, schema, table ];
        }
        return this.query(sql, params).then((rows) => {
            var objects = _.map(rows, (row) => {
                return decodeJSON(row.json);
            });
            return objects;
        });
    },

    /**
     * Open database, creating schema if it doesn't exist already
     *
     * @return {Promise<Database>}
     */
    open: function() {
        if (!this.databasePromise) {
            this.databasePromise = Promise.try(() => {
                var db = openDatabase(this.props.databaseName, '', '', 50 * 1048576);
                var sql = [
                    `
                        CREATE TABLE IF NOT EXISTS remote_data (
                            address text,
                            schema_name text,
                            table_name text,
                            id int,
                            json text,
                            rtime datetime
                        )
                    `,
                    `
                        CREATE UNIQUE INDEX IF NOT EXISTS remote_data_idx_id
                        ON remote_data (
                            address,
                            schema_name,
                            table_name,
                            id
                        )
                    `,
                    `
                        CREATE INDEX IF NOT EXISTS remote_data_idx_location
                        ON remote_data (
                            address,
                            schema_name,
                            table_name
                        )
                    `,
                    `
                        CREATE INDEX IF NOT EXISTS remote_data_idx_rtime
                        ON remote_data (
                            rtime
                        )
                    `,
                    `
                        CREATE TABLE IF NOT EXISTS local_data (
                            table_name text,
                            key text,
                            json text
                        )
                    `,
                    `
                        CREATE UNIQUE INDEX IF NOT EXISTS local_data_idx_key
                        ON local_data (
                            table_name,
                            key
                        )
                    `,
                ];
                if (db.version !== '1.0') {
                    // delete tables if schema is out of date
                    sql.unshift(`DROP TABLE IF EXISTS remote_data`);
                    sql.unshift(`DROP TABLE IF EXISTS local_data`);
                }
                return new Promise((resolve, reject) => {
                    var rejectS = (err) => { reject(new Error(err.message)) };
                    db.transaction((tx) => {
                        _.each(sql, (sql) => {
                            tx.executeSql(sql);
                        });
                    }, rejectS, resolve)
                }).return(db);
            });
        }
        return this.databasePromise;
    },

    /**
     * Clear objects cached in memory
     *
     * @param  {String|undefined} address
     * @param  {String|undefined} schema
     *
     */
    reset: function(address, schema) {
        var path = (schema === 'local') ? [ 'local' ] : _.filter([ 'remote', address, schema ]);
        _.unset(this.tables, path);
    },

    /**
     * Return name of object key
     *
     * @param  {String} schema
     *
     * @return {String}
     */
    getObjectKeyName: function(schema) {
        if (schema === 'local') {
            return 'key';
        } else {
            return 'id';
        }
    },

    /**
     * Return in-memory object for storing table rows
     *
     * @param  {String} address
     * @param  {String} schema
     * @param  {String} table
     *
     * @return {Object}
     */
    getTableEntry: function(address, schema, table) {
        var path = (schema === 'local') ? [ 'local', table ] : [ 'remote', address, schema, table ];
        var tbl = _.get(this.tables, path);
        if (!tbl) {
            tbl = {
                promise: null,
                objects: null,
            };
            _.set(this.tables, path, tbl);
        }
        return tbl;
    },

    /**
     * Update list of objects that have been loaded
     *
     * @param  {String} address
     * @param  {String} schema
     * @param  {String} table
     * @param  {Array<Objects>} objects
     * @param  {Boolean} remove
     */
    updateTableEntry: function(address, schema, table, objects, remove) {
        var tbl = this.getTableEntry(address, schema, table);
        if (tbl.objects) {
            var keyName = this.getObjectKeyName(schema);
            _.each(objects, (object) => {
                var index = _.sortedIndexBy(tbl.objects, object, keyName);
                var target = tbl.objects[index];
                if (target && target[keyName] === object[keyName]) {
                    if (!remove) {
                        tbl.objects[index] = object;
                    } else {
                        tbl.objects.splice(index, 1);
                    }
                } else {
                    if (!remove) {
                        tbl.objects.splice(index, 0, object);
                    }
                }
            });
        }
    },

    /**
     * Count the number of rows in the table (on a time delay)
     *
     * @param  {String} schema
     * @param  {Number} delay
     */
    updateRecordCount: function(schema, delay) {
        var cacheTableName = (schema === 'local') ? 'local_data' : 'remote_data';
        var timeoutPath = `updateRecordCountTimeouts.${cacheTableName}`;
        var timeout = _.get(this, timeoutPath);
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            var sql = `SELECT COUNT(*) as count FROM ${cacheTableName}`;
            this.query(sql).then((rows) => {
                var recordCounts = _.clone(this.state.recordCounts);
                recordCounts[cacheTableName] = rows[0].count;
                this.setState({ recordCounts });
            }).catch((err) => {
            });
            _.set(this, timeoutPath, 0);
        }, delay || 0);
        _.set(this, timeoutPath, timeout);
    },

    /**
     * Count the number of rows in the object stores on mount
     */
    componentDidMount: function() {
        this.updateRecordCount('remote');
        this.updateRecordCount('local');
    },

    /**
     * Render diagnostics
     *
     * @return {ReactElement}
     */
    render: function() {
        var db = this.state.database;
        var localRowCount = _.get(this.state.recordCounts, 'local_data');
        var remoteRowCount = _.get(this.state.recordCounts, 'remote_data');
        return (
            <Diagnostics type="sqlite-cache">
                <DiagnosticsSection label="Database details">
                    <div>Name: {this.props.databaseName}</div>
                </DiagnosticsSection>
                <DiagnosticsSection label="Usage">
                    <div>Local objects: {localRowCount}</div>
                    <div>Remote objects: {remoteRowCount}</div>
                    <div>Objects read: {this.state.readCount}</div>
                    <div>Objects written: {this.state.writeCount}</div>
                    <div>Objects deleted: {this.state.deleteCount}</div>
                </DiagnosticsSection>
            </Diagnostics>
        );
    },
});

function decodeJSON(s) {
    try {
        return JSON.parse(s);
    } catch(err) {
        return null;
    }
}
