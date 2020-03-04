import { Data } from './data.mjs';
import { Project } from './project.mjs';
import { HTTPError } from '../errors.mjs';
import { getUserAccessLevel } from '../project-utils.mjs';

export class Subscription extends Data {
  static schema = 'global';
  static table = 'subscription';
  static columns = {
    ...Data.columns,
    user_id: Number,
    area: String,
    method: String,
    relay: String,
    token: String,
    schema: String,
    locale: String,
  };
  static criteria = {
    ...Data.criteria,
    user_id: Number,
    area: String,
    method: String,
    relay: String,
    token: String,
    schema: String,
  };
  static eventColumns = {
    ...Data.eventColumns,
    user_id: Number,
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
        user_id int NOT NULL,
        area varchar(32) NOT NULL,
        method varchar(32) NOT NULL,
        relay varchar(256),
        token varchar(64) NOT NULL,
        schema varchar(256) NOT NULL,
        locale varchar(16) NOT NULL,
        PRIMARY KEY (id)
      );
      CREATE INDEX ON ${table} (token);
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
      object.user_id = row.user_id;
      object.area = row.area;
      object.method = row.method;
      object.token = row.token;
      object.relay = row.relay;
      object.schema = row.schema;
      object.locale = row.locale;

      if (row.user_id !== credentials.user.id) {
        throw new HTTPError(403);
      }
    }
    return objects;
  }

  /**
   * Import object sent by client-side code, applying access control
   *
   * @param  {Database} db
   * @param  {String} schema
   * @param  {Object} subscriptionReceived
   * @param  {Object} subscriptionBefore
   * @param  {Object} credentials
   * @param  {Object} options
   *
   * @return {Promise<Array>}
   */
  static async importOne(db, schema, subscriptionReceived, subscriptionBefore, credentials, options) {
    const row = await super.importOne(db, schema, subscriptionReceived, subscriptionBefore, credentials, options);
    if (subscriptionBefore && subscriptionBefore.deleted) {
      // restore it
      row.deleted = false;
    }
    if (subscriptionReceived.schema !== 'global' && subscriptionReceived.schema !== '*') {
      // don't allow user to subscribe to a project that he has no access to
      const criteria = {
        name: subscriptionReceived.schema,
        deleted: false,
      };
      const project = await Project.findOne(db, schema, criteria, 'user_ids, settings');
      const access = getUserAccessLevel(project, credentials.user);
      if (!access) {
        throw new HTTPError(400);
      }
    }
    return row;
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
      // subscriptions aren't read by client app
      if (subscription.area === 'admin') {
        return true;
      }
    }
    return false;
  }

  /**
   * Throw an exception if modifications aren't permitted
   *
   * @param  {Object} subscriptionReceived
   * @param  {Object} subscriptionBefore
   * @param  {Object} credentials
   */
  static checkWritePermission(subscriptionReceived, subscriptionBefore, credentials) {
    if (subscriptionReceived.area !== credentials.area) {
      throw new HTTPError(400);
    }
    // don't allow non-admin to monitor all schemas
    if (subscriptionReceived.schema === '*') {
      if (credentials.area !== 'admin') {
        throw new HTTPError(403);
      }
    }
  }
}
