import { matchSearchCriteria, limitSearchResults } from './local-search.js';
import { sortedIndexBy } from '../utils/array-utils.js';
import { isEqual, get, set, unset } from '../utils/object-utils.js';

let openDatabase = window.openDatabase;
if (window.sqlitePlugin) {
  openDatabase = window.sqlitePlugin.openDatabase;
}

const defaultOptions = {
  databaseName: 'database',
};

class SQLiteCache {
  /**
   * Return true if SQLite is available
   *
   * @return {Boolean}
   */
  static isAvailable() {
    return !!openDatabase;
  }

  constructor(options) {
    this.options = Object.assign({ ...defaultOptions }, options);
    this.tables = {};
    this.recordCounts = {};
    this.writeCount = 0;
    this.readCount = 0;
    this.deleteCount = 0;
    this.recordCountTimeout = 0;
  }

  initialize() {
    this.updateRecordCount('remote');
    this.updateRecordCount('local');
  }

  shutdown() {
    this.tables = {};
  }

  /**
   * Look for objects in cache
   *
   * Query object contains the name of the server address, schema, and table
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
    if (criteria?.hasOwnProperty(keyName) && Object.keys(criteria) === 1) {
      let keys = criteria[keyName];
      if (keys instanceof Array) {
        keys = keys.slice().sort();
      } else {
        keys = [ keys ];
      }
      // look up by sorted key
      for (let key of keys) {
        const keyObj = {};
        keyObj[keyName] = key;
        const index = sortedIndexBy(objects, keyObj, keyName);
        const object = objects[index];
        if (object && object[keyName] === key) {
          results.push(object);
        }
      }
      return results;
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
    const statements = [], paramSets = [];
    for (let object of objects) {
      const json = JSON.stringify(object);
      if (schema === 'local') {
        statements.push(`
          INSERT OR REPLACE INTO local_data
          (table_name, key, json)
          VALUES (?, ?, ?)
        `);
        paramSets.push([ table, object.key, json ]);
      } else {
        const rtime = (new Date(object.rtime)).getTime();
        statements.push(`
          INSERT OR REPLACE INTO remote_data
          (address, schema_name, table_name, id, json, rtime)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        paramSets.push([ address, schema, table, object.id, json, rtime ]);
      }
    }
    const affectedCount = await this.execute(statements, paramSets);
    this.writeCount += affectedCount;
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
    const statements = [], paramSets = [];
    for (let object of objects) {
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
    }
    const affectedCount = await this.execute(statements, paramSets);
    this.deleteCount += affectedCount;
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
    let sql, params;
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
      const rtime = (new Date(criteria.before)).getTime();
      sql = `
        DELETE FROM remote_data
        WHERE rtime < ?
      `;
      params = [ rtime ];
    } else {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Invalid removal criteria: ', criteria);
      }
      return 0;
    }
    const affectedCount = await this.execute(sql, params);
    if (affectedCount > 0) {
      this.deleteCount += affectedCount;
      this.updateRecordCount('remote_data');
      this.tables['remote'] = {};
    }
    return affectedCount;
  }

  /**
   * Run a query and return the resulting rows
   *
   * @param  {String} sql
   * @param  {Array<*>} params
   *
   * @return {Promise<Array<Object>>}
   */
  async query(sql, params) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      // annoyingly, SQLError isn't a subclass of Error
      const rejectT = (err) => { reject(new Error(err.message)) };
      db.transaction((tx) => {
        tx.executeSql(sql, params, (tx, rs) => {
          const rows = [];
          for (let i = 0; i < rs.rows.length; i++) {
            rows.push(rs.rows.item(i));
          }
          resolve(rows);
        });
      }, rejectT);
    });
  }

  /**
   * Execute a SQL statement
   *
   * @param  {String} sql
   * @param  {Array<*>} params
   *
   * @return {Promise}
   */
  async execute(sql, params) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      let affected = 0;
      const rejectT = (err) => { reject(new Error(err.message)) };
      const resolveT = () => { resolve(affected) };
      const callback = (tx, rs) => {
        affected += rs.rowsAffected ;
      };
      db.transaction((tx) => {
        if (sql instanceof Array) {
          for (let i = 0; i < sql.length; i++) {
            tx.executeSql(sql[i], params[i], callback);
          }
        } else {
          tx.executeSql(sql, params, callback);
        }
      }, rejectT, resolveT);
    });
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
    let sql, params;
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
    const rows = await this.query(sql, params);
    const objects = rows.map(r => decodeJSON(r.json));
    tbl.objects = objects;
    return objects;
  }

  /**
   * Open database, creating schema if it doesn't exist already
   *
   * @return {Promise<Database>}
   */
  open() {
    if (!this.databasePromise) {
      this.databasePromise = new Promise((resolve, reject) => {
        const { databaseName } = this.options;
        const db = openDatabase(databaseName, '', '', 50 * 1048576);
        const sql = [
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

        const resolveS = () => { resolve(db) };
        const rejectS = (err) => { reject(new Error(err.message)) };
        db.transaction((tx) => {
          for (let line of sql) {
            tx.executeSql(line);
          }
        }, rejectS, resolveS)
      });
    }
    return this.databasePromise;
  }

  /**
   * Clear objects cached in memory
   *
   * @param  {String|undefined} address
   * @param  {String|undefined} schema
   */
  reset(address, schema) {
    const path = [];
    if (schema === 'local') {
      path.push('local');
    } else {
      path.push('remote');
      if (address) {
        path.push(address);
        if (schema) {
          path.push(schema);
        }
      }
    }
    unset(this.tables, path);
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
   * Return in-memory object for storing table rows
   *
   * @param  {String} address
   * @param  {String} schema
   * @param  {String} table
   *
   * @return {Object}
   */
  getTableEntry(address, schema, table) {
    const path = [];
    if (schema === 'local') {
      path.push('local', table);
    } else {
      path.push('remote', address, schema, table);
    }
    let tbl = get(this.tables, path);
    if (!tbl) {
      tbl = {
        promise: null,
        objects: null,
      };
      set(this.tables, path, tbl);
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
    const tbl = this.getTableEntry(address, schema, table);
    if (tbl.objects) {
      const keyName = this.getObjectKeyName(schema);
      for (let object of objects) {
        const index = sortedIndexBy(tbl.objects, object, keyName);
        const target = tbl.objects[index];
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
   * Count the number of rows in the table (on a time delay)
   *
   * @param  {String} schema
   * @param  {Number} delay
   */
  updateRecordCount(schema, delay) {
    const cacheTableName = (schema === 'local') ? 'local_data' : 'remote_data';
    if (this.recordCountTimeout) {
      clearTimeout(this.recordCountTimeout);
    }
    this.recordCountTimeout = setTimeout(async () => {
      try {
        const sql = `SELECT COUNT(*) as count FROM ${cacheTableName}`;
        const rows = await this.query(sql);
        this.recordCounts[cacheTableName] = rows[0].count;
      } catch (err) {
      }
      this.recordCountTimeout = 0;
    }, delay || 0);
  }
}

function decodeJSON(s) {
  try {
    return JSON.parse(s);
  } catch(err) {
    return null;
  }
}

export {
  SQLiteCache as default,
  SQLiteCache,
};
