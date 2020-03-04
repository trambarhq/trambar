import { Data } from './data.mjs';
import { HTTPError } from '../errors.mjs';
import { Task } from './task.mjs';

export class Picture extends Data {
  static schema = 'global';
  static table = 'picture';
  static columns = {
    ...Data.columns,
    purpose: String,
    user_id: Number,
  };
  static criteria = {
    ...Data.criteria,
    purpose: String,
    user_id: Number,
    url: String,
  };
  static eventColumns = {
    ...Data.eventColumns,
    purpose: String,
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
        purpose varchar(64) NOT NULL,
        user_id int NOT NULL DEFAULT 0,
        PRIMARY KEY (id)
      );
      CREATE INDEX ON ${table} ((details->'url'));
    `;
    await db.execute(sql);
  }

  /**
   * Attach triggers to this table, also add trigger on task so details
   * are updated when tasks complete
   *
   * @param  {Database} db
   * @param  {String} schema
   *
   * @return {Promise}
   */
  static async watch(db, schema) {
    await this.createChangeTrigger(db, schema);
    await this.createNotificationTriggers(db, schema);
    await this.createResourceCoalescenceTrigger(db, schema, []);
    await Task.createUpdateTrigger(db, schema, 'updatePicture', 'updateResource', [ this.table ]);
  }

  /**
   * Add conditions to SQL query based on criteria object
   *
   * @param  {Object} criteria
   * @param  {Object} query
   */
  static apply(criteria, query) {
    const { url, ...basic } = criteria;
    super.apply(basic, query);

    const params = query.parameters;
    const conds = query.conditions;
    if (url !== undefined) {
      conds.push(`details->>'url' = $${params.push(url)}`);
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
      object.purpose = row.purpose;
      object.user_id = row.user_id;
    }
    return objects;
  }

  /**
   * Throw an exception if modifications aren't permitted
   *
   * @param  {Object} pictureReceived
   * @param  {Object} pictureBefore
   * @param  {Object} credentials
   */
  static checkWritePermission(pictureReceived, pictureBefore, credentials) {
    if (credentials.unrestricted) {
      return;
    }
    throw new HTTPError(403);
  }
}
