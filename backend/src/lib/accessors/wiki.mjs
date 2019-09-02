import { ExternalData } from './external-data.mjs';

class Wiki extends ExternalData {
    constructor() {
        super();
        this.schema = 'project';
        this.table = 'wiki';
        this.columns = {
            ...this.columns,
            language_codes: Array(String),
            slug: String,
            public: Boolean,
            chosen: Boolean,
        };
        this.criteria = {
            ...this.criteria,
            language_codes: Array(String),
            slug: String,
            public: Boolean,
            chosen: Boolean,

            search: Object,
        };
        this.eventColumns = {
            ...this.eventColumns,
            slug: String,
            public: Boolean,
            chosen: Boolean,
            language_codes: Array(String),
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
                language_codes varchar(2)[] NOT NULL DEFAULT '{}'::text[],
                slug varchar(256) NOT NULL,
                public boolean NOT NULL DEFAULT false,
                chosen boolean NOT NULL DEFAULT false,
                external jsonb[] NOT NULL DEFAULT '{}',
                exchange jsonb[] NOT NULL DEFAULT '{}',
                itime timestamp,
                etime timestamp,
                PRIMARY KEY (id)
            );
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
     * Add conditions to SQL query based on criteria object
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object} criteria
     * @param  {Object} query
     *
     * @return {Promise}
     */
    async apply(db, schema, criteria, query) {
        const { search, ...basic } = criteria;
        super.apply(basic, query);
        if (search) {
            await this.applyTextSearch(db, schema, search, query);
        }
    }

    /**
     * Return SQL expression that yield searchable text
     *
     * @param  {String} languageCode
     *
     * @return {String}
     */
    getSearchableText(languageCode) {
        return `"extractWikiText"(details, '${languageCode}')`;
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
        return (subscription.area === 'admin');
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
            object.language_codes = row.language_codes;
            object.public = row.public;
            object.chosen = row.chosen;
            if (object.public || credentials.unrestricted || process.env.ADMIN_GUEST_MODE) {
                object.slug = row.slug;
            }
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
}

const instance = new Wiki;

export {
    instance as default,
    Wiki,
};
