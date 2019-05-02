import _ from 'lodash';
import Bluebird from 'bluebird';
import Moment from 'moment';
import Crypto from 'crypto'; Bluebird.promisifyAll(Crypto);
import Database from 'database';
import * as Shutdown from 'shutdown';

// global accessors
import Commit from 'accessors/commit';
import Device from 'accessors/device';
import Frontend from 'accessors/frontend'
import Picture from 'accessors/picture';
import Project from 'accessors/project';
import Repo from 'accessors/repo';
import Role from 'accessors/role';
import Server from 'accessors/server';
import Session from 'accessors/session';
import Skin from 'accessors/skin';
import Subscription from 'accessors/subscription';
import System from 'accessors/system';
import User from 'accessors/user';

// project accessors
import Bookmark from 'accessors/bookmark';
import Listing from 'accessors/listing';
import Reaction from 'accessors/reaction';
import Spreadsheet from 'accessors/spreadsheet';
import Statistics from 'accessors/statistics';
import Story from 'accessors/story';
import Website from 'accessors/website';
import Wiki from 'accessors/wiki';

// appear in both
import Notification from 'accessors/notification';
import Task from 'accessors/task';

let database;
let messageQueueInterval;
let garbageCollectionInterval;

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
    let db = await Database.open(true);
    await db.updateJavaScriptRuntime();

    // reconnect, since the runtime might be different
    db.close();
    db = database = await Database.open(true);
    await db.updateJavaScriptFunctions();
    const created = await initializeDatabase(db);
    if (!created) {
        await upgradeDatabase(db);
    }
    const tables = [
        'project',
        'story',
        'reaction',
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

    messageQueueInterval = setInterval(() => {
        if (database) {
            cleanMessageQueue(database);
        }
    }, 5 * 60 * 1000);
    garbageCollectionInterval = setInterval(() => {
        if (database) {
            collectGarbage(database);
        }
    }, 10 * 60 * 1000);
}

async function stop() {
    clearInterval(messageQueueInterval);
    clearInterval(garbageCollectionInterval);
    if (database) {
        database.close();
        database = null;
    }
};

async function handleDatabaseChanges(events) {
    const db = this;
    for (let event of events) {
        try {
            if (event.table === 'project') {
                const defaultName = `$nameless$-project-${event.id}`;
                const deletedName = `$recycled$-project-${event.id}`;
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
                            const normalName = event.previous.name || event.current.name || defaultName;
                            await renameSchema(db, normalName, deletedName);
                        } else {
                            // restore it when project is undeleted
                            const normalName = event.current.name || defaultName;
                            await renameSchema(db, deletedName, normalName);
                        }
                    } else if (event.diff.name) {
                        // change the schema name to match the project name
                        const nameBefore = event.previous.name || defaultName;
                        const nameAfter = event.current.name || defaultName;
                        await renameSchema(db, nameBefore, nameAfter);
                    }
                } else if (event.op === 'DELETE') {
                    // remove schema when project is deleted
                    const name = event.previous.name || defaultName;
                    if (event.previous.deleted) {
                        name = deletedName;
                    }
                    await deleteSchema(db, name);
                }
            } else if (event.table === 'story' || event.table === 'reaction') {
                if (event.op === 'INSERT' || event.op === 'UPDATE') {
                    if (event.diff.language_codes) {
                        let accessor;
                        if (event.table === 'story') {
                            accessor = Story;
                        } else if (event.table === 'reaction') {
                            accessor = Reaction;
                        }

                        // see if new languages are introduced
                        const languagesBefore = event.previous.language_codes;
                        const languagesAfter = event.current.language_codes;
                        const newLanguages = _.difference(languagesAfter, languagesBefore);
                        // make sure we have indices for these languages
                        const existing = await accessor.getTextSearchLanguages(db, event.schema);
                        // take out the ones we have already
                        _.pullAll(newLanguages, existing);
                        // cap number of indices at 4
                        if (existing.length + newLanguages.length > 4) {
                            if (existing.length < 4) {
                                newLanguages.splice(4 - existing.length);
                            } else {
                                newLanguages = [];
                            }
                        }
                        if (!_.isEmpty(newLanguages)) {
                            await accessor.addTextSearchLanguages(db, event.schema, newLanguages);
                        }
                    }
                }
            }
        } catch (err) {
            console.error(err);
        }
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
    const exists = await db.schemaExists('global');
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
        const exists = await db.roleExists(role.name);
        if (!exists) {
            const sql = `CREATE USER ${role.name} WITH PASSWORD '${role.password}'`;
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
    const someProjectChanged = false;
    const projects = await Project.find(db, 'global', { deleted: false }, 'name');
    for (let project of projects) {
        try {
            const projectChanged = await upgradeSchema(db, project.name);
            if (projectChanged) {
                someProjectChanged = true;
            }
        } catch (err) {
            console.log(`Unable to upgrade schema "${project.name}: ${err.message}"`);
        }
    }
    return globalChanged || someProjectChanged;
}

const globalAccessors = [
    Commit,
    Device,
    Frontend,
    Notification,
    Picture,
    Project,
    Repo,
    Role,
    Server,
    Session,
    Skin,
    Subscription,
    System,
    Task,
    User,
    Wiki,
];
const projectAccessors = [
    Bookmark,
    Listing,
    Notification,
    Reaction,
    Spreadsheet,
    Statistics,
    Story,
    Task,
    Website,
];

/**
 * Upgrade schema if necessary
 *
 * @param  {Database} db
 * @param  {String} schema
 *
 * @return {Promise<Boolean>}
 */
async function upgradeSchema(db, schema) {
    const accessors = (schema === 'global') ? globalAccessors : projectAccessors;
    const currentVersion = await getSchemaVersion(db, schema);
    const latestVersion = _.max(_.map(accessors, 'version'));
    const jumps = _.range(currentVersion, latestVersion);
    for (let version of jumps) {
        for (let accessor of accessors) {
            await accessor.upgrade(db, schema, version + 1);
        }
    }
    if (jumps.length > 0) {
        await setSchemaVersion(db, schema, latestVersion);
        return true;
    } else {
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
    await db.begin();
    try {
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
            }
        }

        // create tables
        const accessors = (schema === 'global') ? globalAccessors : projectAccessors;
        for (let accessor of accessors) {
            await accessor.create(db, schema);
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

        await db.commit()
        return true;
    } catch (err) {
        await db.rollback();
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
    const sql = `DROP SCHEMA "${schema}" CASCADE`;
    await db.execute(sql);
    return true;
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
    const sql = `ALTER SCHEMA "${schemaBefore}" RENAME TO "${schemaAfter}"`;
    await db.execute(sql);
    return true;
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
    const rows = await db.query(sql);
    return (rows[0]) ? rows[0].version : -1;
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
    const roleNames = _.map(roles, 'name');
    const table = `"${schema}"."meta"`;
    const sql1 = `
        CREATE TABLE ${table} (
            version int,
            signature varchar(64)
        );
        GRANT SELECT ON ${table} TO ${roleNames.join(', ')};
    `;
    await db.execute(sql1);
    const buffer = await Crypto.randomBytesAsync(16);
    const signature = buffer.toString('hex');
    const sql2 = `INSERT INTO ${table} (version, signature) VALUES ($1, $2)`;
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
    const table = `"${schema}"."meta"`;
    const sql = `UPDATE ${table} SET version = $1`;
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
    const roleNames = _.map(roles, 'name');
    const sql = `
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

/**
 * Remove outdated messages
 *
 * @param  {Database} db
 *
 * @return {Promise}
 */
async function cleanMessageQueue(db) {
    const lifetime = '1 hour';
    const sql = `DELETE FROM "message_queue" WHERE ctime + CAST($1 AS INTERVAL) < NOW()`;
    await db.execute(sql, [ lifetime ]);
}

/**
 *
 *
 * @param  {Database} db
 */
async function collectGarbage(db) {
    // do it in the middle of the night
    const now = Moment();
    if (now.hour() !== 3) {
        return;
    }
    const elapsed = now - lastGCTime;
    if (!(elapsed > 23 * 60 * 60 * 1000)) {
        return;
    }
    lastGCTime = now;

    const projects = await Project.find(db, 'global', { deleted: false }, 'name');
    const schemas = _.concat('global', _.map(projects, 'name'));
    const preservation = process.env.GARBAGE_PRESERVATION || '2 weeks';
    const totalRemoved = 0;
    for (let schema of schemas) {
        try {
            const accessors = (schema === 'global') ? globalAccessors : projectAccessors;
            for (let acccessor of accessors) {
                const count = await accessor.clean(db, schema, preservation);
                totalRemoved += count;
            }
        } catch (err) {
            console.error(err);
        }
    }
    if (totalRemoved > 0) {
        console.log(`Garbage collection: ${totalRemoved} rows`);
    }
}

let lastGCTime = 0;

if (process.argv[1] === __filename) {
    start();
    Shutdown.on(stop);
}

export {
    start,
    stop,
    createSchema,
    deleteSchema,
    renameSchema,
};
