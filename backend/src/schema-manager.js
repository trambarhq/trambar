var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var Crypto = Promise.promisifyAll(require('crypto'));
var Database = require('database');
var Shutdown = require('shutdown');

// global accessors
var Commit = require('accessors/commit');
var Device = require('accessors/device');
var Picture = require('accessors/picture');
var Project = require('accessors/project');
var Repo = require('accessors/repo');
var Role = require('accessors/role');
var Server = require('accessors/server');
var Session = require('accessors/session');
var Subscription = require('accessors/subscription');
var System = require('accessors/system');
var User = require('accessors/user');

// project accessors
var Bookmark = require('accessors/bookmark');
var Listing = require('accessors/listing');
var Reaction = require('accessors/reaction');
var Statistics = require('accessors/statistics');
var Story = require('accessors/story');

// appear in both
var Notification = require('accessors/notification');
var Task = require('accessors/task');

module.exports = {
    start,
    stop,
    createSchema,
    deleteSchema,
    renameSchema,
};

var database;
var messageQueueInterval;
var garbageCollectionInterval;

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
            if (process.env.NODE_ENV !== 'production') {
                // listen for console messages from stored procs
                var types = [
                    'info',
                    'log',
                    'warn',
                    'error',
                    'debug',
                ];
                return Promise.each(types, (event) => {
                    var f = function(events) {
                        _.each(events, (args) => {
                            console[event].apply(console, args);
                        });
                    };
                    return db.listen([ 'console' ], event, f, 0);
                });
            }
        }).then(() => {
            messageQueueInterval = setInterval(() => {
                cleanMessageQueue(db);
            }, 5 * 60 * 1000);
            garbageCollectionInterval = setInterval(() => {
                collectGarbage(db);
            }, 10 * 60 * 1000);
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
                var nameBefore = event.previous.name;
                var nameAfter = event.current.name;
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
            if (event.diff.deleted) {
                var deletedName = `$recycled$-project-${event.id}`;
                var normalName = event.current.name;
                if (event.current.deleted) {
                    return renameSchema(db, normalName, deletedName);
                } else {
                    return renameSchema(db, deletedName, normalName);
                }
            }
        } else if (event.table === 'story' || event.table === 'reaction') {
            if (event.diff.language_codes) {
                if (event.op === 'INSERT' || event.op === 'UPDATE') {
                    var accessor;
                    if (event.table === 'story') {
                        accessor = Story;
                    } else if (event.table === 'reaction') {
                        accessor = Reaction;
                    }

                    // see if new languages are introduced
                    var languagesBefore = event.previous.language_codes;
                    var languagesAfter = event.current.language_codes;
                    var newLanguages = _.difference(languagesAfter, languagesBefore);
                    // make sure we have indices for these languages
                    return accessor.getTextSearchLanguages(db, event.schema).then((existing) => {
                        // cap number of indices at 4
                        _.pullAll(newLanguages, existing).splice(4 - existing.length);
                        return accessor.addTextSearchLanguages(db, event.schema, newLanguages);
                    });
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
var projectAccessors = [
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
    var sql = `ALTER SCHEMA "${schemaBefore}" RENAME TO "${schemaAfter}"`;
    return db.execute(sql).then((result) => {
        return true;
    });
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
    var roleNames = _.map(roles, 'name');
    var table = `"${schema}"."meta"`;
    var sql = `
        CREATE TABLE ${table} (
            version int,
            signature varchar(64)
        );
        GRANT SELECT ON ${table} TO ${roleNames.join(', ')};
    `;
    return db.execute(sql).then(() => {
        return Crypto.randomBytesAsync(16).then((buffer) => {
            return buffer.toString('hex');
        });
    }).then((signature) => {
        var sql = `INSERT INTO ${table} (version, signature) VALUES ($1, $2)`;
        return db.execute(sql, [ version, signature ]);
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
    var sql = `UPDATE ${table} SET version = $1`;
    return db.execute(sql, [ version ]).then((result) => {
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

/**
 *
 *
 * @param  {Database} db
 */
function collectGarbage(db) {
    // do it in the middle of the night
    var now = Moment();
    if (now.hour() !== 3) {
        return;
    }
    var elapsed = now - lastGCTime;
    if (!(elapsed > 23 * 60 * 60 * 1000)) {
        return;
    }
    lastGCTime = now;

    return Project.find(db, 'global', { deleted: false }, 'name').then((projects) => {
        return _.concat('global', _.map(projects, 'name'));
    }).then((schemas) => {
        var preservation = process.env.GARBAGE_PRESERVATION || '2 weeks';
        var totalRemoved = 0;
        return Promise.each(schemas, (schema) => {
            var accessors = (schema === 'global') ? globalAccessors : projectAccessors;
            return Promise.each(accessors, (accessor) => {
                return accessor.clean(db, schema, preservation).then((count) => {
                    totalRemoved += count;
                });
            });
        }).then(() => {
            if (totalRemoved > 0) {
                console.log(`Garbage collection: ${totalRemoved} rows`);
            }
        });
    });
}

var lastGCTime = 0;

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
