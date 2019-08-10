import _ from 'lodash';
import HTTPError from '../common/errors/http-error.mjs';
import { Data } from './data.mjs';

class Spreadsheet extends Data {
    constructor() {
        super();
        this.schema = 'project';
        this.table = 'spreadsheet';
        this.columns = {
            ...this.columns,
            disabled: Boolean,
            name: String,
            url: String,
            etag: String,
        };
        this.criteria = {
            ...this.criteria,
            disabled: Boolean,
            name: String,
            url: String,
            etag: String,
        };
        this.eventColumns = {
            ...this.eventColumns,
            disabled: Boolean,
            name: String,
        };
        this.version = 3;
    }

    /**
     * Create table in schema
     *
     * @param  {Database} db
     * @param  {String} schema
     *
     * @return {Promise}
     */
    async create(db, schema) {
        const table = this.getTableName(schema);
        const sql = `
            CREATE TABLE ${table} (
                id serial,
                gn int NOT NULL DEFAULT 1,
                deleted boolean NOT NULL DEFAULT false,
                ctime timestamp NOT NULL DEFAULT NOW(),
                mtime timestamp NOT NULL DEFAULT NOW(),
                details jsonb NOT NULL DEFAULT '{}',
                name text NOT NULL DEFAULT '',
                etag text NOT NULL DEFAULT '',
                url text NOT NULL DEFAULT '',
                disabled boolean NOT NULL DEFAULT false,
                PRIMARY KEY (id)
            );
            CREATE UNIQUE INDEX ON ${table} (name) WHERE deleted = false;
        `;
        await db.execute(sql);
    }

    /**
     * Upgrade table in schema to given DB version (from one version prior)
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Number} version
     *
     * @return {Promise<Boolean>}
     */
    async upgrade(db, schema, version) {
        if (version === 3) {
            await this.create(db, schema);
            await this.grant(db, schema);
            return true;
        }
        return false;
    }

    /**
     * Grant privileges to table to appropriate Postgres users
     *
     * @param  {Database} db
     * @param  {String} schema
     *
     * @return {Promise}
     */
    async grant(db, schema) {
        const table = this.getTableName(schema);
        const sql = `
            GRANT INSERT, SELECT, UPDATE ON ${table} TO admin_role;
            GRANT SELECT, UPDATE ON ${table} TO client_role;
        `;
        await db.execute(sql);
    }

    /**
     * Attach triggers to the table.
     *
     * @param  {Database} db
     * @param  {String} schema
     *
     * @return {Promise}
     */
    async watch(db, schema) {
        await this.createChangeTrigger(db, schema);
        await this.createNotificationTriggers(db, schema);
    }

    /**
     * Export database row to client-side code, omitting sensitive or
     * unnecessary information
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<Object>} rows
     * @param  {Object} credentials
     * @param  {Object} options
     *
     * @return {Promise<Array<Object>>}
     */
    async export(db, schema, rows, credentials, options) {
        const objects = await super.export(db, schema, rows, credentials, options);
        for (let [ index, object ] of objects.entries()) {
            const row = rows[index];
            object.disabled = row.disabled;
            object.name = row.name;
            object.etag = row.etag;
            object.url = row.url;
        }
        return objects;
    }

    /**
     * Throw an exception if modifications aren't permitted
     *
     * @param  {Object} spreadsheetReceived
     * @param  {Object} spreadsheetBefore
     * @param  {Object} credentials
     */
    checkWritePermission(spreadsheetReceived, spreadsheetBefore, credentials) {
        if (credentials.unrestricted) {
            return;
        }
        throw new HTTPError(403);
    }

    /**
     * Save a row, appending a number if a name conflict occurs
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {user} object
     *
     * @return {Promise<Object>}
     */
    async saveUnique(db, schema, object) {
        // this doesn't work within a transaction
        try {
            const objectAfter = await this.saveOne(db, schema, object);
            return objectAfter;
        } catch (err) {
            // unique violation
            if (err.code === '23505') {
                object = { ...object };
                const m = /(.*)(\d+)$/.exec(object.name);
                if (m) {
                    const number = parseInt(m[2]);
                    object.name = m[1] + (number + 1);
                } else {
                    object.name += '2';
                }
                return this.saveUnique(db, schema, object);
            }
            throw err;
        }
    }
}

const instance = new Spreadsheet;

export {
    instance as default,
    Spreadsheet,
};
