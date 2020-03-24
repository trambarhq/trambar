import _ from 'lodash';
import { matchSearchCriteria, limitSearchResults } from './local-search.js';

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
  async find(query) {
    const { address = '', schema, table, criteria } = query;
    const objects = await this.fetchTable(address, schema, table);
    const keyName = this.getObjectKeyName(schema);
    const results = [];
    if (criteria?.hasOwnProperty(keyName) && Object.keys(criteria).length === 1) {
      let keys = criteria[keyName];
      if (keys instanceof Array) {
        keys = _.sortBy(_.slice(keys));
      } else {
        keys = [ keys ];
      }
      // look up by sorted key
      for (let key of keys) {
        const keyObj = {};
        keyObj[keyName] = key;
        const index = _.sortedIndexBy(objects, keyObj, keyName);
        const object = objects[index];
        if (object && object[keyName] === key) {
          results.push(object);
        }
      }
    } else {
      for (let object of objects) {
        if (matchSearchCriteria(table, object, criteria)) {
          results.push(object);
        }
      }
    }
    limitSearchResults(table, results, query.criteria);
    this.readCount += results.length;
    return results;
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
    const { address = '', schema, table } = location;
    const db = await this.open();
    await new Promise((resolve, reject) => {
      const path = this.getTablePath(address, schema, table);
      const pk = this.getPrimaryKeyGenerator(address, schema, table);
      const storeName = this.getObjectStoreName(schema);
      const transaction = db.transaction(storeName, 'readwrite');
      const objectStore = transaction.objectStore(storeName);
      transaction.oncomplete = (evt) => {
        resolve(objects);
      };
      transaction.onerror = (evt) => {
        reject(new Error(evt.message));
      };
      for (let object of objects) {
        const key = pk(object);
        const record = {
          address: address,
          location: path,
          data: object,
        };
        objectStore.put(record, key);
      }
    });
    this.writeCount += objects.length;
    this.updateTableEntry(address, schema, table, objects, false);
    this.updateRecordCount(schema, 500);
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
    const { address = '', schema, table } = location;
    const db = await this.open();
    await new Promise((resolve, reject) => {
      const pk = this.getPrimaryKeyGenerator(address, schema, table);
      const path = this.getTablePath(address, schema, table);
      const storeName = this.getObjectStoreName(schema);
      const transaction = db.transaction(storeName, 'readwrite');
      const objectStore = transaction.objectStore(storeName);

      transaction.oncomplete = (evt) => {
        resolve(objects);
      };
      transaction.onerror = (evt) => {
        reject(new Error(evt.message));
      };
      for (let object of objects) {
        const key = pk(object);
        objectStore.delete(key);
      }
    });
    this.deleteCount += objects.length;
    this.updateTableEntry(address, schema, table, objects, true);
    this.updateRecordCount(schema, 500);
    return objects;
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
  async clean(criteria) {
    try {
      let db = await this.open();
      let records = await new Promise((resolve, reject) => {
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
              for (let key of primaryKeys) {
                objectStore.delete(key);
              }
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
              for (let key of primaryKeys) {
                objectStore.delete(key);
              }
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
              for (let key of primaryKeys) {
                objectStore.delete(key);
              }
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

      let count = records.length;
      this.deleteCount += records.length;
      this.updateRecordCount('remote', 500);

      let changes = [];
      for (let record of records) {
        let address = record.address || '';
        let [ schema, table ] = record.location.substr(address.length + 1).split('/');
        let change = _.find(changes, { address, schema, table });
        if (!change) {
          change = { address, schema, table, objects: [] };
          changes.push(change);
        }
        change.objects.push(record.data);
      }
      for (let c of changes) {
        this.updateTableEntry(c.address, c.schema, c.table, c.objects, true);
      }
      return count;
    } catch (err) {
      return this.destroy();
    }
  }

  /**
   * Open database, creating schema if it doesn't exist already
   *
   * @return {Promise<IDBDatabase>}
   */
  async open() {
    if (!this.databasePromise) {
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
    }
    return this.databasePromise;
  }

  /**
   * Destroy the IndexedDB database completely
   *
   * @return {Promise<Boolean>}
   */
  async destroy() {
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
    const path = this.getTablePath(address, schema, table);
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
      for (let object of objects) {
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
      }
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
  async fetchTable(address, schema, table) {
    const tbl = this.getTableEntry(address, schema, table);
    if (!tbl.promise) {
      tbl.promise = this.loadTable(address, schema, table, tbl);
    }
    return tbl.promise;
  }

  /**
   * Load all rows for a table into memory
   *
   * @param  {String} address
   * @param  {String} schema
   * @param  {String} table
   * @param  {Object} tbl
   *
   * @return {Promise<Object>}
   */
  async loadTable(address, schema, table, tbl) {
    const db = await this.open();
    const objects = await new Promise((resolve, reject) => {
      const storeName = this.getObjectStoreName(schema);
      const keyName = this.getObjectKeyName(schema);
      const transaction = db.transaction(storeName, 'readonly');
      const objectStore = transaction.objectStore(storeName);
      const index = objectStore.index('location');
      const path = this.getTablePath(address, schema, table);
      const req = index.openCursor(path);
      const results = [];
      req.onsuccess = (evt) => {
        const cursor = evt.target.result;
        if(cursor) {
          const record = cursor.value;
          const object = record.data;
          const index = _.sortedIndexBy(results, object, keyName);
          results.splice(index, 0, object);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
    });
    tbl.objects = objects;
    return objects;
  }

  /**
   * Count the number of rows in the object store (on a time delay)
   *
   * @param  {String} schema
   * @param  {Number} delay
   */
  updateRecordCount(schema, delay) {
    const storeName = this.getObjectStoreName(schema);
    const timeoutPath = `updateRecordCountTimeouts.${storeName}`;
    let timeout = _.get(this, timeoutPath);
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(async () => {
      try {
        const db = await this.open();
        const transaction = db.transaction(storeName, 'readonly');
        const objectStore = transaction.objectStore(storeName);
        const req = objectStore.count();
        req.onsuccess = (evt) => {
          this.recordCounts[storeName] = evt.target.result;
        };
      } catch (err) {
      }
      _.set(this, timeoutPath, 0);
    }, delay || 0);
    _.set(this, timeoutPath, timeout);
  }
}

export {
  IndexedDBCache as default,
  IndexedDBCache,
};
