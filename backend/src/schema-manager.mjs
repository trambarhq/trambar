import _ from 'lodash';
import Bluebird from 'bluebird';
import Moment from 'moment';
import Crypto from 'crypto'; Bluebird.promisifyAll(Crypto);
import { Database } from './lib/database.mjs';
import { TaskLog } from './lib/task-log.mjs';
import { getAccessors } from './lib/schema-manager/accessors.mjs';
import { onShutdown } from './lib/shutdown.mjs';

import { Project } from './lib/accessors/project.mjs';
import { Reaction } from './lib/accessors/reaction.mjs';
import { Story } from './lib/accessors/story.mjs';
import { Spreadsheet } from './lib/accessors/spreadsheet.mjs';
import { Wiki } from './lib/accessors/wiki.mjs';

import { TaskQueue } from './lib/task-queue.mjs';
import {
  PeriodicTaskClearMessageQueue,
  PeriodicTaskCollectGarbage,
  PeriodicTaskReportSchemaSize,
} from './lib/schema-manager/tasks.mjs';

let database;
let taskQueue;

const roles = [
  {
    name: 'auth_role',
    password: process.env.DATABASE_AUTH_PASSWORD,
    schemas: [ 'global' ],
  },
  {
    name: 'admin_role',
    password: process.env.DATABASE_ADMIN_PASSWORD,
    schemas: [ 'global', 'project' ],
  },
  {
    name: 'client_role',
    password: process.env.DATABASE_CLIENT_PASSWORD,
    schemas: [ 'global', 'project' ],
  },
];

async function start() {
  const initDB = await Database.open(true);
  await initDB.updateJavaScriptRuntime();
  initDB.close();

  // reconnect, since the runtime might be different
  const db = database = await Database.open(true);
  await db.updateJavaScriptFunctions();
  let created = await initializeDatabase(db);
  if (!created) {
    await upgradeDatabase(db);
  }
  const tables = [
    'project',
    'story',
    'reaction',
    'wiki',
    'spreadsheet'
  ];
  await db.listen(tables, 'change', handleDatabaseChanges, 0);

  if (process.env.NODE_ENV !== 'production') {
    // listen for console messages from stored procs
    const f = function(method, evts) {
      for (let args in evts) {
        console[method].apply(console, args);
      }
    };
    const tbl = [ 'console' ];
    await db.listen(tbl, 'info', (evts) => { f('info', evts) }, 0);
    await db.listen(tbl, 'log', (evts) => { f('log', evts) }, 0);
    await db.listen(tbl, 'warn', (evts) => { f('warn', evts) }, 0);
    await db.listen(tbl, 'error', (evts) => { f('error', evts) }, 0);
    await db.listen(tbl, 'debug', (evts) => { f('debug', evts) }, 0);
  }

  taskQueue = new TaskQueue;
  taskQueue.schedule(new PeriodicTaskClearMessageQueue);
  taskQueue.schedule(new PeriodicTaskCollectGarbage);
  taskQueue.schedule(new PeriodicTaskReportSchemaSize);
  await taskQueue.start();
}

async function stop() {
  if (taskQueue) {
    await taskQueue.stop();
    taskQueue = undefined;
  }
  if (database) {
    database.close();
    database = null;
  }
};

async function handleDatabaseChanges(events) {
  let db = this;
  for (let event of events) {
    if (event.table === 'project') {
      let defaultName = `$nameless$-project-${event.id}`;
      let deletedName = `$recycled$-project-${event.id}`;
      if (event.op === 'INSERT') {
        // create the schema if the row is insert
        let name = event.current.name || defaultName;
        if (event.current.deleted) {
          // shouldn't happen, but just in case
          name = deletedName;
        }
        await createSchema(db, name);
      } else if (event.op === 'UPDATE') {
        if (event.diff.deleted) {
          if (event.current.deleted) {
            // rename the schema when project is flagged as deleted
            let normalName = event.previous.name || event.current.name || defaultName;
            await renameSchema(db, normalName, deletedName);
          } else {
            // restore it when project is undeleted
            let normalName = event.current.name || defaultName;
            await renameSchema(db, deletedName, normalName);
          }
        } else if (event.diff.name) {
          // change the schema name to match the project name
          let nameBefore = event.previous.name || defaultName;
          let nameAfter = event.current.name || defaultName;
          await renameSchema(db, nameBefore, nameAfter);
        }
      } else if (event.op === 'DELETE') {
        // remove schema when project is deleted
        let name = event.previous.name || defaultName;
        if (event.previous.deleted) {
          name = deletedName;
        }
        await deleteSchema(db, name);
      }
    } else {
      if (event.diff.language_codes) {
        if (event.op === 'INSERT' || event.op === 'UPDATE') {
          // see if new languages are introduced
          const languagesBefore = event.previous.language_codes;
          const languagesAfter = event.current.language_codes;
          const newLanguages = _.difference(languagesAfter, languagesBefore);
          if (!_.isEmpty(newLanguages)) {
            await addSearchIndices(db, event.schema, event.table, newLanguages);
          }
        }
      }
    }
  }
}

/**
 * Added language-specific search indices to table
 *
 * @param  {Database} db
 * @param  {String} schema
 * @param  {String} table
 * @param  {languages} Array<String>
 *
 * @return {Promise<Boolean>}
 */
async function addSearchIndices(db, schema, table, languages) {
  const taskLog = TaskLog.start('search-indices-add', { schema });
  try {
    cosnt accessors = getAccessors(schema);
    const accessor = _.find(accessors, { table });
    // make sure we have indices for these languages
    const existing = await accessor.getTextSearchLanguages(db, schema);
    // take out the ones we have already
    const newLanguages = _.difference(languages, existing);
    // cap number of indices at 4
    if (existing.length + newLanguages.length > 4) {
      if (existing.length < 4) {
        newLanguages.splice(4 - existing.length);
      } else {
        newLanguages.splice(0);
      }
    }
    if (!_.isEmpty(newLanguages)) {
      await accessor.addTextSearchLanguages(db, schema, newLanguages);
      taskLog.set('existing', existing);
      taskLog.set('added', newLanguages);
    }
    await taskLog.finish();
  } catch (err) {
    await taskLog.abort(err);
  }
}

/**
 * Create global schema if it doesn't already exists
 *
 * @param  {Database} db
 *
 * @return {Promise<Boolean>}
 */
async function initializeDatabase(db) {
  await addDatabaseRoles(db);
  let exists = await db.schemaExists('global');
  if (!exists) {
    await createSchema(db, 'global');
    await createMessageQueue(db);
    return true;
  } else {
    return false;
  }
}

/**
 * Added database roles
 *
 * @param {Database} db
 */
async function addDatabaseRoles(db) {
  let changed = false;
  for (let role of roles) {
    let exists = await db.roleExists(role.name);
    if (!exists) {
      let sql = `CREATE USER ${role.name} WITH PASSWORD '${role.password}'`;
      await db.execute(sql);
      changed = true;
    }
  }
  return changed;
}

/**
 * Upgrade global and project-specific schemas if necessary
 *
 * @param  {Database} db
 *
 * @return {Promise<Boolean>}
 */
async function upgradeDatabase(db) {
  const globalChanged = await upgradeSchema(db, 'global');
  const projectChanged = {};
  const projects = await Project.find(db, 'global', { deleted: false }, 'name');
  for (let project of projects) {
    const schema = project.name;
    projectChanged[schema] = await upgradeSchema(db, schema);
  }
  return globalChanged || _.some(projectChanged);
}

/**
 * Upgrade schema if necessary
 *
 * @param  {Database} db
 * @param  {String} schema
 *
 * @return {Promise<Boolean>}
 */
async function upgradeSchema(db, schema) {
  const accessors = getAccessors(schema);
  const currentVersion = await getSchemaVersion(db, schema);
  const latestVersion = _.max(_.map(accessors, 'version'));
  if (currentVersion >= latestVersion) {
    return false;
  }
  const jumps = _.range(currentVersion, latestVersion);
  const taskLog = TaskLog.start('schema-upgrade', { schema });
  try {
    await db.begin();
    for (let version of jumps) {
      taskLog.describe(`upgrading from version ${version} to ${version + 1}`);
      for (let accessor of accessors) {
        await accessor.upgrade(db, schema, version + 1);
      }
      taskLog.append('applied', `${version} -> ${version + 1}`);
    }
    taskLog.describe(`recreating triggers`);
    for (let accessor of accessors) {
      await accessor.watch(db, schema);
    }
    await setSchemaVersion(db, schema, latestVersion);
    await db.commit()
    await taskLog.finish();
    return true;
  } catch (err) {
    await db.rollback();
    await taskLog.abort(err);
    return false;
  }
}

/**
 * Create either a project-specific schema or the global schema
 *
 * @param  {Database} db
 * @param  {String} schema
 *
 * @return {Promise<Boolean>}
 */
async function createSchema(db, schema) {
  const taskLog = TaskLog.start('schema-create', { schema });
  try {
    await db.begin();

    taskLog.describe(`creating schema`);
    const sql = `CREATE SCHEMA "${schema}"`;
    await db.execute(sql);

    // grant usage right and right to all sequences to each role
    for (let role of roles) {
      const schemaType = (schema === 'global') ? 'global' : 'project';
      if (_.includes(role.schemas, schemaType)) {
        const sql = `
          GRANT USAGE ON SCHEMA "${schema}" TO "${role.name}";
          ALTER DEFAULT PRIVILEGES IN SCHEMA "${schema}" GRANT USAGE, SELECT ON SEQUENCES TO "${role.name}";
        `;
        await db.execute(sql);
        taskLog.append('granted', role.name);
      }
    }

    taskLog.describe(`creating tables`);
    const accessors = Accessors.get(schema);
    for (let accessor of accessors) {
      await accessor.create(db, schema);
      taskLog.append('created', accessor.table);
    }
    // grant access
    for (let accessor of accessors) {
      await accessor.grant(db, schema);
    }
    // add triggers
    for (let accessor of accessors) {
      await accessor.watch(db, schema);
    }

    // add version number
    const latestVersion = _.max(_.map(accessors, 'version')) || 0;
    await addSchemaVersion(db, schema, latestVersion);
    taskLog.set('version', latestVersion);

    await db.commit()
    await taskLog.finish();
    return true;
  } catch (err) {
    await db.rollback();
    await taskLog.abort(err);
    throw err;
  }
}

/**
 * Drop a schema
 *
 * @param  {Database} db
 * @param  {String} schemaBefore
 * @param  {String} schemaAfter
 *
 * @return {Promise<Boolean>}
 */
async function deleteSchema(db, schema) {
  const taskLog = TaskLog.start('schema-delete', { schema });
  try {
    taskLog.describe('deleting schema');
    const size = await db.getSchemaSize(schema);
    const sql = `DROP SCHEMA "${schema}" CASCADE`;
    await db.execute(sql);
    taskLog.set('size', size, 'byte');
    await taskLog.finish();
    return true;
  } catch (err) {
    await taskLog.abort(err);
    return false;
  }
}

/**
 * Rename a schema
 *
 * @param  {Database} db
 * @param  {String} schemaBefore
 * @param  {String} schemaAfter
 *
 * @return {Promise<Boolean>}
 */
async function renameSchema(db, schemaBefore, schemaAfter) {
  const taskLog = TaskLog.start('schema-rename', { schema: schemaBefore });
  try {
    taskLog.describe('renaming schema');
    const sql = `ALTER SCHEMA "${schemaBefore}" RENAME TO "${schemaAfter}"`;
    await db.execute(sql);
    taskLog.set('name', schemaAfter);
    await taskLog.finish();
    return true;
  } catch (err) {
    await taskLog.abort(err);
    return false;
  }
}

/**
 * Return version number of database schema from meta table
 *
 * @param  {Database} db
 * @param  {String} schema
 *
 * @return {Number}
 */
async function getSchemaVersion(db, schema) {
  const table = `"${schema}"."meta"`;
  const sql = `SELECT version FROM ${table}`;
  const [ row ] = await db.query(sql);
  return (row) ? row.version : -1;
}

/**
 * Create meta table and insert row with version number
 *
 * @param {Database} db
 * @param {String} schema
 * @param {Number} version
 *
 * @return {Promise}
 */
async function addSchemaVersion(db, schema, version) {
  let roleNames = _.map(roles, 'name');
  let table = `"${schema}"."meta"`;
  let sql1 = `
    CREATE TABLE ${table} (
      version int,
      signature varchar(64)
    );
    GRANT SELECT ON ${table} TO ${roleNames.join(', ')};
  `;
  await db.execute(sql1);
  let buffer = await Crypto.randomBytesAsync(16);
  let signature = buffer.toString('hex');
  let sql2 = `INSERT INTO ${table} (version, signature) VALUES ($1, $2)`;
  await db.execute(sql2, [ version, signature ]);
}

/**
 * Update meta table with version number
 *
 * @param {Database} db
 * @param {String} schema
 * @param {Number} version
 *
 * @return {Promise}
 */
async function setSchemaVersion(db, schema, version) {
  let table = `"${schema}"."meta"`;
  let sql = `UPDATE ${table} SET version = $1`;
  await db.execute(sql, [ version ]);
}

/**
 * Create message_queue table for oversized change notification
 *
 * @param  {Database} db
 *
 * @return {Promise<Boolean>}
 */
async function createMessageQueue(db) {
  let roleNames = _.map(roles, 'name');
  let sql = `
    CREATE TABLE IF NOT EXISTS "message_queue" (
      id serial,
      message jsonb NOT NULL,
      ctime timestamp NOT NULL DEFAULT NOW(),
      PRIMARY KEY (id)
    );
    GRANT SELECT, INSERT ON "message_queue" TO ${roleNames.join(', ')};
    GRANT USAGE, SELECT ON message_queue_id_seq TO ${roleNames.join(', ')};
  `;
  await db.execute(sql);
  return true;
}

if ('file://' + process.argv[1] === import.meta.url) {
  start();
  onShutdown(stop);
}

export {
  start,
  stop,
  createSchema,
  deleteSchema,
  renameSchema,
};
