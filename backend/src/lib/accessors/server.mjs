import _ from 'lodash';
import { Data } from './data.mjs';
import { HTTPError } from '../errors.mjs';
import { Task } from './task.mjs';
import { Repo } from './repo.mjs';

export class Server extends Data {
  static schema = 'global';
  static table = 'server';
  static columns = {
    ...Data.columns,
    type: String,
    name: String,
    disabled: Boolean,
    settings: Object,
  };
  static criteria = {
    ...Data.criteria,
    type: String,
    name: String,
    disabled: Boolean,
  };
  static eventColumns = {
    ...Data.eventColumns,
    type: String,
    disabled: Boolean,
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
        name varchar(128) NOT NULL,
        type varchar(64),
        disabled boolean NOT NULL DEFAULT false,
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
    // Auth Manager needs to be able to update a server's OAuth tokens
    const sql = `
      GRANT SELECT, UPDATE ON ${table} TO auth_role;
      GRANT INSERT, SELECT, UPDATE ON ${table} TO admin_role;
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
    // completion of tasks will automatically update details->resources
    await Task.createUpdateTrigger(db, schema, 'updateServer', 'updateResource', [ this.table ]);
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
      object.name = row.name;
      if (credentials.unrestricted || process.env.ADMIN_GUEST_MODE) {
        const sensitiveSettings = [
          'api.access_token',
          'api.refresh_token',
          'oauth.client_secret',
        ];
        object.settings = obscure(row.settings, sensitiveSettings);
        object.disabled = row.disabled;
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
   * @param  {Object} serverReceived
   * @param  {Object} serverBefore
   * @param  {Object} credentials
   * @param  {Object} options
   *
   * @return {Promise<Object>}
   */
  static async importOne(db, schema, serverReceived, serverBefore, credentials, options) {
    const row = await super.importOne(db, schema, serverReceived, serverBefore, credentials, options);
    if (serverReceived.settings instanceof Object) {
      for (let path of sensitiveSettings) {
        // restore the original values if these fields are all x's
        const value = _.get(serverReceived.settings, path);
        if (/^x+$/.test(value)) {
          const originalValue = _.get(serverBefore.settings, path);
          _.set(serverReceived.settings, path, originalValue);
        }
      }
    }
    await this.ensureUniqueName(db, schema, serverBefore, row);
    return row;
  }

  /**
   * Create associations between newly created or modified rows with
   * rows in other tables
   *
   * @param  {Database} db
   * @param  {String} schema
   * @param  {Array<Object>} objects
   * @param  {Array<Object>} originals
   * @param  {Array<Object>} rows
   * @param  {Object} credentials
   *
   * @return {Promise}
   */
   static async associate(db, schema, objects, originals, rows, credentials) {
     const deletedServers = _.filter(rows, (serverAfter, index) => {
       const serverBefore = originals[index];
       if (serverBefore) {
         return serverAfter.deleted && !serverBefore.deleted;
       }
     });
     const undeletedServers = _.filter(rows, (serverAfter, index) => {
       const serverBefore = originals[index];
       if (serverBefore) {
         return !serverAfter.deleted && serverBefore.deleted;
       }
     });
     await Repo.deleteAssociated(db, schema, { server: deletedServers });
     await Repo.restoreAssociated(db, schema, { server: undeletedServers });
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
      // not used in client app
      if (subscription.area === 'admin') {
        return true;
      }
    }
    return false;
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

/**
 * Obscure properties in an object
 *
 * @param  {Object} object
 * @param  {Array<String>} paths
 *
 * @return {Object}
 */
function obscure(object, paths) {
  let clone = _.cloneDeep(object);
  _.each(paths, (path) => {
    let value = _.get(clone, path);
    _.set(clone, path, obscureValue(value));
  });
  return clone;
}

function obscureValue(value) {
  switch (typeof(value)) {
    case 'number': return 0;
    case 'string': return _.repeat('x', value.length);
    case 'boolean': return false;
    case 'object':
      if (value instanceof Array) {
        return _.map(value, obscureValue);
      } else {
        return _.mapValues(value, obscureValue);
      }
  }
}
