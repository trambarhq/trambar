import _ from 'lodash';
import HTTPError from 'errors/http-error';
import { Data } from 'accessors/data';

class Frontend extends Data {
    constructor() {
        super();
        this.schema = 'global';
        this.table = 'frontend';
        _.extend(this.columns, {
            type: String,
            repo_id: Number,
            commit_id: Number,
            file_paths: Array(String),
            file_contents: Array(Buffer),
        });
        _.extend(this.criteria, {
            type: String,
            repo_id: Number,
            commit_id: Number,
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
                type varchar(32) NOT NULL DEFAULT '',
                repo_id int NOT NULL,
                commit_id int NOT NULL,
                file_paths text[],
                file_contents blob[]
            );
            CREATE UNIQUE INDEX ON ${table} (repo_id) WHERE deleted = false;
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
            GRANT INSERT, SELECT, UPDATE ON ${table} TO client_role;
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
            'type',
            'repo_id',
            'commit_id',
        ]);
    }

    async export(db, schema, rows, credentials, options) {
        throw new Error('Cannot export');
    }

    async import() {
        throw new Error('Cannot import');
    }
}

const instance = new Frontend;

export {
    instance as default,
    Frontend,
};
