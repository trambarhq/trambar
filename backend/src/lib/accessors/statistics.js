import _ from 'lodash';
import Promise from 'bluebird';
import Crypto from 'crypto'
import LiveData from 'accessors/live-data';

const Statistics = _.create(LiveData, {
    schema: 'project',
    table: 'statistics',
    columns: {
        id: Number,
        gn: Number,
        deleted: Boolean,
        ctime: String,
        mtime: String,
        details: Object,
        atime: String,
        ltime: String,
        dirty: Boolean,
        type: String,
        filters: Object,
        filters_hash: String,
        sample_count: Number,
    },
    criteria: {
        id: Number,
        deleted: Boolean,
        dirty: Boolean,
        type: String,
        filters_hash: String,
        match_any: Array(Object),
    },

    /**
     * Create table in schemaroot
     *
     * @param  {Database} db
     * @param  {String} schema
     *
     * @return {Promise<Result>}
     */
    create: function(db, schema) {
        var table = this.getTableName(schema);
        var sql = `
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
        return db.execute(sql);
    },

    /**
     * Attach triggers to the table.
     *
     * @param  {Database} db
     * @param  {String} schema
     *
     * @return {Promise<Boolean>}
     */
    watch: function(db, schema) {
        return this.createChangeTrigger(db, schema).then(() => {
            var propNames = [ 'deleted', 'dirty', 'type', 'filters' ];
            return this.createNotificationTriggers(db, schema, propNames);
        });
    },

    /**
     * Add conditions to SQL query based on criteria object
     *
     * @param  {Object} criteria
     * @param  {Object} query
     */
    apply: function(criteria, query) {
        var special = [ 'filters', 'match_any' ];
        LiveData.apply.call(this, _.omit(criteria, special), query);

        var params = query.parameters;
        var conds = query.conditions;
        if (criteria.match_any) {
            var objects = `$${params.push(criteria.match_any)}`;
            conds.push(`"matchAny"(filters, ${objects})`);
        }
    },

    find: function(db, schema, criteria, columns) {
        // autovivify rows when type and filters are specified
        var type = criteria.type;
        var filters = criteria.filters;
        if (type && filters) {
            // calculate hash of filters for quicker look-up
            if (!(filters instanceof Array)) {
                filters = [ filters ];
            }
            var hashes = _.map(filters, hash);
            // key columns
            var keys = {
                type: type,
                filters_hash: hashes,
            };
            // properties of rows that are expected
            var expectedRows = _.map(hashes, (hash, index) => {
                return {
                    type: type,
                    filters_hash: hash,
                    filters: filters[index]
                };
            }) ;
            return this.vivify(db, schema, keys, expectedRows, columns);
        } else {
            return LiveData.find.call(this, db, schema, criteria, columns);
        }
    },

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
     * @return {Promise<Object>}
     */
    export: function(db, schema, rows, credentials, options) {
        return LiveData.export.call(this, db, schema, rows, credentials, options).then((objects) => {
            _.each(objects, (object, index) => {
                var row = rows[index];
                object.type = row.type;
                object.filters = row.filters;
            });
            return objects;
        });
    },

    /**
     * See if a database change event is relevant to a given user
     *
     * @param  {Object} event
     * @param  {User} user
     * @param  {Subscription} subscription
     *
     * @return {Boolean}
     */
    isRelevantTo: function(event, user, subscription) {
        if (LiveData.isRelevantTo.call(this, event, user, subscription)) {
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
    },
});

/**
 * Generate MD5 hash of filters object
 *
 * @param  {Object} filters
 *
 * @return {String}
 */
function hash(filters) {
    var values = {};
    var keys = _.sortBy(_.keys(filters));
    _.each(keys, (key) => {
        values[key] = filters[key];
    });
    var text = JSON.stringify(values);
    var hash = Crypto.createHash('md5').update(text);
    return hash.digest("hex");
}

export {
    Statistics as default,
    Statistics,
};
