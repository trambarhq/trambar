var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var LocalSearch = require('data/local-search');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var Diagnostics = require('widgets/diagnostics');
var DiagnosticsSection = require('widgets/diagnostics-section');

module.exports = React.createClass({
    displayName: 'IndexedDBCache',
    mixins: [ UpdateCheck ],
    propTypes: {
        databaseName: PropTypes.string.isRequired,
    },

    statics: {
        /**
         * Return true if IndexedDB is available
         *
         * @return {Boolean}
         */
        isAvailable: function() {
            return !!window.indexedDB;
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
            database: null,
            recordCounts: {},
            writeCount: 0,
            readCount: 0,
            deleteCount: 0,
        };
    },

    /**
     * Look for objects in cache
     *
     * Query object contains the server address, schema, and table
     *
     * @param  {Object} query
     *
     * @return {Promise<Array<Object>>}
     */
    find: function(query) {
        var address = query.address;
        var schema = query.schema;
        var table = query.table;
        var criteria = query.criteria;
        return this.fetchTable(address, schema, table).then((objects) => {
            var keyName = this.getObjectKeyName(schema);
            var results = [];
            if (_.isEqual(_.keys(criteria), [ keyName ])) {
                var keys = criteria[keyName];
                if (keys instanceof Array) {
                    keys = _.slice(keys).sort();
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
        var address = location.address;
        var schema = location.schema;
        var table = location.table;
        var storeName = this.getObjectStoreName(schema);
        return this.open().then((db) => {
            return new Promise((resolve, reject) => {
                var path = this.getTablePath(address, schema, table);
                var pk = this.getPrimaryKeyGenerator(address, schema, table);
                var transaction = db.transaction(storeName, 'readwrite');
                var objectStore = transaction.objectStore(storeName);
                transaction.oncomplete = (evt) => {
                    resolve(objects);
                };
                transaction.onerror = (evt) => {
                    reject(new Error(evt.message));
                };
                _.each(objects, (object) => {
                    var key = pk(object);
                    var record = {
                        address: address,
                        location: path,
                        data: object,
                    };
                    objectStore.put(record, key);
                });
            });
        }).then((objects) => {
            var writeCount = this.state.writeCount;
            writeCount += objects.length;
            this.setState({ writeCount });
            this.updateTableEntry(address, schema, table, objects, false);
            this.updateRecordCount(storeName, 500);
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
        var address = location.address;
        var schema = location.schema;
        var table = location.table;
        var storeName = this.getObjectStoreName(schema);
        return this.open().then((db) => {
            return new Promise((resolve, reject) => {
                var pk = this.getPrimaryKeyGenerator(address, schema, table);
                var path = this.getTablePath(address, schema, table);
                var transaction = db.transaction(storeName, 'readwrite');
                var objectStore = transaction.objectStore(storeName);
                transaction.oncomplete = (evt) => {
                    resolve(objects);
                };
                transaction.onerror = (evt) => {
                    reject(new Error(evt.message));
                };
                _.each(objects, (object) => {
                    var key = pk(object);
                    objectStore.delete(key);
                });
            });
        }).then((objects) => {
            var deleteCount = this.state.deleteCount;
            deleteCount += objects.length;
            this.setState({ deleteCount });
            this.updateTableEntry(address, schema, table, objects, true);
            this.updateRecordCount(storeName, 500);
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
        var storeName = 'remote-data';
        return this.open().then((db) => {
            return new Promise((resolve, reject) => {
                var transaction = db.transaction(storeName, 'readwrite');
                var objectStore = transaction.objectStore(storeName);
                if (criteria.address !== undefined) {
                    var index = objectStore.index('address');
                    var req = index.openCursor(criteria.address);
                    var count = 0;
                    req.onsuccess = (evt) => {
                        var cursor = evt.target.result;
                        if(cursor) {
                            count++;
                            cursor.delete();
                            cursor.continue();
                        } else {
                            resolve(count);
                        }
                    };
                } else if (criteria.count !== undefined) {
                    var index = objectStore.index('rtime');
                    var req = index.openCursor();
                    var count = 0;
                    req.onsuccess = (evt) => {
                        var cursor = evt.target.result;
                        if(cursor) {
                            count++;
                            cursor.delete();
                            if (count < criteria.count) {
                                cursor.continue();
                            } else {
                                resolve(count);
                            }
                        } else {
                            resolve(count);
                        }
                    };
                } else if (criteria.before !== undefined) {
                    var index = objectStore.index('rtime');
                    var req = index.openCursor();
                    var count = 0;
                    req.onsuccess = (evt) => {
                        var cursor = evt.target.result;
                        if(cursor) {
                            var record = cursor.value;
                            var object = record.data;
                            if (object.rtime < criteria.before) {
                                count++;
                                cursor.delete();
                                cursor.continue();
                            } else {
                                resolve(count);
                            }
                        } else {
                            resolve(count);
                        }
                    };
                }
            });
        }).then((count) => {
            if (count > 0) {
                var deleteCount = this.state.deleteCount;
                deleteCount += count;
                this.setState({ deleteCount });
                this.updateRecordCount(storeName, 500);
            }
            return count;
        });
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
                        tbl.objects.splice(index);
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
        return this.open().then((db) => {
            return new Promise((resolve, reject) => {
                var storeName = this.getObjectStoreName(schema);
                var keyName = this.getObjectKeyName(schema);
                var transaction = db.transaction(storeName, 'readonly');
                var objectStore = transaction.objectStore(storeName);
                var index = objectStore.index('location');
                var path = this.getTablePath(address, schema, table);
                var req = index.openCursor(path);
                var results = [];
                req.onsuccess = (evt) => {
                    var cursor = evt.target.result;
                    if(cursor) {
                        var record = cursor.value;
                        var object = record.data;
                        var index = _.sortedIndexBy(results, object, keyName);
                        results.splice(index, 0, object);
                        cursor.continue();
                    } else {
                        resolve(results);
                    }
                };
            });
        });
    },

    /**
     * Open database, creating schema if it doesn't exist already
     *
     * @return {Promise<IDBDatabase>}
     */
    open: function() {
        if (!this.databasePromise) {
            this.databasePromise = new Promise((resolve, reject) => {
                var openRequest = window.indexedDB.open(this.props.databaseName, 1);
                openRequest.onsuccess = (evt) => {
                    var database = evt.target.result;
                    resolve(database);
                    this.setState({ database });
                };
                openRequest.onerror = (evt) => {
                    reject(new Error(evt.message));
                };
                openRequest.onupgradeneeded = (evt) => {
                    var db = evt.target.result;
                    db.onerror = (evt) => {
                        reject(new Error(evt.message));
                    };
                    var localStore = db.createObjectStore('local-data');
                    localStore.createIndex('location', 'location', { unique: false });
                    var remoteStore = db.createObjectStore('remote-data');
                    remoteStore.createIndex('location', 'location', { unique: false });
                    remoteStore.createIndex('address', 'address', { unique: false });
                    remoteStore.createIndex('rtime', 'data.rtime', { unique: false });
                };
            });
        }
        return this.databasePromise;
    },

    /**
     * Return name of object store
     *
     * @param  {String} schema
     *
     * @return {String}
     */
    getObjectStoreName: function(schema) {
        if (schema === 'local') {
            return 'local-data';
        } else {
            return 'remote-data';
        }
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
     * Return path to table
     *
     * @param  {String} address
     * @param  {String} schema
     * @param  {String} table
     *
     * @return {String}
     */
    getTablePath: function(address, schema, table) {
        var path = (schema === 'local') ? table : `${address}/${schema}/${table}`;
        return path;
    },

    /**
     * Return a function for generating primary key
     *
     * @param  {String} address
     * @param  {String} schema
     * @param  {String} table
     *
     * @return {Function}
     */
    getPrimaryKeyGenerator: function(address, schema, table) {
        var path = this.getTablePath(address, schema, table);
        if (schema === 'local') {
            return (object) => {
                return `${path}/${object.key}`;
            };
        } else {
            return (object) => {
                var idStr = ('0000000000' + object.id).slice(-10);
                return `${path}/${idStr}`;
            };
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
     * Count the number of rows in the object store (on a time delay)
     *
     * @param  {String} storeName
     * @param  {Number} delay
     */
    updateRecordCount: function(storeName, delay) {
        var timeoutPath = `updateRecordCountTimeouts.${storeName}`;
        var timeout = _.get(this, timeoutPath);
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            this.open().then((db) => {
                var transaction = db.transaction(storeName, 'readonly');
                var objectStore = transaction.objectStore(storeName);
                var req = objectStore.count();
                req.onsuccess = (evt) => {
                    var recordCounts = _.clone(this.state.recordCounts);
                    recordCounts[storeName] = evt.target.result;
                    this.setState({ recordCounts });
                };
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
        this.updateRecordCount('remote-data');
        this.updateRecordCount('local-data');
    },

    /**
     * Render diagnostics
     *
     * @return {ReactElement}
     */
    render: function() {
        var db = this.state.database;
        var localRowCount = _.get(this.state.recordCounts, 'local-data');
        var remoteRowCount = _.get(this.state.recordCounts, 'remote-data');
        return (
            <Diagnostics type="indexed-db-cache">
                <DiagnosticsSection label="Database details">
                    <div>Name: {(db) ? db.name : ''}</div>
                    <div>Version: {(db) ? db.version : ''}</div>
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
