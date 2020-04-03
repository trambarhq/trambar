import Bluebird from 'bluebird';
import FS from 'fs';
import PgPool from 'pg-pool'
import Pg from 'pg';

export class Database {
  constructor(exclusive) {
    this.exclusive = exclusive;
    this.client = null;
    this.connectionPromise = null;
    this.listeners = [];
  }

  static async open(exclusive) {
    const db = new Database(exclusive);
    await db.connect();
    return db;
  }

  async connect() {
    do {
      if (!this.connectionPromise) {
        this.connectionPromise = this.connectUncached();
      }
      await this.connectionPromise;

      // in theory, the connection could be closed immediately
    } while (!this.client);
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
    const result = await this.execute(sql, parameters);
    return (result) ? result.rows : [];
  }

  async execute(sql, parameters) {
    await this.connect();
    try {

      const result = await this.client.query(sql, parameters);
      return result;
    } catch (err) {
      if (err.message === 'Connection terminated') {
        await this.connect();
        return this.execute(sql, parameters);
      } else {
        if (process.env.NODE_ENV !== 'production' && typeof(err.code) === 'string') {
          err.query = { sql, parameters };
        }
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
    const listener = {
      queue: [],
      timeout: 0,
      event,
      tables,
      callback,
      channels: tables.map(tbl => `${tbl}_${event}`),
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
    const startTime = new Date;
    let lastError;
    if (!wait) {
      wait = 10000;
    }
    let now;
    do {
      now = new Date;
      try {
        const found = await this.schemaExists(schema);
        if (found) {
          return;
        }
      } catch (err) {
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
    const sql = `SELECT 1 FROM pg_namespace WHERE nspname = $1`;
    const rows = await this.query(sql, [ schema ]);
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
    const sql = `SELECT 1 FROM pg_roles WHERE rolname = $1`;
    const rows = await this.query(sql, [ username ]);
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
    const sql = `SELECT 1 FROM pg_proc WHERE proname = $1;`;
    const [ rows ] = await this.query(sql, [ fname ]);
    return !!row;
  }

  /**
   * Return list of all schemas
   *
   * @param  {String} schema
   *
   * @return {Promise<Array<String>>}
   */
  async getSchemaNames() {
    const sql = `
      SELECT nspname FROM pg_catalog.pg_namespace
      WHERE nspname NOT IN ('pg_catalog', 'information_schema')
      AND nspname NOT LIKE 'pg_toast%'
      AND nspname NOT LIKE 'pg_temp%'
    `;
    const rows = await this.query(sql);
    return rows.map(r => r.nspname);
  }

  /**
   * Return the size of a database schema (in bytes)
   *
   * @param  {String} schema
   *
   * @return {Promise<Number>}
   */
  async getSchemaSize(schema) {
    const sql = `
      SELECT SUM(pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(tablename)))::BIGINT as size
      FROM pg_tables
      WHERE schemaname = $1
    `;
    const [ row ] = await this.query(sql, [ schema ]);
    return row.size;
  }

  async processNotification(listener, msg) {
    if (listener.channels.includes(msg.channel)) {
      let event = JSON.parse(msg.payload);
      if (typeof(event) === 'number') {
        // we received the id of an oversized message
        // fetch it from the database
        const sql = `SELECT message FROM "message_queue" WHERE id = $1`;
        const rows = await this.query(sql, [ event ]);
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
    const events = listener.queue;
    listener.queue = [];
    listener.timeout = 0;
    listener.callback.call(this, events);
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
    const runtime = await import('./stored-procs/runtime.mjs');
    const code = [];
    for (let [ name, f ] of Object.entries(runtime)) {
      if (name === '__init__') {
        const m = /{([\s\S]*)}/.exec(f.toString());
        code.push(m[1]);
      } else {
        code.push(f.toString());
      }
    }
    const sql = `
      CREATE OR REPLACE FUNCTION plv8_init() RETURNS void AS
      $BODY$
      ${code.join('\n')}
      $BODY$
      LANGUAGE plv8;
    `;
    await this.execute(sql);
  }

  async updateJavaScriptFunctions() {
    const files = [ 'functions.mjs', 'triggers.mjs' ];
    for (let file of files) {
      const module = await import(`./stored-procs/${file}`);
      for (let [ name, f ] of Object.entries(module)) {
        const m = /{([\s\S]*)}/.exec(f.toString());
        const code = m[1];
        const args = f.args;
        const ret = f.ret;
        const flags = f.flags || '';
        if (args === undefined) {
          throw new Error(`${name}() does not have args attached`);
        }
        if (ret === undefined) {
          throw new Error(`${name}() does not have ret attached`);
        }
        const sql = `
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
    const dictFile = dictionaryFiles[languageCode];
    if (dictFile) {
      // see if ispell dictionary already exists
      const dictName = `ispell_${dictFile}`;
      const sql1 = `
        SELECT dictname FROM pg_catalog.pg_ts_dict
        WHERE dictname = '${dictName}'
      `;
      const rows = await this.query(sql1);
      if (rows.length > 0) {
        return;
      }
      const sql2 = `
        CREATE TEXT SEARCH DICTIONARY ${dictName} (
          template  = ispell,
          dictfile = ${dictFile},
          afffile = ${dictFile},
          stopwords = ${dictFile}
        )
      `;
      try {
        await this.execute(sql2);
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
      const stem = stemDirctionaries[languageCode];
      return (stem) ? [ stem, 'simple' ] : [ 'simple' ]
    }
  }
}

const config = {
  host: process.env.POSTGRES_HOST,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
};

const pool = new PgPool(config);
pool.on('error', (err) => {
  poolCheckPromise = null;
});

let poolCheckPromise = null;

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
    const date = new Date(val);
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
  const num = parseInt(val);
  if (Number.MIN_SAFE_INTEGER <= num && num <= Number.MAX_SAFE_INTEGER) {
    return num;
  } else {
    return val;
  }
}
Pg.types.setTypeParser(BIGINT_OID, parseBigInt);
