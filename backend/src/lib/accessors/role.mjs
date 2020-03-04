import { HTTPError } from '../errors.mjs';
import { ExternalData } from './external-data.mjs';
import { Task } from './task.mjs';

export class Role extends ExternalData {
  static schema = 'global';
  static table = 'role';
  static columns = {
    ...ExternalData.columns,
    name: String,
    disabled: Boolean,
    general: Boolean,
    settings: Object,
  };
  static criteria = {
    ...ExternalData.criteria,
    name: String,
    disabled: Boolean,
    general: Boolean,
  };
  static eventColumns = {
    ...ExternalData.eventColumns,
    disabled: Boolean,
    general: Boolean,
  };

  /**
   * Create table in schema
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
        name varchar(128) NOT NULL DEFAULT '',
        disabled boolean NOT NULL DEFAULT false,
        general boolean NOT NULL DEFAULT true,
        external jsonb[] NOT NULL DEFAULT '{}',
        exchange jsonb[] NOT NULL DEFAULT '{}',
        itime timestamp,
        etime timestamp,
        settings jsonb NOT NULL DEFAULT '{}',
        PRIMARY KEY (id)
      );
      CREATE UNIQUE INDEX ON ${table} (name) WHERE deleted = false;
    `;
    await db.execute(sql);
  }

  /**
   * Grant privileges to table to appropriate Postgres users
   *
   * @param  {Database} db
   * @param  {String} schema
   *
   * @return {Promise}
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
   * @param  {String} schema
   *
   * @return {Promise}
   */
  static async watch(db, schema) {
    await this.createChangeTrigger(db, schema);
    await this.createNotificationTriggers(db, schema);
    await Task.createUpdateTrigger(db, schema, 'updateRole', 'updateResource', [ this.table ]);
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
      object.name = row.name;

      if (credentials.unrestricted) {
        object.disabled = row.disabled;
        object.settings = row.settings;
      } else {
        if (row.disabled) {
          object.disabled = row.disabled;
        }
      }
    }
    return objects;
  }

  /**
   * Import object sent by client-side code
   *
   * @param  {Database} db
   * @param  {String} schema
   * @param  {Object} roleReceived
   * @param  {Object} roleBefore
   * @param  {Object} credentials
   * @param  {Object} options
   *
   * @return {Promise<Object>}
   */
  static async importOne(db, schema, roleReceived, roleBefore, credentials, options) {
    const row = await super.importOne(db, schema, roleReceived, roleBefore, credentials, options);
    await this.ensureUniqueName(db, schema, roleBefore, roleReceived);
    return row;
  }

  /**
   * Throw an exception if modifications aren't permitted
   *
   * @param  {Object} roleReceived
   * @param  {Object} roleBefore
   * @param  {Object} credentials
   */
  static checkWritePermission(roleReceived, roleBefore, credentials) {
    if (credentials.unrestricted) {
      return;
    }
    throw new HTTPError(403);
  }
}
