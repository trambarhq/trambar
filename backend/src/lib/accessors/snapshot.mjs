import { Data } from './data.mjs';

class Snapshot extends Data {
    constructor() {
        super();
        this.schema = 'global';
        this.table = 'snapshot';
        this.columns = {
            ...this.columns,
            repo_id: Number,
            branch_name: String,
            commit_id: String,
            head: Boolean,
        };
        this.criteria = {
            ...this.criteria,
            repo_id: Number,
            branch_name: String,
            commit_id: String,
            head: Boolean,
        };
        this.eventColumns = {
            ...this.eventColumns,
            head: Boolean,
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
                repo_id int NULL DEFAULT null,
                branch_name text NOT NULL DEFAULT '',
                commit_id text NOT NULL DEFAULT '',
                head bool NOT NULL DEFAULT false,
                PRIMARY KEY (id)
            );
            CREATE INDEX ON ${table} (repo_id, branch_name) WHERE deleted = false AND head = true;
            CREATE UNIQUE INDEX ON ${table} (repo_id, branch_name, commit_id) WHERE deleted = false;
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
            GRANT SELECT ON ${table} TO client_role;
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
     * See if a database change event is relevant to a given user
     *
     * @param  {Object} event
     * @param  {User} user
     * @param  {Subscription} subscription
     *
     * @return {Boolean}
     */
    isRelevantTo(event, user, subscription) {
        // objects aren't currently used on client-side
        return false;
    }
}

const instance = new Snapshot;

export {
    instance as default,
    Snapshot,
};
