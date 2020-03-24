import _ from 'lodash';
import { matchSearchCriteria, limitSearchResults } from './local-search.js';

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
    const { databaseName } = this.options;
    const json = localStorage.getItem(databaseName);
    const localData = decodeJSON(json);
    if (localData instanceof Object) {
      this.localData = localData;
    }
  }

  shutdown() {
  }

  getRows(server, schema, table) {
    const store = (schema === 'local') ? this.localData : this.remoteData;
    const path = [ server, schema, table ];
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
    const { databaseName } = this.options;
    const json = JSON.stringify(this.localData);
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
  async find(query) {
    const { server = 'localhost', schema, table, criteria } = query;
    const rows = this.getRows(server, schema, table);
    const keyName = this.getKeyName(schema);
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
        return matchSearchCriteria(table, row, criteria);
      });
    }
    limitSearchResults(table, objects, criteria);
    return objects;
  }

  /**
   * Save objects originating from specified location into cache
   *
   * @param  {Object} location
   * @param  {Array<Object>} objects
   *
   * @return {Promise<Array<Object>>}
   */
  async save(location, objects) {
    const { server = 'localhost', schema, table } = location;
    const rows = this.getRows(server, schema, table);
    const keyName = this.getKeyName(schema);
    for (let object of objects) {
      replaceByKey(rows, _.cloneDeep(object), keyName);
    }
    this.saveRows(server, schema, table);
    return objects;
  }

  /**
   * Remove objects from cache that originated from specified location
   *
   * @param  {Object} location
   * @param  {Array<Object>} objects
   *
   * @return {Promise<Array<Object>>}
   */
  async remove(location, objects) {
    const { server = 'localhost', schema, table } = location;
    const rows = this.getRows(server, schema, table);
    const keyName = this.getKeyName(schema);
    for (let object of objects) {
      removeByKey(rows, object, keyName);
    }
    this.saveRows(server, schema, table);
    return objects;
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
  async clean(criteria) {
    const store = this.remoteData;
    let count = 0;
    if (criteria.server !== undefined) {
      const schemas = store[criteria.server];
      for (let schema of Object.values(schemas)) {
        for (let table of Object.values(schema)) {
          count += table.length;
        }
      }
      delete store[criteria.server];
    } else if (criteria.count !== undefined) {
      // push all objects into a list
      const candidates = [];
      for (let schemas of Object.values(store)) {
        for (let schema of Object.values(schemas)) {
          for (let table of Object.values(schema)) {
            for (let row of table) {
              candidates.push(row);
            }
          }
        }
      }
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
      for (let schemas of Object.values(store)) {
        for (let schema of Object.values(schemas)) {
          for (let table of Object.values(schema)) {
            for (let i = table.length - 1; i >= 0; i--) {
              if (candidates.includes(table[i])) {
                table.splice(i, 1);
                count++;
              }
            }
          }
        }
      }
    } else if (criteria.before !== undefined) {
      // go through every table
      for (let schemas of Object.values(store)) {
        for (let schema of Object.values(schemas)) {
          for (let table of Object.values(schema)) {
            for (let i = table.length - 1; i >= 0; i--) {
              if (table[i].rtime < criteria.before) {
                table.splice(i, 1);
                count++;
              }
            }
          }
        }
      }
    }
    return count;
  }

  /**
   * Clear objects cached in memory
   *
   * @param  {String|undefined} address
   * @param  {String|undefined} schema
   */
  reset(address, schema) {
    if (schema !== 'local') {
      const path = _.filter([ address, schema ]);
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
  const criteria = {};
  criteria[keyName] = key;
  const index = _.sortedIndexBy(rows, criteria, keyName);
  const target = rows[index];
  if (target && target[keyName] === key) {
    return target;
  }
}

function replaceByKey(rows, object, keyName) {
  const index = _.sortedIndexBy(rows, object, keyName);
  const target = rows[index];
  if (target && target[keyName] === object[keyName]) {
    rows[index] = object;
  } else {
    rows.splice(index, 0, object);
  }
}

function removeByKey(rows, object, keyName) {
  const index = _.sortedIndexBy(rows, object, keyName);
  const target = rows[index];
  if (target && target[keyName] === object[keyName]) {
    rows.splice(index, 1);
  }
}

export {
  LocalStorageCache as default,
  LocalStorageCache,
};
