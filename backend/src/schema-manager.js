var _ = require('lodash');
var Promise = require('bluebird');

var Database = require('database');

var Account = require('accessors/account');
var Authentication = require('accessors/authentication');
var Authorization = require('accessors/authorization');
var Configuration = require('accessors/configuration');
var Preferences = require('accessors/preferences');
var Project = require('accessors/project');
var User = require('accessors/user');

var Bookmark = require('accessors/bookmark');
var Commit = require('accessors/commit');
var Folder = require('accessors/folder');
var Issue = require('accessors/issue');
var Listing = require('accessors/listing');
var Reaction = require('accessors/reaction');
var Repo = require('accessors/repo');
var Robot = require('accessors/robot');
var Statistics = require('accessors/statistics');
var Story = require('accessors/story');

Database.open(true).then((db) => {
    return db.updateJavaScriptRuntime().then(() => {
        // reconnect, since the runtime might be different
        db.close();
        return Database.open(true).then((newDB) => {
            db = newDB;
        });
    }).then(() => {
        return db.updateJavaScriptFunctions();
    }).then(() => {
        return initializeDatabase(db);
    }).then((created) => {
        if (created) {
            return upgradeDatabase(db);
        }
    }).then(() => {
        return db.listen([ 'project' ], 'change', handleDatabaseChanges, 0);
    }).then(() => {
        var interval = setInterval(() => {
            cleanMessageQueue(db);
        }, 5 * 60 * 1000);
        exports.exit = function() {
            clearInterval(interval);
            db.close();
        };
        if (exports.onReady) {
            exports.onReady();
        }
    });
}).catch((err) => {
    console.error(err);
    process.exit(-1);
});

exports.exit = function() {};

function handleDatabaseChanges(events) {
    var db = this;
    return Promise.each(events, (event) => {
        if (event.table === 'project') {
            var nameDiff = event.diff.name;
            if (nameDiff) {
                var nameBefore = nameDiff[0];
                var nameAfter = nameDiff[1];
                if (!nameBefore && nameAfter) {
                    if (event.op == 'INSERT' || event.op === 'UPDATE') {
                        return createSchema(db, nameAfter);
                    }
                } else if (nameBefore && !nameAfter) {
                    if (event.op == 'DELETE') {
                        return deleteSchema(db, nameBefore);
                    }
                } else if (nameBefore && nameAfter) {
                    if (event.op === 'UPDATE') {
                        return renameSchema(db, nameBefore, nameAfter);
                    }
                }
            }
        }
    }).catch((err) => {
        console.log('ERROR: ' + err.message);
    });
}

/**
 * Create global schema if it doesn't already exists
 *
 * @param  {Database} db
 *
 * @return {Promise<Boolean>}
 */
function initializeDatabase(db) {
    return addDatabaseRoles(db).then(() => {
        return db.schemaExists('global').then((exists) => {
            if (exists) {
                return false;
            }
            return createSchema(db, 'global').then((result) => {
                return createMessageQueue(db);
            }).then((result) => {
                return true;
            });
        });
    });
}

function addDatabaseRoles(db) {
    var roles = ['internal_role', 'webfacing_role'];
    return Promise.mapSeries(roles, (role) => {
        return db.roleExists(role).then((exists) => {
            if (exists) {
                return false;
            }
            var password = process.env.POSTGRES_PASSWORD;
            var sql = `CREATE USER ${role} WITH PASSWORD '${password}'`;
            return db.execute(sql).then(() => {
                return true;
            });
        });
    }).then((changed) => {
        return _.some(changed);
    });
}

/**
 * Upgrade global and project-specific schemas if necessary
 *
 * @param  {Database} db
 *
 * @return {Promise<Boolean>}
 */
function upgradeDatabase(db) {
    return upgradeSchema(db, 'global').then((globalChanged) => {
        return Project.find(db, 'global', { deleted: false }, 'name').map((project) => {
            return upgradeSchema(db, project.name);
        }).then((projectsChanged) => {
            return globalChanged || _.some(projectsChanged);
        });
    });
}

var globalAccessors = [
    Account,
    Authentication,
    Authorization,
    Configuration,
    Preferences,
    Project,
    User,
];
var projectAccessors = [
    Bookmark,
    Commit,
    Folder,
    Issue,
    Listing,
    Reaction,
    Repo,
    Robot,
    Statistics,
    Story,
];

/**
 * Upgrade schema if necessary
 *
 * @param  {Database} db
 * @param  {String} schema
 *
 * @return {Promise<Boolean>}
 */
function upgradeSchema(db, schema) {
    var accessors = (schema === 'global') ? globalAccessors : projectAccessors;
    return getSchemaVersion(db, schema).then((currentVersion) => {
        var latestVersion = _.max(_.map(accessors), 'version');
        var jumps = _.range(currentVersion, latestVersion);
        return Promise.each(jumps, (version) => {
            return Promise.each(accessors, (accessor) => {
                return accessor.upgrade(db, version + 1);
            });
        }).then(() => {
            return jumps.length > 0;
        });
    });
}

/**
 * Create either a project-specific schema or the global schema
 *
 * @param  {Database} db
 * @param  {String} schema
 *
 * @return {Promise<Boolean>}
 */
function createSchema(db, schema) {
    var accessors = (schema === 'global') ? globalAccessors : projectAccessors;
    return db.begin().then(() => {
        var sql = `CREATE SCHEMA "${schema}"`;
        return db.execute(sql);
    }).then(() => {
        return Promise.each(accessors, (accessor) => {
            return accessor.create(db, schema).then(() => {
                return accessor.grant(db, schema);
            }).then(() => {
                return accessor.watch(db, schema);
            });
        });
    }).then(() => {
        var latestVersion = _.max(_.map(accessors), 'version');
        return addSchemaVersion(db, schema);
    }).then(() => {
        return db.commit().return(true);
    }).catch((err) => {
        return db.rollback().throw(err)
    });
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
function deleteSchema(db, schema) {

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
function renameSchema(db, schemaBefore, schemaAfter) {

}

/**
 * Return version number of database schema from meta table
 *
 * @param  {Database} db
 * @param  {String} schema
 *
 * @return {Number}
 */
function getSchemaVersion(db, schema) {
    var table = `"${schema}"."meta"`;
    var sql = `SELECT version FROM ${table}`;
    return db.query(sql).get(0).then((row) => {
        return (row) ? row.version : -1;
    });
}

/**
 * Create meta table and insert row with version number
 *
 * @param {Database} db
 * @param {String} schema
 * @param {Number} version
 *
 * @return {Promise<Boolean>}
 */
function addSchemaVersion(db, schema, version) {
    var table = `"${schema}"."meta"`;
    var deployment = process.env.DEPLOYMENT;
    var sql = `
        CREATE TABLE ${table} (
            version int,
            deployment varchar(64)
        );
    `;
    return db.execute(sql).then(() => {
        var sql = `INSERT INTO ${table} (version, deployment) VALUES ($1, $2)`;
        return db.execute(sql, [ version, deployment ]);
    }).then(() => {
        return true;
    });
}

/**
 * Update meta table with version number
 *
 * @param {Database} db
 * @param {String} schema
 * @param {Number} version
 *
 * @return {Promise<Boolean>}
 */
function setSchemaVersion(db, schema, version) {
    var table = `"${schema}"."meta"`;
    var deployment = process.env.DEPLOYMENT;
    var sql = `UPDATE ${table} SET version = $1, deployment = $2`;
    return db.execute(sql, [ version, deployment ]).then((result) => {
        return result.rowCount > 0;
    });
}

/**
 * Create message_queue table for oversized change notification
 *
 * @param  {Database} db
 *
 * @return {Promise<Boolean>}
 */
function createMessageQueue(db) {
    var sql = `
        CREATE TABLE IF NOT EXISTS "message_queue" (
            id serial,
            message jsonb NOT NULL,
            ctime timestamp NOT NULL DEFAULT NOW(),
            PRIMARY KEY (id)
        )
    `;
    return db.execute(sql).then(() => {
        return true;
    });
}

/**
 * Remove outdated messages
 *
 * @param  {Database} db
 *
 * @return {Promise}
 */
function cleanMessageQueue(db) {
    var lifetime = '1 hour';
    var sql = `DELETE FROM "message_queue" WHERE ctime + CAST($1 AS INTERVAL) < NOW()`;
    return db.execute(sql, [ lifetime ]).then((result) => {
    });
}
