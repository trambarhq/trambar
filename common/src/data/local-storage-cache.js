import _ from 'lodash';
import Promise from 'bluebird';
import LocalSearch from 'data/local-search';

const defaultOptions = {
    databaseName: 'database'
};

class LocalStorageCache {
    static isAvailable() {
        return !!window.localStorage;
    }

    constructor(options) {
        this.options = _.defaults({}, options, defaultOptions);
        this.localData = {};
        this.remoteData = {};
    }

    initialize() {
        let { databaseName } = this.options;
        let json = localStorage.getItem(databaseName);
        let localData = decodeJSON(json);
        if (localData instanceof Object) {
            this.localData = localData;
        }
    }

    shutdown() {
    }

    getRows(server, schema, table) {
        let store = (schema === 'local') ? this.localData : this.remoteData;
        let path = [ server, schema, table ];
        let rows = _.get(store, path);
        if (!rows) {
            rows = [];
            _.set(store, path, rows);
        }
        return rows;
    }

    getKeyName(schema) {
        return (schema === 'local') ? 'key' : 'id';
    }

    saveRows(server, schema, table) {
        if (schema !== 'local') {
            // don't save remote data
            return;
        }
        let { databaseName } = this.options;
        let json = JSON.stringify(this.localData);
        localStorage.setItem(databaseName, json);
    }

    /**
     * Look for objects in cache
     *
     * Query object contains the name of the origin server, schema, and table
     *
     * @param  {Object} query
     *
     * @return {Promise<Array<Object>>}
     */
    find(query) {
        let { server ,schema, table, criteria } = query;
        if (server == undefined) {
            server = 'localhost';
        }
        let rows = this.getRows(server, schema, table);
        let keyName = this.getKeyName(schema);
        let objects;
        if (criteria && criteria.id !== undefined && _.size(criteria) === 1) {
            // look up by id
            let ids = criteria.id;
            if (!(ids instanceof Array)) {
                ids = [ ids ];
            }
            objects = _.filter(_.map(ids, (id) => {
                return findByKey(rows, id, keyName);
            }));
        } else {
            objects = _.filter(rows, (row) => {
                return LocalSearch.match(table, row, criteria);
            });
        }
        LocalSearch.limit(table, objects, criteria);
        return Promise.resolve(objects);
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
        let { server, schema, table } = location;
        if (server == undefined) {
            server = 'localhost';
        }
        let rows = this.getRows(server, schema, table);
        let keyName = this.getKeyName(schema);
        _.each(objects, (object) => {
            replaceByKey(rows, _.cloneDeep(object), keyName);
        });
        this.saveRows(server, schema, table);
        return Promise.resolve(objects);
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
        let { server, schema, table } = location;
        if (server == undefined) {
            server = 'localhost';
        }
        let rows = this.getRows(server, schema, table);
        let keyName = this.getKeyName(schema);
        _.each(objects, (object) => {
            removeByKey(rows, object, keyName);
        });
        this.saveRows(server, schema, table);
        return Promise.resolve(objects);
    }

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
    clean(criteria) {
        let sql, params;
        let store = this.remoteData;
        let count = 0;
        if (criteria.server !== undefined) {
            let server = criteria.server;
            let schemas = _.get(store, server);
            _.each(schemas, (schema) => {
                _.each(schema, (table) => {
                    count += table.length;
                });
            });
            _.set(store, server, undefined);
        } else if (criteria.count !== undefined) {
            // push all objects into a list
            let candidates = [];
            _.each(store, (schemas) => {
                _.each(schemas, (schema) => {
                    _.each(schema, (table) => {
                        for (let i = 0; i < table.length; i++) {
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
                        for (let i = table.length - 1; i >= 0; i--) {
                            let object = table[i];
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
                        for (let i = table.length - 1; i >= 0; i--) {
                            let object = table[i];
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
    }

    /**
     * Clear objects cached in memory
     *
     * @param  {String|undefined} address
     * @param  {String|undefined} schema
     */
    reset(address, schema) {
        if (schema !== 'local') {
            let path = _.filter([ address, schema ]);
            _.unset(this.remoteData, path);
        }
    }
}

function decodeJSON(s) {
    try {
        return JSON.parse(s);
    } catch(err) {
        return null;
    }
}

function findByKey(rows, key, keyName) {
    let criteria = {};
    criteria[keyName] = key;
    let index = _.sortedIndexBy(rows, criteria, keyName);
    let target = rows[index];
    if (target && target[keyName] === key) {
        return target;
    }
}

function replaceByKey(rows, object, keyName) {
    let index = _.sortedIndexBy(rows, object, keyName);
    let target = rows[index];
    if (target && target[keyName] === object[keyName]) {
        rows[index] = object;
    } else {
        rows.splice(index, 0, object);
    }
}

function removeByKey(rows, object, keyName) {
    let index = _.sortedIndexBy(rows, object, keyName);
    let target = rows[index];
    if (target && target[keyName] === object[keyName]) {
        rows.splice(index, 1);
    }
}

export {
    LocalStorageCache as default,
    LocalStorageCache,
};
