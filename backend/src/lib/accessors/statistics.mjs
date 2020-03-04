import _ from 'lodash';
import Crypto from 'crypto'
import { LiveData } from './live-data.mjs';

export class Statistics extends LiveData {
  static schema = 'project';
  static table = 'statistics';
  static columns = {
    ...LiveData.columns,
    type: String,
    filters: Object,
    filters_hash: String,
    sample_count: Number,
  };
  static criteria = {
    ...LiveData.criteria,
    type: String,
    filters_hash: String,
    match_any: Array(Object),
  };
  static eventColumns = {
    ...LiveData.eventColumns,
    type: String,
    filters: Object,
  };

  /**
   * Create table in schemaroot
   *
   * @param  {Database} db
   * @param  {String} schema
   *
   * @return {Promise}
   */
  static async create(db, schema) {
    const table = this.getTableName(schema);
    const sql = `
      CREATE TABLE ${table} (
        id serial,
        gn int NOT NULL DEFAULT 1,
        deleted boolean NOT NULL DEFAULT false,
        ctime timestamp NOT NULL DEFAULT NOW(),
        mtime timestamp NOT NULL DEFAULT NOW(),
        details jsonb NOT NULL DEFAULT '{}',
        atime timestamp,
        ltime timestamp,
        dirty boolean NOT NULL DEFAULT false,
        type varchar(64) NOT NULL,
        filters jsonb NOT NULL,
        filters_hash varchar(32) NOT NULL,
        sample_count int NOT NULL DEFAULT 0,
        PRIMARY KEY (id)
      );
      CREATE INDEX ON ${table} (filters_hash, type) WHERE deleted = false;
      CREATE UNIQUE INDEX ON ${table} (id) WHERE dirty = true;
    `;
    await db.execute(sql);
  }

  /**
   * Attach triggers to the table.
   *
   * @param  {Database} db
   * @param  {String} schema
   *
   * @return {Promise}
   */
  static async watch(db, schema) {
    await this.createChangeTrigger(db, schema);
    await this.createNotificationTriggers(db, schema);
  }

  /**
   * Add conditions to SQL query based on criteria object
   *
   * @param  {Object} criteria
   * @param  {Object} query
   */
  static apply(criteria, query) {
    const { match_any, ...basic } = criteria;
    super.apply(basic, query);

    const params = query.parameters;
    const conds = query.conditions;
    if (match_any) {
      const objects = `$${params.push(match_any)}`;
      conds.push(`"matchAny"(filters, ${objects})`);
    }
  }

  /**
   * Look for rows matching type and filters, creating empty rows if they're
   * not yet there
   *
   * @param  {Database} db
   * @param  {String} schema
   * @param  {Object|null} criteria
   * @param  {String} columns
   *
   * @return {Promise<Array>}
   */
  static async find(db, schema, criteria, columns) {
    // autovivify rows when type and filters are specified
    const type = criteria.type;
    let filters = criteria.filters;
    if (type && filters) {
      if (!(filters instanceof Array)) {
        filters = [ filters ];
      }
      // calculate hash of filters for quicker look-up
      const hashes = _.map(filters, hash);
      // key columns
      const keys = {
        type: type,
        filters_hash: hashes,
      };
      // properties of rows that are expected
      const expectedRows = _.map(hashes, (hash, index) => {
        return {
          type: type,
          filters_hash: hash,
          filters: filters[index]
        };
      });
      return this.vivify(db, schema, keys, expectedRows, columns);
    } else {
      return super.find(db, schema, criteria, columns);
    }
  }

  /**
   * Export database row to client-side code, omitting sensitive or
   * unnecessary information
   *
   * @param  {Database} db
   * @param  {String} schema
   * @param  {Array<Object>} rows
   * @param  {Object} credentials
   * @param  {Object} options
   *
   * @return {Promise<Array<Object>>}
   */
  static async export(db, schema, rows, credentials, options) {
    const objects = await super.export(db, schema, rows, credentials, options);
    for (let [ index, object ] of objects.entries()) {
      const row = rows[index];
      object.type = row.type;
      object.filters = row.filters;
    }
    return objects;
  }

  /**
   * See if a database change event is relevant to a given user
   *
   * @param  {Object} event
   * @param  {User} user
   * @param  {Subscription} subscription
   *
   * @return {Boolean}
   */
  static isRelevantTo(event, user, subscription) {
    if (super.isRelevantTo(event, user, subscription)) {
      switch (event.current.type) {
        case 'story-popularity':
          // used for ranking stories only
          break;
        case 'daily-notifications':
          if (event.current.filters.target_user_id !== user.id) {
            break;
          }
        default:
          return true;
      }
    }
    return false;
  }
}

/**
 * Generate MD5 hash of filters object
 *
 * @param  {Object} filters
 *
 * @return {String}
 */
function hash(filters) {
  const keys = _.sortBy(_.keys(filters));
  const values = {};
  for (let key of keys) {
    values[key] = filters[key];
  }
  const text = JSON.stringify(values);
  const hash = Crypto.createHash('md5').update(text);
  return hash.digest("hex");
}
