import Bluebird from 'bluebird';
import FS from 'fs';
import PgPool from 'pg-pool'
import Pg from 'pg';

let config = {
    host: process.env.POSTGRES_HOST,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
};

let pool = new PgPool(config);
let poolCheckPromise = null;
pool.on('error', (err) => {
    console.error(err.message);
    poolCheckPromise = null;
});

function checkConnectionPool() {
    if (!poolCheckPromise) {
        poolCheckPromise = checkConnectionPoolUncached();
    }
    return poolCheckPromise;
}

async function checkConnectionPoolUncached() {
    for (let attempts = 0; attempts < 60; attempts++) {
        try {
            await pool.query('SELECT 1');
        } catch (err) {
            await Bluebird.delay(1000);
        }
    }
}

class Database {
    constructor(exclusive) {
        this.exclusive = exclusive;
        this.client = null;
        this.connectionPromise = null;
        this.listeners = [];
    }

    async connect() {
        if (!this.connectionPromise) {
            this.connectionPromise = this.connectUncached();
        }
        return this.connectionPromise;
    }

    async connectUncached() {
        if (this.exclusive) {
            for (let attempts = 0; attempts < 60; attempts++) {
                try {
                    this.client = await pool.connect();
                    this.client.on('error', () => {
                        this.client = null;
                        this.connectionPromise = null;
                        this.connect();
                    });
                    for (let listener of this.listeners) {
                        await this.attachListener(listener);
                    }
                    return;
                } catch (err) {
                    console.error(err);
                    await Bluebird.delay(1000);
                }
            }
        } else {
            await checkConnectionPool();
            this.client = pool;
        }
    }

    close() {
        if (this.client) {
            if (this.client !== pool) {
                this.client.removeAllListeners();
                this.client.release();
            }
            this.client = null;
            this.connectionPromise = null;
        }
    }

    async query(sql, parameters) {
        let result = await this.execute(sql, parameters);
        return (result) ? result.rows : [];
    }

    async execute(sql, parameters) {
        await this.connect();
        try {
            return this.client.query(sql, parameters);
        } catch (err) {
            if (err.message === 'Connection terminated') {
                await this.connect();
                return this.client.query(sql, parameters);
            } else {
                logError(err);
                throw err;
            }
        }
    }

    async begin() {
        if (!this.exclusive) {
            throw new Error('Cannot begin a transaction on a non-exclusive connection');
        }
        await this.execute('BEGIN TRANSACTION');
    }

    async commit() {
        await this.execute('COMMIT');
    }

    async rollback() {
        await this.execute('ROLLBACK');
    }

    async listen(tables, event, callback, delay) {
        if (!this.exclusive) {
            throw new Error('Cannot listen to a non-exclusive connection');
        }
        let listener = {
            queue: [],
            timeout: 0,
            event: event,
            tables: tables,
            callback: callback,
            channels: tables.map((table) => { return `${table}_${event}` }),
            delay: delay || 50,
        };
        this.listeners.push(listener);
        return this.attachListener(listener);
    }

    async attachListener(listener) {
        this.client.on('notification', this.processNotification.bind(this, listener));
        for (let channel of listener.channels) {
            await this.execute(`LISTEN ${channel}`);
        }
    }

    /**
     * Wait for a schema to come into existence
     *
     * @param  {String} schema
     * @param  {Number} wait
     */
    async need(schema, wait) {
        let startTime = new Date, now;
        let lastError;
        if (!wait) {
            wait = 10000;
        }
        do {
            now = new Date;
            try {
                let found = await this.schemaExists(schema);
                if (found) {
                    return;
                }
            } catch (err) {
                console.error(err);
                lastError = err;
            }
            await Bluebird.delay(500);
        } while ((now - startTime) < wait);
        if (!lastError) {
            lastError = new Error(`Schema does not exist: ${schema}`);
        }
        throw lastError;
    }

    /**
     * Check if a schema exists
     *
     * @param  {String} schema
     *
     * @return {Promise<Boolean>}
     */
    async schemaExists(schema) {
        let sql = `SELECT 1 FROM pg_namespace WHERE nspname = $1`;
        let rows = await this.query(sql, [ schema ]);
        return !!rows[0];
    }

    /**
     * Check if a user role exists
     *
     * @param  {String} username
     *
     * @return {Promise<Boolean>}
     */
    async roleExists(username) {
        let sql = `SELECT 1 FROM pg_roles WHERE rolname = $1`;
        let rows = await this.query(sql, [ username ]);
        return !!rows[0];
    }

    /**
     * Check if a function exists
     *
     * @param  {String} fname
     *
     * @return {Promise<Boolean>}
     */
    async functionExists(fname) {
        let sql = `SELECT 1 FROM pg_proc WHERE proname = $1;`;
        let rows = await this.query(sql, [ fname ]);
        return !!rows[0];
    }

    async processNotification(listener, msg) {
        if (listener.channels.indexOf(msg.channel) !== -1) {
            let event = JSON.parse(msg.payload);
            if (typeof(event) === 'number') {
                // we received the id of an oversized message
                // fetch it from the database
                let sql = `SELECT message FROM "message_queue" WHERE id = $1`;
                let rows = await this.query(sql, [ event ]);
                if (rows.length > 0) {
                    event = rows[0].message;
                } else {
                    event = null;
                }
            }
            if (event) {
                listener.queue.push(event);
                if (listener.timeout) {
                    clearTimeout(listener.timeout);
                }
                if (listener.delay === 0) {
                    this.dispatchNotifications(listener);
                } else {
                    listener.timeout = setTimeout(() => {
                        this.dispatchNotifications(listener);
                    }, listener.delay);
                }
            }
        }
    }

    dispatchNotifications(listener) {
        let events = listener.queue;
        listener.queue = [];
        listener.timeout = 0;
        try {
            listener.callback.call(this, events);
        } catch(err) {
            console.error(err.message);
        }
    }

    async updateJavaScriptRuntime() {
        try {
            await this.execute('CREATE EXTENSION IF NOT EXISTS plv8');
        } catch (err) {
            // CREATE EXTENSION... will fail initially if plv8_init() is undefined
            await this.execute('CREATE EXTENSION IF NOT EXISTS plv8');
        }
        // add JavaScript functions to global scope callable
        // the plv8 extension will run plv8_init() everytime
        // it creates a V8 context (this is set in the
        // command-line in Dockerfile)
        if (process.env.NODE_ENV !== 'production') {
            // ensure the code is syntatically correct by loading it here
            require('stored-procs/runtime');
        }
        let code = FS.readFileSync(`${__dirname}/stored-procs/runtime.js`, 'utf8');
        let sql = `
            CREATE OR REPLACE FUNCTION plv8_init() RETURNS void AS
            $BODY$
            ${code}
            $BODY$
            LANGUAGE plv8;
        `;
        await this.execute(sql);
    }

    async updateJavaScriptFunctions() {
        let files = [ 'functions.js', 'triggers.js' ];
        for (let file of files) {
            let module = require(`stored-procs/${file}`);
            for (let name in module) {
                let f = module[name];
                let m = /{([\s\S]*)}/.exec(f.toString());
                let code = m[1];
                let args = f.args;
                let ret = f.ret;
                let flags = f.flags || '';
                if (args === undefined) {
                    throw new Error(`${name}() does not have args attached`);
                }
                if (ret === undefined) {
                    throw new Error(`${name}() does not have ret attached`);
                }
                let sql = `
                    CREATE OR REPLACE FUNCTION "${name}"(${args}) RETURNS ${ret} AS
                    $BODY$
                    ${code}
                    $BODY$
                    LANGUAGE plv8 ${flags};
                `;
                await this.execute(sql);
            }
        }
    }

    async createDictionaries(languageCode) {
        const dictionaryFiles = {
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
        const stemDirctionaries = {
            fi: 'finnish_stem',
            hu: 'hungarian_stem',
        };
        // see if there's a dictionary file for the language
        let dictFile = dictionaryFiles[languageCode];
        if (dictFile) {
            // see if ispell dictionary already exists
            let dictName = `ispell_${dictFile}`;
            let sql = `
                SELECT dictname FROM pg_catalog.pg_ts_dict
                WHERE dictname = '${dictName}'
            `;
            let rows = await this.query(sql);
            if (rows.length > 0) {
                return;
            }
            let sql = `
                CREATE TEXT SEARCH DICTIONARY ${dictName} (
                    template  = ispell,
                    dictfile = ${dictFile},
                    afffile = ${dictFile},
                    stopwords = ${dictFile}
                )
            `;
            try {
                await this.execute(sql);
            } catch (err) {
                if (err.code === '23505') {
                    // unique_violation
                    return;
                } else {
                    throw err;
                }
            }
            return [ dictName, 'simple' ];
        } else {
            // use snowball dictionary if there's one
            let stem = stemDirctionaries[languageCode];
            return (stem) ? [ stem, 'simple' ] : [ 'simple' ]
        }
    }
}

Database.open = async function(exclusive) {
    let db = new Database(exclusive);
    await db.connect();
    return db;
};

function logError(err) {
    if (process.env.NODE_ENV !== 'production' && typeof(err.code) === 'string') {
        let programmingError;
        switch (err.code.substr(0, 2)) {
            case '42':
                programmingError = 'A syntax error or rule violation was encountered';
                break;
            case '22':
                programmingError = 'A data conversion error was encountered';
                break;
        }
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
    }
}

const BIGINT_OID = 20;
const TIMESTAMPTZ_OID = 1184
const TIMESTAMP_OID = 1114

/**
 * Retrieve timestamps from Postgres as ISO strings
 *
 * @param  {String} val
 *
 * @return {String}
 */
function parseDate(val) {
    if (val) {
        let date = new Date(val);
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
    let num = parseInt(val);
    if (Number.MIN_SAFE_INTEGER <= num && num <= Number.MAX_SAFE_INTEGER) {
        return num;
    } else {
        return val;
    }
}
Pg.types.setTypeParser(BIGINT_OID, parseBigInt);

export {
    Database as default,
    Database,
};
