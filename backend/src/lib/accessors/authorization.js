var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var Data = require('accessors/data');

module.exports = _.create(Data, {
    schema: 'global',
    table: 'authorization',
    columns: {
        id: Number,
        gn: Number,
        deleted: Boolean,
        ctime: String,
        mtime: String,
        details: Object,
        user_id: Number,
        token: String,
        area: String,
        expiration_date: String,
    },
    criteria: {
        id: Number,
        deleted: Boolean,
        user_id: Number,
        token: String,
        area: String,
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
                user_id int NOT NULL,
                token varchar(64) NOT NULL,
                area varchar(64) NOT NULL,
                expiration_date date NOT NULL,
                PRIMARY KEY (id)
            );
            CREATE INDEX ON ${table} (token);
        `;
        return db.execute(sql).then(() => {
            // create stored procs for checking and extending authorization
            // these will run as the root user
            var storeProcs = {
                checkAuthorization: {
                    function: function(token, area) {
                        var sql = `SELECT user_id, area FROM ${table}
                                   WHERE token = $1
                                   AND (area = $2 OR $2 IS NULL)
                                   AND expiration_date >= current_date
                                   AND deleted = false
                                   LIMIT 1`;
                        var row = plv8.execute(sql, [ token, area ])[0];
                        return (row) ? row.user_id : null;
                    },
                    arguments: 'token text, area text',
                    return: 'int',
                },

                extendAuthorization: {
                    function: function(token, expire) {
                        var sql = `UPDATE ${table}
                                   SET expiration_date = $2
                                   WHERE token = $1
                                   AND deletd = false`;
                        plv8.execute(sql, [ token, expire ]);
                    },
                    arguments: 'token text, expire date',
                    return: 'void',
                },
            };
            var sql = _.map(storeProcs, (proc, name) => {
                var m = /{([\s\S]*)}/.exec(proc.function);
                var code = m[1];
                return `
                    CREATE OR REPLACE FUNCTION "${name}"(${proc.arguments}) RETURNS ${proc.return}
                    AS $$\n${code}\n$$
                    LANGUAGE plv8 SECURITY DEFINER;
                `
            }).join('\n');
            // replace "${table}" with actual value since the functions aren't
            // actual closures
            sql = _.replace(sql, /\${table}/g, table);
            return db.execute(sql);
        });
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
        // authorization check is performed through a stored procedure
        // other DB roles don't need direct access to this table
        var table = this.getTableName(schema);
        var sql = `
            GRANT INSERT, SELECT, UPDATE, DELETE ON ${table} TO auth_role;
        `;
        return db.execute(sql).return(true);
    },

    /**
     * Check if authorization token is valid
     *
     * @param  {Database} db
     * @param  {String} token
     * @param  {String} area
     *
     * @return {Promise<Number|null>}
     */
    check: function(db, token, area) {
        var sql = `SELECT "checkAuthorization"($1, $2) AS user_id`;
        return db.query(sql, [ token, area ]).then((rows) => {
            return (rows[0]) ? rows[0].user_id : null;
        });
    },

    /**
     * Extend authorization til the given number of day from now
     *
     * @param  {Database} db
     * @param  {String} token
     * @param  {Number} days
     *
     * @return {Promise}
     */
    extend: function(db, token, days) {
        var sql = `SELECT "extendAuthorization"($1, $2) AS result`;
        var expire = Moment().add(days, 'day').format('YYYY-MM-DD');
        return db.query(sql, [ token, expire ]).return();
    },

    import: null,
    export: null,
});
