var _ = require('lodash');
var Promise = require('bluebird');

module.exports = {
    schema: 'global',
    table: 'authorization',
    columns: {
        id: Number,
        user_id: Number,
        token: String,
        expiration_date: String,
    },
    criteria: {
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
                expiration_date date NOT NULL,
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
     * Attach a trigger to the table that increment the gn (generation number)
     * when a row is updated. Also add triggers that send notification messages.
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
        if (criteria.token) {
            var sql = `
                SELECT ${columns}
                FROM ${table}
                WHERE token = $1
            `;
            var parameters = [ criteria.token ];
            return db.query(sql, parameters).get(0).then((row) => {
                return row || null;
            });
        } else {
            return Promise.resolve(null);
        }
    },

    saveOne: function(db, schema, object) {
        if (object.id) {
            return this.updateOne(db, schema, object);
        } else {
            return this.insertOne(db, schema, object);
        }
    },

    insertOne: function(db, schema, object) {
        var table = `"global"."${this.table}"`;
        var sql = `
            INSERT INTO ${table} (user_id, token, expiration_date)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        var params = [ object.user_id, object.token, object.expiration_date ];
        return db.query(sql, params).get(0).then((row) => {
            return row || null;
        });
    },

    updateOne: function(db, schema, object) {
        var table = `"global"."${this.table}"`;
        var sql = `
            UPDATE ${table}
            SET token = $1, expiration_date = $2
            WHERE id = $3
            RETURNING *
        `;
        var params = [ object.token, object.expiration_date, object.id ];
        return db.query(sql, params).get(0).then((row) => {
            return row || null;
        });
    },
};
