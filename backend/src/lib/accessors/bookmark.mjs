import _ from 'lodash';
import HTTPError from '../common/errors/http-error.mjs';
import { Data } from './data.mjs';

class Bookmark extends Data {
  constructor() {
    super();
    this.schema = 'project';
    this.table = 'bookmark';
    this.columns = {
      ...this.columns,
      story_id: Number,
      user_ids: Array(Number),
      target_user_id: Number,
      hidden: Boolean,
      suppressed: Boolean,
    };
    this.criteria = {
      ...this.criteria,
      story_id: Number,
      user_ids: Array(Number),
      target_user_id: Number,
      hidden: Boolean,
      suppressed: Boolean,
    };
    this.eventColumns = {
      ...this.eventColumns,
      story_id: Number,
      user_ids: Array(Number),
      target_user_id: Number,
      hidden: Boolean,
    };
    this.version = 2;
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
        story_id int NOT NULL,
        user_ids int[] NOT NULL,
        target_user_id int NOT NULL,
        hidden boolean NOT NULL DEFAULT false,
        public boolean NOT NULL DEFAULT false,
        suppressed boolean NOT NULL DEFAULT false,
        PRIMARY KEY (id)
      );
      CREATE INDEX ON ${table} (story_id) WHERE deleted = false;
      CREATE INDEX ON ${table} (target_user_id) WHERE deleted = false;
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
   * @return {Promise<Boolean>}
   */
  async upgrade(db, schema, version) {
    if (version === 2) {
      // adding: hidden, suppressed
      const table = this.getTableName(schema);
      const sql = `
        ALTER TABLE ${table}
        ADD COLUMN IF NOT EXISTS
        hidden boolean NOT NULL DEFAULT false;
        ALTER TABLE ${table}
        ADD COLUMN IF NOT EXISTS
        suppressed boolean NOT NULL DEFAULT false;
      `;
      await db.execute(sql)
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
  async watch(db, schema) {
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
  async export(db, schema, rows, credentials, options) {
    const objects = await super.export(db, schema, rows, credentials, options);
    for (let [ index, object ] of objects.entries()) {
      const row = rows[index];
      object.story_id = row.story_id;
      object.user_ids = row.user_ids;
      object.target_user_id = row.target_user_id;
      object.hidden = row.hidden;
    }
    return objects;
  }

  /**
   * Import objects sent by client-side code, applying access control
   *
   * @param  {Database} db
   * @param  {String} schema
   * @param  {Object} bookmarkReceived
   * @param  {Object} bookmarkBefore
   * @param  {Object} credentials
   * @param  {Object} options
   *
   * @return {Promise<Object>}
   */
  async importOne(db, schema, bookmarkReceived, bookmarkBefore, credentials, options) {
    const row = await super.importOne(db, schema, bookmarkReceived, bookmarkBefore, credentials);
    if (bookmarkBefore) {
      if (bookmarkReceived.deleted) {
        // remove the current user id from list of senders
        // delete the bookmark only if no one else is
        const senderIDs = _.without(bookmarkBefore.user_ids, credentials.user.id);
        row.user_ids = senderIDs;
        row.deleted = _.isEmpty(senderIDs);
        row.suppressed = _.isEmpty(senderIDs);
      }
    } else {
      // see if there's a existing bookmark already
      const criteria = {
        story_id: bookmarkReceived.story_id,
        target_user_id: bookmarkReceived.target_user_id,
        deleted: false,
      };
      const existingRow = await this.findOne(db, schema, criteria, 'id, user_ids, hidden');
      if (existingRow) {
        // add the user to the list
        existingRow.user_ids = _.union(existingRow.user_ids, bookmarkReceived.user_ids);
        if (existingRow.hidden) {
          if (bookmarkReceived.target_user_id === credentials.user.id) {
            // reset the hidden flag if it's the target user himself
            // recreating the bookmark
            existingRow.hidden = false;
          }
        }
        row = existingRow;
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
  isRelevantTo(event, user, subscription) {
    if (subscription.area === 'admin') {
      // admin console doesn't use this object currently
      return false;
    }
    if (super.isRelevantTo(event, user, subscription)) {
      if (event.current.target_user_id === user.id) {
        return true;
      }
      if (_.includes(event.current.user_ids, user.id)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Throw an exception if modifications aren't permitted
   *
   * @param  {Object} bookmarkReceived
   * @param  {Object} bookmarkBefore
   * @param  {Object} credentials
   */
  checkWritePermission(bookmarkReceived, bookmarkBefore, credentials) {
    if (bookmarkBefore) {
      // the only operation permitted is the removal of the bookmark
      if (bookmarkReceived.deleted) {
        // deleting a bookmark sent to someone else
        // current user must be among the senders
        if (!_.includes(bookmarkBefore.user_ids, credentials.user.id)) {
          throw new HTTPError(400);
        }
      } else if (bookmarkReceived.hidden) {
        // only the target user can hide a bookmark
        if (bookmarkBefore.target_user_id !== credentials.user.id) {
          throw new HTTPError(400);
        }
      } else {
        throw new HTTPError(400);
      }
    } else {
      // must be the current user
      if (!_.isEqual(bookmarkReceived.user_ids, [ credentials.user.id ])) {
        throw new HTTPError(400);
      }
      // can't create bookmarks to nothing
      if (!bookmarkReceived.story_id || !bookmarkReceived.target_user_id) {
        throw new HTTPError(400);
      }
    }
  }

  /**
   * Mark bookmarks associated with stories as deleted
   *
   * @param  {Database} db
   * @param  {String} schema
   * @param  {Object} associations
   *
   * @return {Promise}
   */
  async deleteAssociated(db, schema, associations) {
    for (let [ type, objects ] of _.entries(associations)) {
      if (_.isEmpty(objects)) {
        continue;
      }
      if (type === 'story') {
        const storyIDs = _.map(objects, 'id');
        const criteria = {
          story_id: storyIDs,
          deleted: false,
          suppressed: false,
        };
        await this.updateMatching(db, schema, criteria, { deleted: true });
      }
    }
  }

  /**
   * Clear deleted flag of bookmarks to specified stories
   *
   * @param  {Database} db
   * @param  {String} schema
   * @param  {Object} associations
   *
   * @return {Promise}
   */
  async restoreAssociated(db, schema, associations) {
    for (let [ type, objects ] of _.entries(associations)) {
      if (_.isEmpty(objects)) {
        continue;
      }
      if (type === 'story') {
        const storyIds = _.map(objects, 'id');
        const criteria = {
          story_id: storyIds,
          deleted: true,
          // don't restore bookmarks that were manually deleted
          suppressed: false,
        };
        await this.updateMatching(db, schema, criteria, { deleted: false });
      }
    }
  }
}

const instance = new Bookmark;

export {
  instance as default,
  Bookmark,
};
