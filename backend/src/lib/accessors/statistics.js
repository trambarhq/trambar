var _ = require('lodash');
var Promise = require('bluebird');

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
    },
    criteria: {
        id: Number,
        deleted: Boolean,
        dirty: Boolean,
        type: String,
    },

    /**
     * Create table in schema
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
                PRIMARY KEY (id)
            );
        `;
        return db.execute(sql);
    },

    apply: function(criteria, query) {
        LiveData.apply.call(this, _.omit(criteria, 'filters'), query);
        if (criteria.filters) {
            var params = query.parameters;
            var conds = query.conditions;
            params.push(criteria.filters);
            conds.push(`"matchAny"(filters, $${params.length})`);
        }
    },
});
