import _ from 'lodash';
import HTTPError from 'errors/http-error';
import { Data } from 'accessors/data';

class Spreadsheet extends Data {
    constructor() {
        super();
        this.schema = 'project';
        this.table = 'spreadsheet';
        _.extend(this.columns, {
            name: String,
            url: String,
            etag: String,
        });
        _.extend(this.criteria, {
            name: String,
            etag: String,
        });
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
        let table = this.getTableName(schema);
        let sql = `
            CREATE TABLE ${table} (
                id serial,
                gn int NOT NULL DEFAULT 1,
                deleted boolean NOT NULL DEFAULT false,
                ctime timestamp NOT NULL DEFAULT NOW(),
                mtime timestamp NOT NULL DEFAULT NOW(),
                details jsonb NOT NULL DEFAULT '{}',
                name varchar(128) NOT NULL DEFAULT '',
                etag varchar(128) NOT NULL DEFAULT '',
                url varchar(1024) NOT NULL DEFAULT '',
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
            await this.watch(db, schema);
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
        let table = this.getTableName(schema);
        let sql = `
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
        await this.createNotificationTriggers(db, schema, [
            'deleted',
            'name',
            'url',
            'etag',
        ]);
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
        let objects = await super.export(db, schema, rows, credentials, options);
        for (let [ index, object ] of objects.entries()) {
            let row = rows[index];
            object.name = row.name;
            object.etag = row.etag;
            object.url = row.url;
        }
        return objects;
    }

    /**
     * Import object sent by client-side code
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object} spreadsheetReceived
     * @param  {Object} spreadsheetBefore
     * @param  {Object} credentials
     * @param  {Object} options
     *
     * @return {Promise<Object>}
     */
    async importOne(db, schema, spreadsheetReceived, spreadsheetBefore, credentials, options) {
        let row = await super.importOne(db, schema, spreadsheetReceived, spreadsheetBefore, credentials, options);
        await this.ensureUniqueName(db, schema, spreadsheetBefore, spreadsheetReceived);
        return row;
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
}

const instance = new Spreadsheet;

export {
    instance as default,
    Spreadsheet,
};
