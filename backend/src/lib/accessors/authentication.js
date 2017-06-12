var _ = require('lodash');
var Promise = require('bluebird');
var BCrypt = Promise.promisifyAll(require('bcrypt'));

module.exports = {
    schema: 'global',
    table: 'authentication',
    columns: {
        id: Number,
        type: String,
        user_id: Number,
        details: Object,
    },
    criteria: {
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
        var table = `"global"."${this.table}"`;
        var sql = `
            CREATE TABLE ${table} (
                id serial,
                type varchar(32) NOT NULL,
                user_id int NOT NULL,
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
        if (criteria.type === 'password') {
            var sql = `
                SELECT ${columns}, details->>'password_hash' AS hash
                FROM ${table}
                WHERE type = 'password'
                AND details->>'username' = $1
            `;
            var parameters = [ criteria.username ];
            return db.query(sql, parameters).get(0).then((row) => {
                // process a bogus hash when record is missing to maintain
                // the same time requirement
                var hash = _.get(row, 'hash') || bogusHash;
                return BCrypt.compareAsync(criteria.password, hash).then((match) => {
                    if (!match || row === undefined) {
                        return null;
                    }
                    return _.omit(row, 'hash');
                });
            });
        } else {
            return Promise.resolve(null);
        }
    },

    insertOne: function(db, schema, row) {
        var table = `"global"."${this.table}"`;
        if (row.type === 'password') {
            return BCrypt.hashAsync(row.password, 10).then((hash) => {
                var details = {
                    username: row.username,
                    password_hash: hash,
                };
                var params = [ row.type, row.user_id, details ];
                var sql = `
                    INSERT INTO ${table} (type, user_id, details)
                    VALUES ($1, $2, $3)
                    RETURNING *
                `;
                return db.query(sql, params).get(0).then((row) => {
                    return row || null;
                })
            });
        } else {
            return Promise.resolve(null);
        }
    }
};

var bcryptRounds = 10;
var bogusHash = '';
BCrypt.hash('not a password', bcryptRounds, (err, hash) => {
    bogusHash = hash;
});
