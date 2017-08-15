var _ = require('lodash');
var Promise = require('bluebird');
var FS = require('fs');
var PgPool = require('pg-pool')
var PgTypes = require('pg').types;

var Async = require('utils/async-do-while');

module.exports = Database;

var BIGINT_OID = 20;
var TIMESTAMPTZ_OID = 1184
var TIMESTAMP_OID = 1114

/**
 * Retrieve timestamps from Postgres as ISO strings
 *
 * @param  {String} val
 *
 * @return {String}
 */
function parseDate(val) {
    if (val) {
        var date = new Date(val);
        return date.toISOString();
    }
    return val;
}
PgTypes.setTypeParser(TIMESTAMPTZ_OID, parseDate);
PgTypes.setTypeParser(TIMESTAMP_OID, parseDate);

/**
 * Retrieve bigint as Number unless doing so triggers an overflow
 *
 * @param  {String} val
 *
 * @return {Number|String}
 */
function parseBigInt(val) {
    var num = parseInt(val);
    if (Number.MIN_SAFE_INTEGER <= num && num <= Number.MAX_SAFE_INTEGER) {
        return num;
    } else {
        return val;
    }
}
PgTypes.setTypeParser(BIGINT_OID, parseBigInt);

var config = {
    host: process.env.POSTGRES_HOST,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
};

var pool = new PgPool(config);

function Database(client) {
    this.client = client;
}

Database.open = function(exclusive) {
    if (exclusive) {
        var db;
        var attempt;
        Async.begin(() => {
            attempt = 1;
        })
        Async.while(() => {
            return Promise.resolve(pool.connect()).then((client) => {
                // done--break out of loop
                db = new Database(client);
                return false;
            }).catch((err) => {
                // try again if the number of attempts hasn't exceed the limit
                if (attempt++ < 30) {
                    return true;
                } else {
                    throw err;
                }
            })
        })
        Async.do(() => {
            // wait a second
            return Promise.delay(1000);
        })
        Async.finally(() => {
            return db;
        })
        return Async.result();
    } else {
        // run database queries through the pool
        var db = new Database(pool);
        return Promise.resolve(db);
    }
};

Database.prototype.close = function() {
    if (this.client !== pool && this.client) {
        this.client.removeAllListeners();
        this.client.release();
    }
    this.client = null;
};

Database.prototype.query = function(sql, parameters) {
    return this.execute(sql, parameters).then((result) => {
        return result.rows;
    });
};

Database.prototype.execute = function(sql, parameters) {
    if (!this.client) {
        return Promise.reject('Connection was closed: ' + sql.substr(0, 20) + '...');
    }
    // convert promise to Bluebird variety
    return Promise.resolve(this.client.query(sql, parameters));
};

Database.prototype.begin = function() {
    if (!this.client === pool) {
        throw new Error('Cannot begin a transaction on a non-exclusive connection');
    }
    var sql = 'BEGIN TRANSACTION';
    return this.execute(sql).return();
};

Database.prototype.commit = function() {
    var sql = 'COMMIT';
    return this.execute(sql).return();
};

Database.prototype.rollback = function() {
    var sql = 'ROLLBACK';
    return this.execute(sql).return();
};

Database.prototype.listen = function(tables, event, callback, delay) {
    if (this.client === pool) {
        throw new Error('Cannot listen to a non-exclusive connection');
    }
    var cxt = {
        queue: [],
        timeout: 0,
        callback: callback,
        channels: [],
        delay: delay,
        database: this,
    };
    if (delay === undefined) {
        delay = 50;
    }
    this.client.on('notification', (msg) => {
        processNotification(cxt, msg);
    });
    return Promise.each(tables, (table) => {
        var channel = `${table}_${event}`;
        cxt.channels.push(channel);
        return this.execute(`LISTEN ${channel}`);
    });
};

/**
 * Wait for a schema to come into existence
 *
 * @param  {String} schema
 * @param  {Number} wait
 *
 * @return {Promise<Boolean>}
 */
Database.prototype.need = function(schema, wait) {
    var found;
    var startTime;
    Async.begin(() => {
        found = false;
        startTime = new Date;
    })
    Async.while(() => {
        // keep looking until the schema is found or if we're out of time
        var now = new Date;
        if ((now - startTime) > wait) {
            return false;
        }
        return this.schemaExists(schema).then((exists) => {
            found = exists;
            return !found;
        });
    })
    Async.do(() => {
        // pause for half a second
        return Promise.delay(500);
    })
    Async.finally(() => {
        return found;
    })
    return Async.result();
}

/**
 * Check if a schema exists
 *
 * @param  {String} schema
 *
 * @return {Promise<Boolean>}
 */
Database.prototype.schemaExists = function(schema) {
    var sql = `SELECT 1 FROM pg_namespace WHERE nspname = $1`;
    return this.query(sql, [ schema ]).get(0).then((row) => {
        return !!row;
    });
}

/**
 * Check if a user role exists
 *
 * @param  {String} username
 *
 * @return {Promise<Boolean>}
 */
Database.prototype.roleExists = function(username) {
    var sql = `SELECT 1 FROM pg_roles WHERE rolname = $1`;
    return this.query(sql, [ username ]).get(0).then((row) => {
        return !!row;
    });
}

/**
 * Check if a schema exists
 *
 * @param  {String} schema
 *
 * @return {Promise<Boolean>}
 */
Database.prototype.functionExists = function(schema) {
    var sql = `SELECT 1 FROM pg_proc WHERE proname = $1;`;
    return this.query(sql, [ schema ]).get(0).then((row) => {
        return !!row;
    });
}

function processNotification(cxt, msg) {
    try {
        if (cxt.channels.indexOf(msg.channel) !== -1) {
            var json = JSON.parse(msg.payload);
            if (typeof(json) === 'object') {
                // we received the actual message
                pushNotification(cxt, json);
            } else if (typeof(json) === 'number') {
                // we received the id of an oversized message
                // fetch it from the database
                var sql = `SELECT message FROM "message_queue" WHERE id = $1`;
                cxt.database.query(sql, [ json ]).then((rows) => {
                    if (rows.length > 0) {
                        pushNotification(cxt, rows[0].message);
                    }
                });
            }
        }
    } catch(err) {
        console.error(err);
    }
}

function pushNotification(cxt, event) {
    cxt.queue.push(event);
    if (cxt.timeout) {
        clearTimeout(cxt.timeout);
    }
    if (cxt.delay === 0) {
        dispatchNotifications(cxt);
    } else {
        cxt.timeout = setTimeout(() => {
            dispatchNotifications(cxt);
        }, cxt.delay);
    }
}

function dispatchNotifications(cxt) {
    var events = cxt.queue;
    cxt.queue = [];
    cxt.timeout = 0;
    try {
        cxt.callback.call(cxt.database, events);
    } catch(err) {
        console.error(err);
    }
}

Database.prototype.updateJavaScriptRuntime = function() {
    return Promise.try(() => {
        return this.execute('CREATE EXTENSION IF NOT EXISTS plv8').catch((err) => {
            // CREATE EXTENSION... will fail initially if plv8_init() is
            // undefined;
            return this.execute('CREATE EXTENSION IF NOT EXISTS plv8');
        }).then(() => {
            // add JavaScript functions to global scope callable
            // the plv8 extension will run plv8_init() everytime
            // it creates a V8 context (this is set in the
            // command-line in Dockerfile)
            //
            // ensure the code is syntatically correct by loading it here
            var module = require('stored-procs/runtime');
            var code = FS.readFileSync(`${__dirname}/stored-procs/runtime.js`, 'utf8');
            var sql = `
                CREATE OR REPLACE FUNCTION plv8_init() RETURNS void
                AS $$\n${code}\n$$
                LANGUAGE plv8;
            `;
            return this.execute(sql);
        });
    });
};

Database.prototype.updateJavaScriptFunctions = function(f) {
    return Promise.try(() => {
        var names = []
        var funcs = [];
        var files = [ 'functions.js', 'triggers.js' ];
        files.forEach((file) => {
            var module = require(`stored-procs/${file}`);
            for (var name in module) {
                names.push(name);
                funcs.push(module[name]);
            }
        });
        return Promise.each(names, (name, i) => {
            var f = funcs[i];
            var m = /{([\s\S]*)}/.exec(f.toString());
            var code = m[1];
            var args = f.args;
            var ret = f.ret;
            var flags = f.flags || '';
            if (args === undefined) {
                throw new Error(`${name}() does not have args attached`);
            }
            if (ret === undefined) {
                throw new Error(`${name}() does not have ret attached`);
            }
            var sql = `
                CREATE OR REPLACE FUNCTION "${name}"(${args}) RETURNS ${ret}
                AS $$\n${code}\n$$
                LANGUAGE plv8 ${flags};
            `;
            return this.execute(sql);
        });
    });
}
