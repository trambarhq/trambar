var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var LocalSearch = require('data/local-search');

module.exports = React.createClass({
    displayName: 'IndexedDBCache',
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
        return {
            database: null,
        };
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
        return this.open().then((db) => {
            return new Promise((resolve, reject) => {
                var server = query.server || '';
                var schema = query.schema;
                var table = query.table;
                var local = (schema === 'local');
                var storeName = (local) ? 'local-data' : 'remote-data';
                var transaction = db.transaction(storeName, 'readonly');
                var path = `${server}/${schema}/${table}`;
                var objectStore = transaction.objectStore(storeName);
                var results = [];
                var criteria = query.criteria;
                if (criteria && criteria.id !== undefined && _.size(criteria) === 1) {
                    // look up by id
                    var ids = criteria.id;
                    if (ids instanceof Array) {
                        if (!_.isEmpty(ids)) {
                            var maxId = _.max(ids);
                            var minId = _.min(ids);
                            var maxKey = primaryKey(path, maxId);
                            var minKey = primaryKey(path, minId);
                            var range = IDBKeyRange.bound(minKey, maxKey);
                            var req = objectStore.openCursor(range);
                            req.onsuccess = (evt) => {
                                var cursor = evt.target.result;
                                if(cursor) {
                                    var record = cursor.value;
                                    var object = record.data;
                                    if (_.includes(ids, object.id)) {
                                        var index = _.sortedIndexBy(results, object, 'id');
                                        results.splice(index, 0, object);
                                    }
                                    cursor.continue();
                                } else {
                                    resolve(results);
                                }
                            };
                            req.onerror = (evt) => {
                                resolve(results);
                            };
                        } else {
                            resolve(results);
                        }
                    } else {
                        var key = primaryKey(path, ids);
                        var req = objectStore.get(key);
                        req.onsuccess = (evt) => {
                            var record = evt.target.result;
                            if (record) {
                                results.push(record.data);
                            }
                            resolve(results);
                        };
                        req.onerror = (evt) => {
                            resolve(results);
                        };
                    }
                } else {
                    var index = objectStore.index('location');
                    var req = index.openCursor(path);
                    req.onsuccess = (evt) => {
                        var cursor = evt.target.result;
                        if(cursor) {
                            var record = cursor.value;
                            var object = record.data;
                            if (LocalSearch.match(table, object, criteria)) {
                                var index = _.sortedIndexBy(results, object, 'id');
                                results.splice(index, 0, object);
                            }
                            cursor.continue();
                        } else {
                            resolve(results);
                        }
                    };
                }
            });
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
        return this.open().then((db) => {
            return new Promise((resolve, reject) => {
                var server = location.server || '';
                var schema = location.schema;
                var table = location.table;
                var local = (schema === 'local');
                var storeName = (local) ? 'local-data' : 'remote-data';
                var transaction = db.transaction(storeName, 'readwrite');
                var path = `${server}/${schema}/${table}`;
                var objectStore = transaction.objectStore(storeName);
                transaction.oncomplete = (evt) => {
                    resolve(objects);
                };
                transaction.onerror = (evt) => {
                    reject(new Error(evt.message));
                };
                _.each(objects, (object) => {
                    var key = (local) ? nonumericKey(path, object.key) : primaryKey(path, object.id);
                    var record = {
                        server: server,
                        location: path,
                        data: object,
                    };
                    objectStore.put(record, key);
                });
            });
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
        return this.open().then((db) => {
            return new Promise((resolve, reject) => {
                var server = location.server || '';
                var schema = location.schema;
                var table = location.table;
                var local = (schema === 'local');
                var storeName = (local) ? 'local-data' : 'remote-data';
                var transaction = db.transaction(storeName, 'readwrite');
                var path = `${server}/${schema}/${table}`;
                var objectStore = transaction.objectStore(storeName);
                transaction.oncomplete = (evt) => {
                    resolve(objects);
                };
                transaction.onerror = (evt) => {
                    reject(new Error(evt.message));
                };
                _.each(objects, (object) => {
                    var key = (local) ? nonumericKey(path, object.key) : primaryKey(path, object.id);
                    objectStore.delete(key);
                });
            });
        });
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
        return this.open().then((db) => {
            return new Promise((resolve, reject) => {
                var storeName = 'remote-data';
                var transaction = db.transaction(storeName, 'readwrite');
                var objectStore = transaction.objectStore(storeName);
                if (criteria.server !== undefined) {
                    var index = objectStore.index('server');
                    var req = index.openCursor(criteria.server);
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
                    resolve(evt.target.result);
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
                    remoteStore.createIndex('server', 'server', { unique: false });
                    remoteStore.createIndex('rtime', 'data.rtime', { unique: false });
                };
            });
        }
        return this.databasePromise;
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

function primaryKey(path, id) {
    var idStr = ('0000000000' + id).slice(-10);
    return path + '/' + idStr;
}

function nonumericKey(path, key) {
    return path + '/' + key;
}
