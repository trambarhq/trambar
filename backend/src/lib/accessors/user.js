var _ = require('lodash');
var Promise = require('bluebird');
var Data = require('accessors/data');

module.exports = _.create(Data, {
    schema: 'global',
    table: 'user',
    columns: {
        id: Number,
        gn: Number,
        ctime: String,
        mtime: String,
        details: Object,
        type: String,
        username: String,
        project_ids: Array(Number),
        role_ids: Array(Number),
        server_id: Number,
        external_id: Number,
        hidden: Boolean,
    },
    criteria: {
        id: Number,
        type: String,
        username: String,
        project_ids: Array(Number),
        role_ids: Array(Number),
        server_id: Number,
        external_id: Number,
        hidden: Boolean,
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
                type varchar(32) NOT NULL DEFAULT '',
                username varchar(128),
                project_ids int[] NOT NULL DEFAULT '{}'::int[],
                role_ids int[] NOT NULL DEFAULT '{}'::int[],
                server_id int,
                external_id bigint,
                hidden boolean NOT NULL DEFAULT false,
                PRIMARY KEY (id)
            );
            CREATE INDEX ON ${table} ((details->>'email')) WHERE details ? 'email';
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
            GRANT INSERT, SELECT, UPDATE, DELETE ON ${table} TO admin_role;
            GRANT INSERT, SELECT, UPDATE, DELETE ON ${table} TO client_role;
        `;
        return db.execute(sql).return(true);
    },

    apply: function(criteria, query) {
        var special = [ 'email' ];
        Data.apply.call(this, _.omit(criteria, special), query);

        var params = query.parameters;
        var conds = query.conditions;
        if (criteria.email !== undefined) {
            params.push(criteria.email);
            conds.push(`details->>'email' = $${params.length}`);
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
            var object = {
                id: row.id,
                gn: row.gn,
                details: row.details,
                type: row.type,
                username: row.username,
                name: row.name,
                project_ids: row.project_ids,
                role_ids: row.role_ids,
                hidden: row.hidden,
            };
            return object;
        });
    }
});
