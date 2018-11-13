import _ from 'lodash';
import Promise from 'bluebird';
import FS from 'fs';
import PgPool from 'pg-pool'
import Pg from 'pg';
import Async from 'async-do-while';

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
Pg.types.setTypeParser(TIMESTAMPTZ_OID, parseDate);
Pg.types.setTypeParser(TIMESTAMP_OID, parseDate);

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
Pg.types.setTypeParser(BIGINT_OID, parseBigInt);

var config = {
    host: process.env.POSTGRES_HOST,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
};

var pool = new PgPool(config);
var poolCheckPromise = null;
pool.on('error', (err) => {
    console.error(err.message);
    if (poolCheckPromise && !poolCheckPromise.isPending()) {
        poolCheckPromise = null;
    }
});

function testConnection(client) {
    var sql = 'SELECT 1';
    return Promise.resolve(client.query(sql)).return();
}

function checkConnectionPool() {
    if (!poolCheckPromise) {
        Async.while(() => {
            return testConnection(pool).then(() => {
                return false;
            }).catch((err) => {
                return true;
            });
        });
        Async.do(() => {
            return Promise.delay(1000);
        });
        poolCheckPromise = Async.end();
    }
    return poolCheckPromise;
}

function Database(client) {
    this.client = client;
    this.reconnectionPromise = null;
    this.listeners = [];

    if (client !== pool) {
        client.on('error', (err) => {
            this.reconnect().then(() => {
                // reattach listeners
                return Promise.each(this.listeners, (listener) => {
                    return this.attachListener(listener);
                });
            }).then(() => {
                console.log('Reconnected');
            });
        });
    }
}

Database.open = function(exclusive) {
    if (exclusive) {
        var db;
        var attempt = 1;
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
            });
        });
        Async.do(() => {
            // wait a second
            return Promise.delay(1000);
        });
        Async.return(() => {
            return db;
        });
        return Async.end();
    } else {
        // run database queries through the pool
        return checkConnectionPool().then(() => {
            return new Database(pool);
        });
    }
};

Database.prototype.reconnect = function() {
    if (this.client === pool) {
        return Promise.delay(1000).then(() => {
            return checkConnectionPool();
        });
    }
    this.close();
    if (!this.reconnectionPromise) {
        Async.do(() => {
            // wait a second
            return Promise.delay(1000);
        });
        Async.while(() => {
            return Promise.resolve(pool.connect()).then((client) => {
                return testConnection(pool).then(() => {
                    this.client = client;
                    return false;
                });
            }).catch((err) => {
                // try again
                return true;
            });
        });
        Async.return(() => {
            this.reconnectionPromise = null;
        });
        this.reconnectionPromise = Async.end();
    }
    return this.reconnectionPromise;
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

var programmingErrors = {
    42: 'A syntax error or rule violation was encountered',
    22: 'A data conversion error was encountered',
};

Database.prototype.execute = function(sql, parameters) {
    if (!this.client) {
        if (this.reconnectionPromise) {
            return this.reconnectionPromise.then(() => {
                return this.execute(sql, parameters);
            });
        }
        return Promise.reject(new Error('Connection was closed: ' + sql.substr(0, 20) + '...'));
    }
    // convert promise to Bluebird variety
    return Promise.resolve(this.client.query(sql, parameters)).catch((err) => {
        if (err.code) {
            var errorClass = err.code.substr(0, 2);
            var programmingError = programmingErrors[errorClass];
            if (programmingError) {
                // syntax error
                console.log(programmingError);
                console.log('SQL statement:');
                console.log(sql);
                console.log('----------------------------------------');
                console.log('Parameters:');
                console.log(parameters);
                console.log('----------------------------------------');
            }
        } else if (err.message === 'Connection terminated') {
            // reconnect and run statement again
            return this.reconnect().then(() => {
                return this.execute(sql, parameters);
            });
        }
        throw err;
    });
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
    var listener = {
        queue: [],
        timeout: 0,
        event: event,
        tables: tables,
        callback: callback,
        channels: [],
        delay: delay || 50,
        database: this,
    };
    this.listeners.push(listener);
    return this.attachListener(listener);
};

Database.prototype.attachListener = function(listener) {
    this.client.on('notification', (msg) => {
        processNotification(listener, msg);
    });
    return Promise.each(listener.tables, (table) => {
        var channel = `${table}_${listener.event}`;
        listener.channels.push(channel);
        return this.execute(`LISTEN ${channel}`);
    });
};

/**
 * Wait for a schema to come into existence
 *
 * @param  {String} schema
 * @param  {Number} wait
 */
Database.prototype.need = function(schema, wait) {
    var found;
    var startTime;
    var lastError;
    if (wait == undefined) {
        wait = 30000;
    }
    Async.begin(() => {
        found = false;
        startTime = new Date;
    });
    Async.while(() => {
        // keep looking until the schema is found or if we're out of time
        return this.schemaExists(schema).catch((err) => {
            lastError = err;
            return false;
        }).then((exists) => {
            found = exists;
            return !found;
        });
    });
    Async.do(() => {
        // pause for half a second
        return Promise.delay(500).then(() => {
            var now = new Date;
            if ((now - startTime) > wait) {
                if (lastError) {
                    throw lastError;
                } else {
                    throw new Error(`Schema does not exist: ${schema}`);
                }
            }
        });
    });
    return Async.end();
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
        console.error(err.message);
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
        console.error(err.message);
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
                CREATE OR REPLACE FUNCTION plv8_init() RETURNS void AS
                $BODY$
                ${code}
                $BODY$
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
                CREATE OR REPLACE FUNCTION "${name}"(${args}) RETURNS ${ret} AS
                $BODY$
                ${code}
                $BODY$
                LANGUAGE plv8 ${flags};
            `;
            return this.execute(sql);
        });
    });
};

var dictionaryFiles = {
    en: 'english',
    cz: 'czech',
    nl: 'dutch',
    fr: 'french',
    da: 'danish',
    en: 'english',
    de: 'german',
    it: 'italian',
    no: 'norwegian',
    pl: 'polish',
    pt: 'portuguese',
    es: 'spanish',
    tr: 'turkish',
    ru: 'russian',
    sv: 'swedish',
};

var stemDirctionaries = {
    fi: 'finnish_stem',
    hu: 'hungarian_stem',
};

Database.prototype.createDictionaries = function(languageCode) {
    // see if there's a dictionary file for the language
    var dictFile = dictionaryFiles[languageCode];
    if (dictFile) {
        // see if ispell dictionary already exists
        var dictName = `ispell_${dictFile}`;
        var sql = `
            SELECT dictname FROM pg_catalog.pg_ts_dict
            WHERE dictname = '${dictName}'
        `;
        return this.query(sql).then((rows) => {
            if (!_.isEmpty(rows)) {
                return;
            }
            var sql = `
                CREATE TEXT SEARCH DICTIONARY ${dictName} (
                    template  = ispell,
                    dictfile = ${dictFile},
                    afffile = ${dictFile},
                    stopwords = ${dictFile}
                )
            `;
            return this.execute(sql).catch((err) => {
                if (err.code !== '23505') {
                    throw err;
                }
            });
        }).then(() => {
            return [ dictName, 'simple' ];
        });
    } else {
        // use snowball dictionary if there's one
        var stem = stemDirctionaries[languageCode];
        var list = (stem) ? [ stem, 'simple' ] : [ 'simple' ]
        return Promise.resolve(list);
    };
};

export {
    Database as default,
    Database,
};
