var _ = require('lodash');
var Promise = require('bluebird');
var Crypto = require('crypto')

var LiveData = require('accessors/live-data');

module.exports = _.create(LiveData, {
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
    keys: [ 'type', 'filters_hash' ],

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
                type varchar(64) NOT NULL DEFAULT '',
                filters jsonb NOT NULL DEFAULT '{}',
                filters_hash varchar(32) NOT NULL DEFAULT '',
                sample_count int NOT NULL DEFAULT 0,
                PRIMARY KEY (id)
            );
        `;
        return db.execute(sql);
    },

    apply: function(criteria, query) {
        var special = [ 'filters', 'match_any' ];
        LiveData.apply.call(this, _.omit(criteria, special), query);

        var params = query.parameters;
        var conds = query.conditions;
        if (criteria.match_any) {
            params.push(criteria.match_any);
            conds.push(`"matchAny"(filters, $${params.length})`);
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
     * @param  {Schema} schema
     * @param  {Array<Object>} rows
     * @param  {Object} credentials
     *
     * @return {Promise<Object>}
     */
    export: function(db, schema, rows, credentials) {
        return Promise.map(rows, (row) => {
            this.touch(db, schema, row);
            var object = {
                id: row.id,
                gn: row.gn,
                details: row.details,
                type: row.type,
                filters: row.filters,
            };
            if (row.dirty) {
                object.dirty = true;
            }
            return object;
        });
    }
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
    var keys = _.keys(filters).sort();
    _.each(keys, (key) => {
        values[key] = filters[key];
    });
    var text = JSON.stringify(values);
    var hash = Crypto.createHash('md5').update(text);
    return hash.digest("hex");
}
