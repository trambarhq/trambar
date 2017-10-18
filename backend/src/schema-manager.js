var _ = require('lodash');
var Promise = require('bluebird');
var Database = require('database');

// global accessors
var Authentication = require('accessors/authentication');
var Authorization = require('accessors/authorization');
var Picture = require('accessors/picture');
var Project = require('accessors/project');
var Repo = require('accessors/repo');
var Role = require('accessors/role');
var Server = require('accessors/server');
var System = require('accessors/system');
var User = require('accessors/user');

// project accessors
var Bookmark = require('accessors/bookmark');
var Listing = require('accessors/listing');
var Reaction = require('accessors/reaction');
var Robot = require('accessors/robot');
var Statistics = require('accessors/statistics');
var Story = require('accessors/story');

// appear in both
var Task = require('accessors/task');

var database;
var messageQueueInterval;

var roles = [
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

function start() {
    return Database.open(true).then((db) => {
        database = db;
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
            var tables = [
                'project',
                'story',
                'reaction',
            ]
            return db.listen(tables, 'change', handleDatabaseChanges, 0);
        }).then(() => {
            messageQueueInterval = setInterval(() => {
                cleanMessageQueue(db);
            }, 5 * 60 * 1000);
        });
    });
}

function stop() {
    clearInterval(messageQueueInterval);
    if (database) {
        database.close();
        database = null;
    }
    return Promise.resolve();
};

function handleDatabaseChanges(events) {
    var db = this;
    return Promise.each(events, (event) => {
        if (event.table === 'project') {
            if (event.diff.name) {
                var nameBefore = event.diff.name[0];
                var nameAfter = event.diff.name[1];
                if (!nameBefore && nameAfter) {
                    if (event.op === 'INSERT' || event.op === 'UPDATE') {
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
        } else if (event.table === 'story' || event.table === 'reaction') {
            if (event.diff.details) {
                if (event.op === 'INSERT' || event.op === 'UPDATE') {
                    var accessor;
                    if (event.table === 'story') {
                        accessor = Story;
                    } else if (event.table === 'reaction') {
                        accessor = Reaction;
                    }

                    // see if new languages are introduced
                    var detailsBefore = event.diff.details[0];
                    var detailsAfter = event.diff.details[1];
                    var languagesBefore = (detailsBefore) ? _.keys(detailsBefore.text) : [];
                    var languagesAfter = (detailsAfter) ? _.keys(detailsAfter.text) : [];
                    var newLanguages = _.difference(languagesAfter, languagesBefore);
                    if (newLanguages) {
                        // make sure we have indices for these languages
                        return accessor.getTextSearchLanguages(db, event.schema).then((existing) => {
                            // cap number of indices at 4
                            _.pullAll(newLanguages, existing).splice(4 - existing.length);
                            console.log(newLanguages)
                            return accessor.addTextSearchLanguages(db, event.schema, newLanguages);
                        });
                    }
                }
            }
        }
    }).catch((err) => {
        console.error(err);
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
    return Promise.mapSeries(roles, (role) => {
        return db.roleExists(role.name).then((exists) => {
            if (exists) {
                return false;
            }
            var sql = `CREATE USER ${role.name} WITH PASSWORD '${role.password}'`;
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
    Authentication,
    Authorization,
    Picture,
    Project,
    Repo,
    Role,
    Server,
    System,
    Task,
    User,
];
var projectAccessors = [
    Bookmark,
    Listing,
    Reaction,
    Robot,
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
        // grant usage right and right to all sequences to each role
        return Promise.each(roles, (role) => {
            var schemaType = (schema === 'global') ? 'global' : 'project';
            if (_.includes(role.schemas, schemaType)) {
                var sql = `
                    GRANT USAGE ON SCHEMA "${schema}" TO "${role.name}";
                    ALTER DEFAULT PRIVILEGES IN SCHEMA "${schema}" GRANT USAGE, SELECT ON SEQUENCES TO "${role.name}";
                `;
                return db.execute(sql);
            }
        });
    }).then(() => {
        // create tables
        return Promise.each(accessors, (accessor) => {
            return accessor.create(db, schema);
        });
    }).then(() => {
        return Promise.each(accessors, (accessor) => {
            return accessor.grant(db, schema);
        });
    }).then(() => {
        return Promise.each(accessors, (accessor) => {
            return accessor.watch(db, schema);
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
    var sql = `DROP SCHEMA "${schema}" CASCADE`;
    return db.execute(sql).then((result) => {
        return true;
    });
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
    var roleNames = _.map(roles, 'name');
    var sql = `
        CREATE TABLE IF NOT EXISTS "message_queue" (
            id serial,
            message jsonb NOT NULL,
            ctime timestamp NOT NULL DEFAULT NOW(),
            PRIMARY KEY (id)
        );
        GRANT SELECT, INSERT ON "message_queue" TO ${roleNames.join(', ')};
        GRANT USAGE, SELECT ON message_queue_id_seq TO ${roleNames.join(', ')};
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
    return db.execute(sql, [ lifetime ]);
}

exports.start = start;
exports.stop = stop;
exports.createSchema = createSchema;
exports.deleteSchema = deleteSchema;
exports.renameSchema = renameSchema;

if (process.argv[1] === __filename) {
    start();
}

_.each(['SIGTERM', 'SIGUSR2'], (sig) => {
    process.on(sig, function() {
        stop().then(() => {
            process.exit(0);
        });
    });
});

process.on('uncaughtException', function(err) {
    console.error(err);
});
