import _ from 'lodash';
import Crypto from 'crypto'
import { LiveData } from './live-data.mjs';

class Statistics extends LiveData {
    constructor() {
        super();
        this.schema = 'project';
        this.table = 'statistics';
        _.extend(this.columns, {
            type: String,
            filters: Object,
            filters_hash: String,
            sample_count: Number,
        });
        _.extend(this.criteria, {
            type: String,
            filters_hash: String,
            match_any: Array(Object),
        });
    }

    /**
     * Create table in schemaroot
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
                atime timestamp,
                ltime timestamp,
                dirty boolean NOT NULL DEFAULT false,
                type varchar(64) NOT NULL,
                filters jsonb NOT NULL,
                filters_hash varchar(32) NOT NULL,
                sample_count int NOT NULL DEFAULT 0,
                PRIMARY KEY (id)
            );
            CREATE INDEX ON ${table} (filters_hash, type) WHERE deleted = false;
            CREATE UNIQUE INDEX ON ${table} (id) WHERE dirty = true;
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
            'dirty',
            'type',
            'filters'
        ]);
    }

    /**
     * Add conditions to SQL query based on criteria object
     *
     * @param  {Object} criteria
     * @param  {Object} query
     */
    apply(criteria, query) {
        let special = [ 'filters', 'match_any' ];
        super.apply(_.omit(criteria, special), query);

        let params = query.parameters;
        let conds = query.conditions;
        if (criteria.match_any) {
            let objects = `$${params.push(criteria.match_any)}`;
            conds.push(`"matchAny"(filters, ${objects})`);
        }
    }

    /**
     * Look for rows matching type and filters, creating empty rows if they're
     * not yet there
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object|null} criteria
     * @param  {String} columns
     *
     * @return {Promise<Array>}
     */
    async find(db, schema, criteria, columns) {
        // autovivify rows when type and filters are specified
        let type = criteria.type;
        let filters = criteria.filters;
        if (type && filters) {
            if (!(filters instanceof Array)) {
                filters = [ filters ];
            }
            // calculate hash of filters for quicker look-up
            let hashes = _.map(filters, hash);
            // key columns
            let keys = {
                type: type,
                filters_hash: hashes,
            };
            // properties of rows that are expected
            let expectedRows = _.map(hashes, (hash, index) => {
                return {
                    type: type,
                    filters_hash: hash,
                    filters: filters[index]
                };
            });
            return this.vivify(db, schema, keys, expectedRows, columns);
        } else {
            return super.find(db, schema, criteria, columns);
        }
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
            object.type = row.type;
            object.filters = row.filters;
        }
        return objects;
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
        if (super.isRelevantTo(event, user, subscription)) {
            switch (event.current.type) {
                case 'story-popularity':
                    // used for ranking stories only
                    break;
                case 'daily-notifications':
                    if (event.current.filters.target_user_id !== user.id) {
                        break;
                    }
                default:
                    return true;
            }
        }
        return false;
    }
}

/**
 * Generate MD5 hash of filters object
 *
 * @param  {Object} filters
 *
 * @return {String}
 */
function hash(filters) {
    let keys = _.sortBy(_.keys(filters));
    let values = {};
    for (let key of keys) {
        values[key] = filters[key];
    }
    let text = JSON.stringify(values);
    let hash = Crypto.createHash('md5').update(text);
    return hash.digest("hex");
}

const instance = new Statistics;

export {
    instance as default,
    Statistics,
};
