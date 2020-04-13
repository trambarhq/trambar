import { ExternalData } from './external-data.mjs';

export class Commit extends ExternalData {
  static schema = 'global';
  static table = 'commit';
  static columns = {
    ...ExternalData.columns,
    initial_branch: String,
    title_hash: String,
    external: Array(Object),
    exchange: Array(Object),
    itime: String,
    etime: String,
  };
  static criteria = {
    ...ExternalData.criteria,
    title_hash: String,
    external_object: Object,
  };
  static eventColumns = {
    ...ExternalData.eventColumns,
    external: Array(Object),
    itime: String,
    etime: String,
  };

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
        initial_branch varchar(256) NOT NULL,
        title_hash varchar(32) NOT NULL,
        external jsonb[] NOT NULL DEFAULT '{}',
        exchange jsonb[] NOT NULL DEFAULT '{}',
        itime timestamp,
        etime timestamp,
        PRIMARY KEY (id)
      );
      CREATE INDEX ON ${table} USING gin(("externalIdStrings"(external, 'gitlab', '{commit}'))) WHERE deleted = false;
    `;
    await db.execute(sql);
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
    // objects aren't currently used on client-side
    return false;
  }
}
