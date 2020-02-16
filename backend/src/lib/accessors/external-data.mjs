import _ from 'lodash';
import HTTPError from '../common/errors/http-error.mjs';
import { Data } from './data.mjs';
import * as StoredProcs from '../stored-procs/functions.mjs';

class ExternalData extends Data {
  constructor() {
    super();
    this.columns = {
      ...this.columns,
      external: Array(Object),
      exchange: Array(Object),
      itime: String,
      etime: String,
    };
    this.criteria = {
      ...this.criteria,
      external_object: Object,
    };
    this.eventColumns = {
      ...this.eventColumns,
      external: Array(Object),
      mtime: String,
      itime: String,
      etime: String,
    };
  }

  /**
   * Create table in schema
   *
   * (for reference purpose only)
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
        external jsonb[] NOT NULL DEFAULT '{}',
        exchange jsonb[] NOT NULL DEFAULT '{}',
        itime timestamp,
        etime timestamp,
        PRIMARY KEY (id)
      );
    `;
    await db.execute(sql);
  }

  /**
   * Add conditions to SQL query based on criteria object
   *
   * @param  {Object} criteria
   * @param  {Object} query
   */
  apply(criteria, query) {
    const { external_object: externalObject, ...basic } = criteria;
    super.apply(basic, query);

    const params = query.parameters;
    const conds = query.conditions;
    if (externalObject !== undefined) {
      // use the same function as the database to generate the id strings
      const external = [ externalObject ];
      const serverType = externalObject.type || '';
      if (serverType && !/^\w+$/.test(serverType)) {
        throw new Error(`Invalid type: "${serverType}"`);
      }
      const objectNames = [];
      for (let [ name, object ] of _.entries(externalObject)) {
        if (!/^\w+$/.test(name)) {
          throw new Error(`Invalid property name: "${name}"`);
        }
        if (object.id != null || object.ids instanceof Array) {
          objectNames.push(name);
        }
      }
      const idStrings = StoredProcs.externalIdStrings(external, serverType, objectNames);
      conds.push(`"externalIdStrings"(external, '${serverType}', '{${objectNames}}'::text[]) && $${params.push(idStrings)}`);
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
   * @return {Promise<Object>}
   */
  async export(db, schema, rows, credentials, options) {
    const objects = await super.export(db, schema, rows, credentials, options);
    for (let [ index, object ] of objects.entries()) {
      const row = rows[index];
      if (row.external.length > 0) {
        object.external = row.external;
      }
    }
    return objects;
  }

  /**
   * Attach a trigger to the table that increment the gn (generation number)
   * when a row is updated. Also add triggers that send notification messages.
   *
   * @param  {Database} db
   * @param  {String} schema
   *
   * @return {Promise}
   */
  async createChangeTrigger(db, schema) {
    const table = this.getTableName(schema);
    const sql = `
      DROP TRIGGER IF EXISTS "indicateDataChangeOnUpdate" ON ${table};
      CREATE TRIGGER "indicateDataChangeOnUpdate"
      BEFORE UPDATE ON ${table}
      FOR EACH ROW
      EXECUTE PROCEDURE "indicateDataChangeEx"();
    `;
    await db.execute(sql);
  }

  /**
   * Add triggers that send notification messages, bundled with values of
   * certain columns
   *
   * @param  {Database} db
   * @param  {String} schema
   *
   * @return {Promise}
   */
  async createNotificationTriggers(db, schema) {
    const table = this.getTableName(schema);
    const propNames = _.keys(this.eventColumns);
    const args = _.map(propNames, (propName) => {
      // use quotes just in case the name is mixed case
      return `"${propName}"`;
    }).join(', ');
    const sql = `
      DROP TRIGGER IF EXISTS "notifyDataChangeOnInsert" ON ${table};
      CREATE CONSTRAINT TRIGGER "notifyDataChangeOnInsert"
      AFTER INSERT ON ${table} INITIALLY DEFERRED
      FOR EACH ROW
      EXECUTE PROCEDURE "notifyDataChangeEx"(${args});

      DROP TRIGGER IF EXISTS "notifyDataChangeOnUpdate" ON ${table};
      CREATE CONSTRAINT TRIGGER "notifyDataChangeOnUpdate"
      AFTER UPDATE ON ${table} INITIALLY DEFERRED
      FOR EACH ROW
      EXECUTE PROCEDURE "notifyDataChangeEx"(${args});

      DROP TRIGGER IF EXISTS "notifyDataChangeOnDelete" ON ${table};
      CREATE CONSTRAINT TRIGGER "notifyDataChangeOnDelete"
      AFTER DELETE ON ${table} INITIALLY DEFERRED
      FOR EACH ROW
      EXECUTE PROCEDURE "notifyDataChangeEx"(${args});
    `;
    await db.execute(sql);
  }
}

export {
  ExternalData,
};
