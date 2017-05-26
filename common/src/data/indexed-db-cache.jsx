var React = require('react'), PropTypes = React.PropTypes;
var _ = require('lodash');

module.exports = React.createClass({
    displayName: 'IndexedDBCache',
    propTypes: {
        databaseName: PropTypes.string,
    },

    getDefaultProps: function() {
        return {
            databaseName: 'cache'
        };
    },

    statics: {
        isAvailable: function() {
            return !!window.indexedDB;
        },
    },

    getInitialState: function() {
        return {
            database: null,
        };
    },

    find: function(query) {
        return this.open().then((db) => {
            return new Promise((resolve, reject) => {
                var server = query.server || '~';
                var schema = query.schema;
                var table = query.table;
                var local = (schema === 'local');
                var storeName = (local) ? 'local-data' : 'remote-data';
                var transaction = db.transaction(storeName, 'readonly');
                var path = `${server}/${schema}/${table}`;
                var objectStore = transaction.objectStore(storeName);
                var results = [];
                var criteria = query.criteria;
                if (criteria && criteria.id !== undefined && _.keys(criteria).length === 1) {
                    // look up by id
                    var ids = criteria.id;
                    if (ids instanceof Array) {
                        if (!_.isEmpty(ids)) {
                            var maxId = _.max(ids);
                            var minId = _.min(ids);
                            var range = IDBKeyRange.bound(`${path}/${minId}`, `${path}/${maxId}`);
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
                        var key = `${path}/${ids}`;
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
                            if (LocalSearch.match(object, criteria)) {
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

    save: function(location, objects) {
        return this.open().then((db) => {
            return new Promise((resolve, reject) => {
                var server = location.server || '~';
                var schema = location.schema;
                var table = location.table;
                var local = (schema === 'local');
                var storeName = (local) ? 'local-data' : 'remote-data';
                var transaction = db.transaction(storeName, 'readwrite');
                var path = `${server}/${schema}/${table}`;
                var objectStore = transaction.objectStore(storeName);
                _.each(objects, (object) => {
                    var key = (local) ? object.key : `${path}/${object.id}`;
                    var record = {
                        server: server,
                        location: path,
                        data: object,
                    };
                    objectStore.put(record, key);
                });
                transaction.oncomplete = (evt) => {
                    resolve(objects);
                };
                transaction.onerror = (evt) => {
                    reject(new Error(evt.message));
                };
            });
        });
    },

    remove: function(location, objects) {
        return this.open().then((db) => {
            return new Promise((resolve, reject) => {
                var server = location.server || '~';
                var schema = location.schema;
                var table = location.table;
                var local = (schema === 'local');
                var storeName = (local) ? 'local-data' : 'remote-data';
                var transaction = db.transaction(storeName, 'readwrite');
                var path = `${server}/${schema}/${table}`;
                var objectStore = transaction.objectStore(storeName);
                _.each(objects, (object) => {
                    var key = (local) ? object.key : `${path}/${object.id}`;
                    objectStore.delete(key);
                });
                transaction.oncomplete = (evt) => {
                    resolve(objects);
                };
                transaction.onerror = (evt) => {
                    reject(new Error(evt.message));
                };
            });
        });
    },

    clean: function(params) {
        return this.open().then((db) => {
            return new Promise((resolve, reject) => {
                var storeName = 'remote-data';
                var transaction = db.transaction(storeName, 'readwrite');
                var objectStore = transaction.objectStore(storeName);
                if (params.server) {
                    var index = objectStore.index('server');
                    var req = index.openCursor(params.server);
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
                } else if (params.count) {
                    var index = objectStore.index('server');
                    var req = index.openCursor(params.server);
                    var count = 0;
                    req.onsuccess = (evt) => {
                        var cursor = evt.target.result;
                        if(cursor) {
                            count++;
                            cursor.delete();
                            if (count < params.count) {
                                cursor.continue();
                            } else {
                                resolve(count);
                            }
                        } else {
                            resolve(count);
                        }
                    };
                } else if (params.before) {
                    var index = objectStore.index('server');
                    var req = index.openCursor(params.server);
                    var count = 0;
                    req.onsuccess = (evt) => {
                        var cursor = evt.target.result;
                        if(cursor) {
                            var record = cursor.value;
                            var object = record.data;
                            if (object.rtime < params.before) {
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
                    var localStore = db.createObjectStore("local-data");
                    localStore.createIndex('location', 'location', { unique: false });
                    var remoteStore = db.createObjectStore("remote-data");
                    remoteStore.createIndex('location', 'location', { unique: false });
                    remoteStore.createIndex('server', 'server', { unique: false });
                    remoteStore.createIndex('rtime', 'data.rtime', { unique: false });
                };
            });
        }
        return this.databasePromise;
    },

    triggerChangeEvent: function() {
        if (this.props.onChange) {
            this.props.onChange({
                type: 'change',
                target: this,
            });
        }
    },

    triggerErrorEvent: function(err) {
        if (this.props.onError) {
            this.props.onError({
                type: 'error',
                target: this,
                message: err.message
            });
        }
    },

    render: function() {
        return <div />;
    },
});
