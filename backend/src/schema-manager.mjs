import _ from 'lodash';
import Bluebird from 'bluebird';
import Moment from 'moment';
import Crypto from 'crypto'; Bluebird.promisifyAll(Crypto);
import Database from './lib/database.mjs';
import * as Shutdown from './lib/shutdown.mjs';

// global accessors
import Commit from './lib/accessors/commit.mjs';
import Device from './lib/accessors/device.mjs';
import Picture from './lib/accessors/picture.mjs';
import Project from './lib/accessors/project.mjs';
import Repo from './lib/accessors/repo.mjs';
import Role from './lib/accessors/role.mjs';
import Server from './lib/accessors/server.mjs';
import Session from './lib/accessors/session.mjs';
import Subscription from './lib/accessors/subscription.mjs';
import System from './lib/accessors/system.mjs';
import User from './lib/accessors/user.mjs';

// project accessors
import Bookmark from './lib/accessors/bookmark.mjs';
import Listing from './lib/accessors/listing.mjs';
import Reaction from './lib/accessors/reaction.mjs';
import Statistics from './lib/accessors/statistics.mjs';
import Story from './lib/accessors/story.mjs';

// appear in both
import Notification from './lib/accessors/notification.mjs';
import Task from './lib/accessors/task.mjs';

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
    let created = await initializeDatabase(db);
    if (!created) {
        await upgradeDatabase(db);
    }
    let tables = [
        'project',
        'story',
        'reaction',
    ];
    await db.listen(tables, 'change', handleDatabaseChanges, 0);

    if (process.env.NODE_ENV !== 'production') {
        // listen for console messages from stored procs
        let f = function(method, evts) {
            for (let args in evts) {
                console[method].apply(console, args);
            }
        };
        let tbl = [ 'console' ];
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
    let db = this;
    for (let event of events) {
        try {
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
                        let languagesBefore = event.previous.language_codes;
                        let languagesAfter = event.current.language_codes;
                        let newLanguages = _.difference(languagesAfter, languagesBefore);
                        // make sure we have indices for these languages
                        let existing = await accessor.getTextSearchLanguages(db, event.schema);
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
    let globalChanged = await upgradeSchema(db, 'global');
    let someProjectChanged = false;
    let projects = await Project.find(db, 'global', { deleted: false }, 'name');
    for (let project of projects) {
        try {
            let projectChanged = await upgradeSchema(db, project.name);
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
    Notification,
    Picture,
    Project,
    Repo,
    Role,
    Server,
    Session,
    Subscription,
    System,
    Task,
    User,
];
const projectAccessors = [
    Bookmark,
    Listing,
    Notification,
    Reaction,
    Statistics,
    Story,
    Task,
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
    let accessors = (schema === 'global') ? globalAccessors : projectAccessors;
    let currentVersion = await getSchemaVersion(db, schema);
    let latestVersion = _.max(_.map(accessors, 'version'));
    let jumps = _.range(currentVersion, latestVersion);
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
        let sql = `CREATE SCHEMA "${schema}"`;
        await db.execute(sql);

        // grant usage right and right to all sequences to each role
        for (let role of roles) {
            let schemaType = (schema === 'global') ? 'global' : 'project';
            if (_.includes(role.schemas, schemaType)) {
                let sql = `
                    GRANT USAGE ON SCHEMA "${schema}" TO "${role.name}";
                    ALTER DEFAULT PRIVILEGES IN SCHEMA "${schema}" GRANT USAGE, SELECT ON SEQUENCES TO "${role.name}";
                `;
                await db.execute(sql);
            }
        }

        // create tables
        let accessors = (schema === 'global') ? globalAccessors : projectAccessors;
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
        let latestVersion = _.max(_.map(accessors, 'version')) || 0;
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
    let sql = `DROP SCHEMA "${schema}" CASCADE`;
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
    let sql = `ALTER SCHEMA "${schemaBefore}" RENAME TO "${schemaAfter}"`;
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
    let table = `"${schema}"."meta"`;
    let sql = `SELECT version FROM ${table}`;
    let rows = await db.query(sql);
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

/**
 * Remove outdated messages
 *
 * @param  {Database} db
 *
 * @return {Promise}
 */
async function cleanMessageQueue(db) {
    let lifetime = '1 hour';
    let sql = `DELETE FROM "message_queue" WHERE ctime + CAST($1 AS INTERVAL) < NOW()`;
    await db.execute(sql, [ lifetime ]);
}

/**
 *
 *
 * @param  {Database} db
 */
async function collectGarbage(db) {
    // do it in the middle of the night
    let now = Moment();
    if (now.hour() !== 3) {
        return;
    }
    let elapsed = now - lastGCTime;
    if (!(elapsed > 23 * 60 * 60 * 1000)) {
        return;
    }
    lastGCTime = now;

    let projects = await Project.find(db, 'global', { deleted: false }, 'name');
    let schemas = _.concat('global', _.map(projects, 'name'));
    let preservation = process.env.GARBAGE_PRESERVATION || '2 weeks';
    let totalRemoved = 0;
    for (let schema of schemas) {
        try {
            let accessors = (schema === 'global') ? globalAccessors : projectAccessors;
            for (let acccessor of accessors) {
                let count = await accessor.clean(db, schema, preservation);
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

if ('file://' + process.argv[1] === import.meta.url) {
    start();
    Shutdown.addListener(stop);
}

export {
    start,
    stop,
    createSchema,
    deleteSchema,
    renameSchema,
};
