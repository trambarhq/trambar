import { Data } from './data.mjs';

export class Rest extends Data {
  static schema = 'project';
  static table = 'rest';
  static columns = {
    ...Data.columns,
    type: String,
    name: String,
    url: String,
    disabled: Boolean,
    settings: Object,
  };
  static criteria = {
    ...Data.criteria,
    type: String,
    name: String,
    url: String,
    disabled: Boolean,
  };
  static eventColumns = {
    ...Data.eventColumns,
    type: String,
    name: String,
    disabled: Boolean,
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
        type text NOT NULL DEFAULT '',
        name text NOT NULL DEFAULT '',
        url text NOT NULL DEFAULT '',
        disabled boolean NOT NULL DEFAULT false,
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
      GRANT SELECT ON ${table} TO client_role;
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
   * See if a database change event is relevant to a given user
   *
   * @param  {Object} event
   * @param  {User} user
   * @param  {Subscription} subscription
   *
   * @return {boolean}
   */
  static isRelevantTo(event, user, subscription) {
    return (subscription.area === 'admin');
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
      object.name = row.name;
      object.type = row.type;
      object.disabled = row.disabled;
      if (credentials.unrestricted || process.env.ADMIN_GUEST_MODE) {
        object.url = row.url;
        object.settings = row.settings;
      }
    }
    return objects;
  }

  /**
   * Throw an exception if modifications aren't permitted
   *
   * @param  {Object} serverReceived
   * @param  {Object} serverBefore
   * @param  {Object} credentials
   */
  static checkWritePermission(serverReceived, serverBefore, credentials) {
    if (credentials.unrestricted) {
      return;
    }
    throw new HTTPError(403);
  }
}
