import { Data } from './data.mjs';

export class Session extends Data {
  static schema = 'global';
  static table = 'session';
  static columns = {
    ...Data.columns,
    user_id: Number,
    handle: String,
    token: String,
    activated: Boolean,
    area: String,
    etime: String,
  };
  static criteria = {
    ...Data.criteria,
    user_id: Number,
    handle: String,
    token: String,
    activated: Boolean,
    area: String,

    expired: Boolean,
  };
  static eventColumns = {
    ...Data.eventColumns,
    user_id: Number,
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
        user_id int,
        handle varchar(16) NOT NULL,
        token varchar(32),
        area varchar(32) NOT NULL,
        activated boolean NOT NULL DEFAULT false,
        etime timestamp NOT NULL,
        PRIMARY KEY (id)
      );
      CREATE INDEX ON ${table} (handle);
      CREATE INDEX ON ${table} (token);
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
      await this.createNotificationTriggers(db, schema);
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
    // authorization check is performed through a stored procedure
    // other DB roles don't need direct access to this table
    const table = this.getTableName(schema);
    const sql = `
      GRANT INSERT, SELECT, UPDATE ON ${table} TO auth_role;
    `;
    return db.execute(sql);
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
   * Check if authorization token is valid
   *
   * @param  {Database} db
   * @param  {string} token
   * @param  {string} area
   *
   * @return {number|null}
   */
  static async check(db, token, area) {
    const sql = `SELECT "checkAuthorization"($1, $2) AS user_id`;
    const [ row ] = await db.query(sql, [ token, area ]);
    return (row) ? row.user_id : null;
  }

  /**
   * Extend authorization til the given number of day from now
   *
   * @param  {Database} db
   * @param  {string} token
   * @param  {number} days
   */
  static async extend(db, token, days) {
    const sql = `SELECT "extendAuthorization"($1, $2) AS result`;
    await db.query(sql, [ token, days ]);
  }

  /**
   * Add conditions to SQL query based on criteria object
   *
   * @param  {Object} criteria
   * @param  {Object} query
   */
  static apply(criteria, query) {
    const { expired, ...basic } = criteria;
    super.apply(basic, query);

    const params = query.parameters;
    const conds = query.conditions;
    if (expired !== undefined) {
      if (expired) {
        conds.push(`NOW() >= etime`);
      } else {
        conds.push(`NOW() < etime`);
      }
    }
  }

  static async import() {
    throw new Error('Cannot write to session');
  }

  static async export() {
    throw new Error('Cannot retrieve session');
  }
}
