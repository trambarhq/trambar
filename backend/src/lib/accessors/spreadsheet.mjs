import _ from 'lodash';
import { Data } from './data.mjs';
import { HTTPError } from '../errors.mjs';

export class Spreadsheet extends Data {
  static schema = 'project';
  static table = 'spreadsheet';
  static columns = {
    ...Data.columns,
    language_codes: Array(String),
    disabled: Boolean,
    hidden: Boolean,
    name: String,
    url: String,
    etag: String,
    settings: Object,
  };
  static criteria = {
    ...Data.criteria,
    language_codes: Array(String),
    disabled: Boolean,
    hidden: Boolean,
    name: String,
    url: String,
    etag: String,

    search: Object,
  };
  static eventColumns = {
    ...Data.eventColumns,
    language_codes: Array(String),
    disabled: Boolean,
    hidden: Boolean,
    name: String,
  };
  static version = 3;

  /**
   * Create table in schema
   *
   * @param  {Database} db
   * @param  {string} schema
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
        language_codes varchar(2)[] NOT NULL DEFAULT '{}'::text[],
        name text NOT NULL DEFAULT '',
        etag text NOT NULL DEFAULT '',
        url text NOT NULL DEFAULT '',
        disabled boolean NOT NULL DEFAULT false,
        hidden boolean NOT NULL DEFAULT false,
        settings jsonb NOT NULL DEFAULT '{}',
        PRIMARY KEY (id)
      );
      CREATE UNIQUE INDEX ON ${table} (name) WHERE deleted = false;
    `;
    await db.execute(sql);
  }

  /**
   * Upgrade table in schema to given DB version (from one version prior)
   *
   * @param  {Database} db
   * @param  {string} schema
   * @param  {number} version
   *
   * @return {boolean}
   */
  static async upgrade(db, schema, version) {
    if (version === 3) {
      await this.create(db, schema);
      await this.grant(db, schema);
      return true;
    }
    return false;
  }

  /**
   * Grant privileges to table to appropriate Postgres users
   *
   * @param  {Database} db
   * @param  {string} schema
   */
  static async grant(db, schema) {
    const table = this.getTableName(schema);
    const sql = `
      GRANT INSERT, SELECT, UPDATE ON ${table} TO admin_role;
      GRANT SELECT, UPDATE ON ${table} TO client_role;
    `;
    await db.execute(sql);
  }

  /**
   * Attach triggers to the table.
   *
   * @param  {Database} db
   * @param  {string} schema
   */
  static async watch(db, schema) {
    await this.createChangeTrigger(db, schema);
    await this.createNotificationTriggers(db, schema);
  }

  /**
   * Add conditions to SQL query based on criteria object
   *
   * @param  {Database} db
   * @param  {string} schema
   * @param  {Object} criteria
   * @param  {Object} query
   */
  static async apply(db, schema, criteria, query) {
    const { search, ...basic } = criteria;
    super.apply(basic, query);
    if (search) {
      await this.applyTextSearch(db, schema, search, query);
    }
  }

  /**
   * Return SQL expression that yield searchable text
   *
   * @param  {string} languageCode
   *
   * @return {string}
   */
  static getSearchableText(languageCode) {
    return `"extractSpreadsheetText"(details, '${languageCode}')`;
  }

  /**
   * Export database row to client-side code, omitting sensitive or
   * unnecessary information
   *
   * @param  {Database} db
   * @param  {string} schema
   * @param  {Object[]} rows
   * @param  {Object} credentials
   * @param  {Object} options
   *
   * @return {Object[]}
   */
  static async export(db, schema, rows, credentials, options) {
    const objects = await super.export(db, schema, rows, credentials, options);
    for (let [ index, object ] of objects.entries()) {
      const row = rows[index];
      object.disabled = row.disabled;
      object.name = row.name;
      if (credentials.unrestricted || process.env.ADMIN_GUEST_MODE) {
        object.hidden = row.hidden;
        object.etag = row.etag;
        object.url = row.url;
      }
    }
    return objects;
  }

  /**
   * Throw an exception if modifications aren't permitted
   *
   * @param  {Object} spreadsheetReceived
   * @param  {Object} spreadsheetBefore
   * @param  {Object} credentials
   */
  static checkWritePermission(spreadsheetReceived, spreadsheetBefore, credentials) {
    if (credentials.unrestricted) {
      return;
    }
    throw new HTTPError(403);
  }

  /**
   * Save a row, appending a number if a name conflict occurs
   *
   * @param  {Database} db
   * @param  {string} schema
   * @param  {user} object
   *
   * @return {Object}
   */
  static async saveUnique(db, schema, object) {
    // this doesn't work within a transaction
    try {
      const objectAfter = await this.saveOne(db, schema, object);
      return objectAfter;
    } catch (err) {
      // unique violation
      if (err.code === '23505') {
        object = { ...object };
        const m = /(.*)(\d+)$/.exec(object.name);
        if (m) {
          const number = parseInt(m[2]);
          object.name = m[1] + (number + 1);
        } else {
          object.name += '2';
        }
        return this.saveUnique(db, schema, object);
      }
      throw err;
    }
  }
}
