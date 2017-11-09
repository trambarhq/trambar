var _ = require('lodash');
var Promise = require('bluebird');
var Data = require('accessors/data');

module.exports = _.create(Data, {
    schema: 'global',
    table: 'authentication',
    columns: {
        id: Number,
        gn: Number,
        deleted: Boolean,
        ctime: String,
        mtime: String,
        details: Object,
        user_id: Number,
        server_id: Number,
        token: String,
        area: String,
    },
    criteria: {
        id: Number,
        deleted: Boolean,
        user_id: Number,
        server_id: Number,
        token: String,
        area: String,

        older_than: String,
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
        var table = `"global"."${this.table}"`;
        var sql = `
            CREATE TABLE ${table} (
                id serial,
                gn int NOT NULL DEFAULT 1,
                deleted boolean NOT NULL DEFAULT false,
                ctime timestamp NOT NULL DEFAULT NOW(),
                mtime timestamp NOT NULL DEFAULT NOW(),
                details jsonb NOT NULL DEFAULT '{}',
                token varchar(64) NOT NULL,
                area varchar(64) NOT NULL,
                user_id int,
                server_id int,
                PRIMARY KEY (id)
            );
            CREATE INDEX ON ${table} (token);
        `;
        return db.execute(sql);
    },

    /**
     * Grant privileges to table to appropriate Postgres users
     *
     * @param  {Database} db
     * @param  {String} schema
     *
     * @return {Promise<Boolean>}
     */
    grant: function(db, schema) {
        var table = this.getTableName(schema);
        var sql = `
            GRANT INSERT, SELECT, UPDATE, DELETE ON ${table} TO auth_role;
        `;
        return db.execute(sql).return(true);
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
        return this.createChangeTrigger(db, schema);
    },

    /**
     * Add conditions to SQL query based on criteria object
     *
     * @param  {Object} criteria
     * @param  {Object} query
     *
     * @return {Promise}
     */
    apply: function(criteria, query) {
        var special = [
            'older_than',
        ];
        Data.apply.call(this, _.omit(criteria, special), query);

        var params = query.parameters;
        var conds = query.conditions;
        if (criteria.older_than !== undefined) {
            conds.push(`ctime < $${params.push(criteria.older_than)}`);
        }
    },

    import: null,
    export: null,
});
