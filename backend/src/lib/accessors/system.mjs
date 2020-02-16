import _ from 'lodash';
import HTTPError from '../common/errors/http-error.mjs';
import { Data } from './data.mjs';
import Task from './task.mjs';

class System extends Data {
  constructor() {
    super();
    this.schema = 'global';
    this.table = 'system';
    this.columns = {
      ...this.columns,
      settings: Object,
    };
    this.eventColumns = {
      ...this.eventColumns,
      settings: Object,
    };
  }

  /**
   * Create table in schema
   *
   * @param  {Database} db
   * @param  {String} schema
   *
   * @return {Promise}
   */
  async create(db, schema) {
    const table = this.getTableName(schema);
    const sql = `
      CREATE TABLE ${table} (
        id serial,
        gn int NOT NULL DEFAULT 1,
        deleted boolean NOT NULL DEFAULT false,
        ctime timestamp NOT NULL DEFAULT NOW(),
        mtime timestamp NOT NULL DEFAULT NOW(),
        details jsonb NOT NULL DEFAULT '{}',
        settings jsonb NOT NULL DEFAULT '{}',
        PRIMARY KEY (id)
      );
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
  async grant(db, schema) {
    const table = this.getTableName(schema);
    const sql = `
      GRANT SELECT ON ${table} TO auth_role;
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
  async watch(db, schema) {
    await this.createChangeTrigger(db, schema);
    // we need to know the previous settings when address changes, in
    // order to remove hook created previously
    await this.createNotificationTriggers(db, schema);
    await this.createResourceCoalescenceTrigger(db, schema, []);
    // completion of tasks will automatically update details->resources
    await Task.createUpdateTrigger(db, schema, 'updateSystem', 'updateResource', [ this.table ]);
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
  async export(db, schema, rows, credentials, options) {
    const objects = await super.export(db, schema, rows, credentials, options);
    for (let [ index, object] of objects.entries()) {
      const row = rows[index];
      if (credentials.unrestricted) {
        object.settings = row.settings;
      } else {
        object.settings = _.pick(row.settings, [
          'address',
          'push_relay',
        ]);
      }
    }
    return objects;
  }

  /**
   * Throw an exception if modifications aren't permitted
   *
   * @param  {Object} systemReceived
   * @param  {Object} systemBefore
   * @param  {Object} credentials
   */
  checkWritePermission(systemReceived, systemBefore, credentials) {
    if (credentials.unrestricted) {
      return;
    }
    throw new HTTPError(403);
  }
}

const instance = new System;

export {
  instance as default,
  System,
};
