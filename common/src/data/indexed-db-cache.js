import _ from 'lodash';
import Promise from 'bluebird';
import LocalSearch from 'data/local-search';

const defaultOptions = {
    databaseName: 'database'
};

class IndexedDBCache {
    /**
     * Return true if IndexedDB is available
     *
     * @return {Boolean}
     */
    static isAvailable() {
        return !!window.indexedDB;
    }

    constructor(options) {
        this.options = _.defaults({}, options, defaultOptions);
        this.tables = {};
        this.databasePromise = null;
        this.recordCounts = {},
        this.writeCount = 0;
        this.readCount = 0;
        this.deleteCount = 0;
    }

    initialize() {
        this.updateRecordCount('remote');
        this.updateRecordCount('local');
    }

    shutdown() {
        this.tables = {};
        this.databasePromise = null;
    }

    /**
     * Look for objects in cache
     *
     * Query object contains the server address, schema, and table
     *
     * @param  {Object} query
     *
     * @return {Promise<Array<Object>>}
     */
    find(query) {
        let { address, schema, table, criteria } = query;
        if (address == undefined) {
            address = '';
        }
        return this.fetchTable(address, schema, table).then((objects) => {
            let keyName = this.getObjectKeyName(schema);
            let results = [];
            if (_.isEqual(_.keys(criteria), [ keyName ])) {
                let keys = criteria[keyName];
                if (keys instanceof Array) {
                    keys = _.sortBy(_.slice(keys));
                } else {
                    keys = [ keys ];
                }
                // look up by sorted key
                _.each(keys, (key) => {
                    let keyObj = {};
                    keyObj[keyName] = key;
                    let index = _.sortedIndexBy(objects, keyObj, keyName);
                    let object = objects[index];
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
            this.readCount += objects.length;
            return objects;
        });
    }

    /**
     * Save objects originating from specified location into cache
     *
     * @param  {Object} location
     * @param  {Array<Object>} objects
     *
     * @return {Promise<Array<Object>>}
     */
    save(location, objects) {
        let { address, schema, table } = location;
        if (address == undefined) {
            address = '';
        }
        return this.open().then((db) => {
            return new Promise((resolve, reject) => {
                let path = this.getTablePath(address, schema, table);
                let pk = this.getPrimaryKeyGenerator(address, schema, table);
                let storeName = this.getObjectStoreName(schema);
                let transaction = db.transaction(storeName, 'readwrite');
                let objectStore = transaction.objectStore(storeName);
                transaction.oncomplete = (evt) => {
                    resolve(objects);
                };
                transaction.onerror = (evt) => {
                    reject(new Error(evt.message));
                };
                _.each(objects, (object) => {
                    let key = pk(object);
                    let record = {
                        address: address,
                        location: path,
                        data: object,
                    };
                    objectStore.put(record, key);
                });
            });
        }).then((objects) => {
            this.writeCount += objects.length;
            this.updateTableEntry(address, schema, table, objects, false);
            this.updateRecordCount(schema, 500);
            return objects;
        });
    }

    /**
     * Remove objects from cache that originated from specified location
     *
     * @param  {Object} location
     * @param  {Array<Object>} objects
     *
     * @return {Promise<Array<Object>>}
     */
    remove(location, objects) {
        let { address, schema, table } = location;
        if (address == undefined) {
            address = '';
        }
        return this.open().then((db) => {
            return new Promise((resolve, reject) => {
                let pk = this.getPrimaryKeyGenerator(address, schema, table);
                let path = this.getTablePath(address, schema, table);
                let storeName = this.getObjectStoreName(schema);
                let transaction = db.transaction(storeName, 'readwrite');
                let objectStore = transaction.objectStore(storeName);
                transaction.oncomplete = (evt) => {
                    resolve(objects);
                };
                transaction.onerror = (evt) => {
                    reject(new Error(evt.message));
                };
                _.each(objects, (object) => {
                    let key = pk(object);
                    objectStore.delete(key);
                });
            });
        }).then((objects) => {
            this.deleteCount += objects.length;
            this.updateTableEntry(address, schema, table, objects, true);
            this.updateRecordCount(schema, 500);
            return objects;
        });
    }

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
    clean(criteria) {
        return this.open().then((db) => {
            return new Promise((resolve, reject) => {
                let storeName = this.getObjectStoreName('remote');
                let transaction = db.transaction(storeName, 'readwrite');
                let objectStore = transaction.objectStore(storeName);
                if (criteria.address != undefined) {
                    let prefix = null;
                    if (criteria.schema) {
                        if (criteria.schema !== '*') {
                            prefix = `${criteria.address}/${criteria.schema}/`;
                        }
                    }
                    let index = objectStore.index('address');
                    let req = index.openCursor(criteria.address);
                    let records = [];
                    let primaryKeys = [];
                    req.onsuccess = (evt) => {
                        let done = true;
                        let cursor = evt.target.result;
                        if(cursor) {
                            let record = cursor.value;
                            let primaryKey = cursor.primaryKey;
                            if (!prefix || _.startsWith(record.location, prefix)) {
                                records.push(record);
                                primaryKeys.push(primaryKey);
                            }
                            cursor.continue();
                            done = false;
                        }
                        if (done) {
                            _.each(primaryKeys, (key) => {
                                objectStore.delete(key);
                            });
                            resolve(records);
                        }
                    };
                } else if (criteria.count != undefined) {
                    let index = objectStore.index('rtime');
                    let req = index.openCursor();
                    let records = [];
                    let primaryKeys = [];
                    req.onsuccess = (evt) => {
                        let done = true;
                        let cursor = evt.target.result;
                        if(cursor) {
                            let record = cursor.value;
                            let primaryKey = cursor.primaryKey;
                            records.push(record);
                            primaryKeys.push(primaryKey);
                            if (records.length < criteria.count) {
                                cursor.continue();
                                done = false;
                            }
                        }
                        if (done) {
                            _.each(primaryKeys, (key) => {
                                objectStore.delete(key);
                            });
                            resolve(records);
                        }
                    };
                } else if (criteria.before != undefined) {
                    let index = objectStore.index('rtime');
                    let req = index.openCursor();
                    let records = [];
                    let primaryKeys = [];
                    req.onsuccess = (evt) => {
                        let done = true;
                        let cursor = evt.target.result;
                        if(cursor) {
                            let record = cursor.value;
                            let primaryKey = cursor.primaryKey;
                            let object = record.data;
                            if (object.rtime < criteria.before) {
                                records.push(record);
                                primaryKeys.push(primaryKey);
                                cursor.continue();
                                done = false;
                            }
                        }
                        if (done) {
                            _.each(primaryKeys, (key) => {
                                objectStore.delete(key);
                            });
                            resolve(records);
                        }
                    };
                } else {
                    if (process.env.NODE_ENV !== 'production') {
                        console.warn('Invalid removal criteria: ', criteria);
                    }
                    return [];
                }
            });
        }).then((records) => {
            let count = records.length;
            this.deleteCount += records.length;
            this.updateRecordCount('remote', 500);

            let changes = [];
            _.each(records, (record) => {
                let address = record.address || '';
                let [ schema, table ] = record.location.substr(address.length + 1).split('/');
                let change = _.find(changes, { address, schema, table });
                if (!change) {
                    change = { address, schema, table, objects: [] };
                    changes.push(change);
                }
                change.objects.push(record.data);
            });
            _.each(changes, (c) => {
                this.updateTableEntry(c.address, c.schema, c.table, c.objects, true);
            });
            return count;
        }).catch((err) => {
            return this.destroy();
        });
    }

    /**
     * Open database, creating schema if it doesn't exist already
     *
     * @return {Promise<IDBDatabase>}
     */
    open() {
        if (this.databasePromise) {
            return this.databasePromise;
        }
        this.databasePromise = new Promise((resolve, reject) => {
            let { databaseName } = this.options;
            let openRequest = indexedDB.open(databaseName, 1);
            openRequest.onsuccess = (evt) => {
                resolve(evt.target.result);
            };
            openRequest.onerror = (evt) => {
                reject(new Error(evt.message));
            };
            openRequest.onupgradeneeded = (evt) => {
                let db = evt.target.result;
                db.onerror = (evt) => {
                    reject(new Error(evt.message));
                };
                let localStore = db.createObjectStore('local-data');
                localStore.createIndex('location', 'location', { unique: false });
                let remoteStore = db.createObjectStore('remote-data');
                remoteStore.createIndex('location', 'location', { unique: false });
                remoteStore.createIndex('address', 'address', { unique: false });
                remoteStore.createIndex('rtime', 'data.rtime', { unique: false });
            };
        });
        return this.databasePromise;
    }

    /**
     * Destroy the IndexedDB database completely
     *
     * @return {Promise<Boolean>}
     */
    destroy() {
        return new Promise((resolve, reject) => {
            let { databaseName } = this.options;
            let deleteRequest = indexedDB.deleteDatabase(databaseName);
            deleteRequest.onsuccess = (evt) => {
                resolve(true);
            };
            deleteRequest.onerror = (evt) => {
                resolve(false);
            };
        });
    }

    /**
     * Clear objects cached in memory
     *
     * @param  {String|undefined} address
     * @param  {String|undefined} schema
     */
    reset(address, schema) {
        let path;
        if (schema === 'local') {
            path = [ 'local' ];
        } else {
            path = _.filter([ 'remote', address, schema ]);
        }
        _.unset(this.tables, path);
    }

    /**
     * Return name of object store
     *
     * @param  {String} schema
     *
     * @return {String}
     */
    getObjectStoreName(schema) {
        if (schema === 'local') {
            return 'local-data';
        } else {
            return 'remote-data';
        }
    }

    /**
     * Return name of object key
     *
     * @param  {String} schema
     *
     * @return {String}
     */
    getObjectKeyName(schema) {
        if (schema === 'local') {
            return 'key';
        } else {
            return 'id';
        }
    }

    /**
     * Return path to table
     *
     * @param  {String} address
     * @param  {String} schema
     * @param  {String} table
     *
     * @return {String}
     */
    getTablePath(address, schema, table) {
        if (schema === 'local') {
            return table;
        } else {
            return `${address}/${schema}/${table}`;
        }
    }

    /**
     * Return a function for generating primary key
     *
     * @param  {String} address
     * @param  {String} schema
     * @param  {String} table
     *
     * @return {Function}
     */
    getPrimaryKeyGenerator(address, schema, table) {
        let path = this.getTablePath(address, schema, table);
        if (schema === 'local') {
            return (object) => {
                return `${path}/${object.key}`;
            };
        } else {
            return (object) => {
                let idStr = ('0000000000' + object.id).slice(-10);
                return `${path}/${idStr}`;
            };
        }
    }

    /**
     * Return in-memory object for storing table rows
     *
     * @param  {String} address
     * @param  {String} schema
     * @param  {String} table
     *
     * @return {Object}
     */
    getTableEntry(address, schema, table) {
        let path;
        if (schema === 'local') {
            path = [ 'local', table ];
        } else {
            path = [ 'remote', address, schema, table ];
        }
        let tbl = _.get(this.tables, path);
        if (!tbl) {
            tbl = {
                promise: null,
                objects: null,
            };
            _.set(this.tables, path, tbl);
        }
        return tbl;
    }

    /**
     * Update list of objects that have been loaded
     *
     * @param  {String} address
     * @param  {String} schema
     * @param  {String} table
     * @param  {Array<Objects>} objects
     * @param  {Boolean} remove
     */
    updateTableEntry(address, schema, table, objects, remove) {
        let tbl = this.getTableEntry(address, schema, table);
        if (tbl.objects) {
            let keyName = this.getObjectKeyName(schema);
            _.each(objects, (object) => {
                let index = _.sortedIndexBy(tbl.objects, object, keyName);
                let target = tbl.objects[index];
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
    }

    /**
     * Fetch cached rows of a table
     *
     * @param  {String} address
     * @param  {String} schema
     * @param  {String} table
     *
     * @return {Promise<Array<Object>>}
     */
    fetchTable(address, schema, table) {
        let tbl = this.getTableEntry(address, schema, table);
        if (!tbl.promise) {
            tbl.promise = this.loadTable(address, schema, table).then((objects) => {
                tbl.objects = objects;
                return tbl.objects;
            });
        }
        return tbl.promise;
    }

    /**
     * Load all rows for a table into memory
     *
     * @param  {String} address
     * @param  {String} schema
     * @param  {String} table
     *
     * @return {Promise<Object>}
     */
    loadTable(address, schema, table) {
        return this.open().then((db) => {
            return new Promise((resolve, reject) => {
                let storeName = this.getObjectStoreName(schema);
                let keyName = this.getObjectKeyName(schema);
                let transaction = db.transaction(storeName, 'readonly');
                let objectStore = transaction.objectStore(storeName);
                let index = objectStore.index('location');
                let path = this.getTablePath(address, schema, table);
                let req = index.openCursor(path);
                let results = [];
                req.onsuccess = (evt) => {
                    let cursor = evt.target.result;
                    if(cursor) {
                        let record = cursor.value;
                        let object = record.data;
                        let index = _.sortedIndexBy(results, object, keyName);
                        results.splice(index, 0, object);
                        cursor.continue();
                    } else {
                        resolve(results);
                    }
                };
            });
        });
    }

    /**
     * Count the number of rows in the object store (on a time delay)
     *
     * @param  {String} schema
     * @param  {Number} delay
     */
    updateRecordCount(schema, delay) {
        let storeName = this.getObjectStoreName(schema);
        let timeoutPath = `updateRecordCountTimeouts.${storeName}`;
        let timeout = _.get(this, timeoutPath);
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            this.open().then((db) => {
                let transaction = db.transaction(storeName, 'readonly');
                let objectStore = transaction.objectStore(storeName);
                let req = objectStore.count();
                req.onsuccess = (evt) => {
                    this.recordCounts[storeName] = evt.target.result;
                };
            }).catch((err) => {
            });
            _.set(this, timeoutPath, 0);
        }, delay || 0);
        _.set(this, timeoutPath, timeout);
    }
}

export {
    IndexedDBCache as default,
    IndexedDBCache,
};
