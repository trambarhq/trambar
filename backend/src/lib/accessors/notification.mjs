import _ from 'lodash';
import { HTTPError } from '../errors.mjs';
import { Data } from './data.mjs';

export class Notification extends Data {
  static schema = 'both';
  static table = 'notification';
  static columns = {
    ...Data.columns,
    type: String,
    story_id: Number,
    reaction_id: Number,
    user_id: Number,
    target_user_id: Number,
    seen: Boolean,
    suppressed: Boolean,
  };
  static criteria = {
    ...Data.criteria,
    type: String,
    story_id: Number,
    reaction_id: Number,
    user_id: Number,
    target_user_id: Number,
    seen: Boolean,
    suppressed: Boolean,

    time_range: String,
    newer_than: String,
    older_than: String,
  };
  static eventColumns = {
    ...Data.eventColumns,
    type: String,
    story_id: Number,
    reaction_id: Number,
    user_id: Number,
    target_user_id: Number,
    seen: Boolean,
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
        type varchar(32) NOT NULL,
        story_id int NOT NULL DEFAULT 0,
        reaction_id int NOT NULL DEFAULT 0,
        user_id int NOT NULL DEFAULT 0,
        target_user_id int NOT NULL,
        seen boolean NOT NULL DEFAULT false,
        suppressed boolean NOT NULL DEFAULT false,
        PRIMARY KEY (id)
      );
      CREATE INDEX ON ${table} (target_user_id) WHERE deleted = false;
      CREATE INDEX ON ${table} (id) WHERE seen = false AND deleted = false;
    `;
    await db.execute(sql);
  }

  /**
   * Upgrade table in schema to given DB version (from one version prior)
   *
   * @param  {Database} db
   * @param  {String} schema
   * @param  {Number} version
   *
   * @return {Promise}
   */
  static async upgrade(db, schema, version) {
    if (version === 2) {
      // adding: suppressed
      const table = this.getTableName(schema);
      const sql = `
        ALTER TABLE ${table}
        ADD COLUMN IF NOT EXISTS
        suppressed boolean NOT NULL DEFAULT false;
      `;
      await db.execute(sql);
      return true;
    }
    return false;
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
   *
   * @return {Promise}
   */
  static apply(criteria, query) {
    const { time_range, newer_than, older_than, search, ...basic } = criteria;
    super.apply(basic, query);

    const params = query.parameters;
    const conds = query.conditions;
    if (time_range !== undefined) {
      conds.push(`ctime <@ $${params.push(time_range)}::tsrange`);
    }
    if (newer_than !== undefined) {
      conds.push(`ctime > $${params.push(newer_than)}`);
    }
    if (older_than !== undefined) {
      conds.push(`ctime < $${params.push(older_than)}`);
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
      object.ctime = row.ctime;
      object.type = row.type;
      object.details = row.details;
      object.seen = row.seen;
      if (row.story_id) {
        object.story_id = row.story_id;
      }
      if (row.reaction_id) {
        object.reaction_id = row.reaction_id;
      }
      if (row.user_id) {
        object.user_id = row.user_id;
      }
      object.target_user_id = row.target_user_id;
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
      if (event.current.target_user_id === user.id) {
        return true;
      }
    }
    return false;
  }

  /**
   * Throw an exception if modifications aren't permitted
   *
   * @param  {Object} notificationReceived
   * @param  {Object} notificationBefore
   * @param  {Object} credentials
   */
  static checkWritePermission(notificationReceived, notificationBefore, credentials) {
    if (notificationBefore.target_user_id !== credentials.user.id) {
      // can't modify an object that doesn't belong to the user
      throw new HTTPError(400);
    }
  }

  /**
   * Mark notifications associated with stories or reactions as deleted
   *
   * @param  {Database} db
   * @param  {String} schema
   * @param  {Object} associations
   *
   * @return {Promise}
   */
  static async deleteAssociated(db, schema, associations) {
    for (let [ type, objects ] of _.entries(associations)) {
      if (_.isEmpty(objects)) {
        continue;
      }
      if (type === 'story') {
        const criteria = {
          story_id: _.map(objects, 'id'),
          deleted: false,
        };
        await this.updateMatching(db, schema, criteria, { deleted: true });
      } else if (type === 'reaction') {
        const criteria = {
          reaction_id: _.map(objects, 'id'),
          deleted: false,
        };
        await this.updateMatching(db, schema, criteria, { deleted: true });
      }
    }
  }

  /**
   * Mark notifications associated with stories or reactions as deleted
   *
   * @param  {Database} db
   * @param  {String} schema
   * @param  {Object} associations
   *
   * @return {Promise}
   */
  static async restoreAssociated(db, schema, associations) {
    for (let [ type, objects ] of _.entries(associations)) {
      if (_.isEmpty(objects)) {
        return;
      }
      if (type === 'story') {
        const criteria = {
          story_id: _.map(objects, 'id'),
          deleted: true,
          suppressed: false,
        };
        await this.updateMatching(db, schema, criteria, { deleted: false });
      } else if (type === 'reaction') {
        const criteria = {
          reaction_id: _.map(objects, 'id'),
          deleted: true,
          suppressed: false,
        };
        await this.updateMatching(db, schema, criteria, { deleted: false });
      }
    }
  }
}
