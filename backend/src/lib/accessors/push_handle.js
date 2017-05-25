var _ = require('lodash');
var Promise = require('bluebird');

module.exports = {
    schema: 'global',
    table: 'authorization',
    columns: {
        id: Number,
        user_id: Number,
        token: String,
        details: Object,
    },
    criteria: {
        user_id: Number,
        token: String,
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
                user_id int NOT NULL,
                token varchar(64) NOT NULL,
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
            GRANT ${privileges} ON ${table} TO webfacing_role;
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
        if (criteria.user_id) {
            var sql = `SELECT ${columns} FROM ${table} WHERE user_id = $1`;
            var parameters = [ criteria.user_id ];
            return db.query(sql, parameters).get(0).then((row) => {
                return row || null;
            });
        } else if (criteria.token) {
            var sql = `SELECT ${columns} FROM ${table} WHERE token = $1`;
            var parameters = [ criteria.token ];
            return db.query(sql, parameters).get(0).then((row) => {
                return row || null;
            });
        } else {
            return Promise.resolve(null);
        }
    },
};
