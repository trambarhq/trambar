var _ = require('lodash');
var Promise = require('bluebird');

module.exports = {
    schema: 'global',
    table: 'authorization',
    columns: {
        id: Number,
        handle_token: String,
        device_registration_id: String,
        details: Object,
    },
    criteria: {
        device_registration_id: String,
        handle_token: String,
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
                handle_token varchar(64) NOT NULL,
                device_registration_id varchar(1024) NOT NULL,
                details jsonb NOT NULL DEFAULT '{}',
                PRIMARY KEY (id)
            );
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
        var table = `"global"."${this.table}"`;
        var privileges = 'INSERT, SELECT, UPDATE, DELETE';
        var sql = `
            GRANT ${privileges} ON ${table} TO internal_role;
        `;
        return db.execute(sql).return(true);
    },

    /**
     * Not watching table
     *
     * @param  {Database} db
     * @param  {String} schema
     *
     * @return {Promise<Boolean>}
     */
    watch: function(db, schema) {
        return Promise.resolve(false);
    },

    findOne: function(db, schema, criteria, columns) {
        var table = `"global"."${this.table}"`;
        if (criteria.device_registration_id) {
            var sql = `SELECT ${columns} FROM ${table} WHERE device_registration_id = $1`;
            var parameters = [ criteria.device_registration_id ];
            return db.query(sql, parameters).get(0).then((row) => {
                return row || null;
            });
        } else {
            if (criteria.handle_token) {
                var sql = `SELECT ${columns} FROM ${table} WHERE handle_token = $1`;
                var parameters = [ criteria.handle_token ];
                return db.query(sql, parameters).get(0).then((row) => {
                    return row || null;
                });
            }
        } else {
            return Promise.resolve(null);
        }
    },
};
