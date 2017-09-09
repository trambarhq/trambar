var _ = require('lodash');
var Promise = require('bluebird');
var HttpError = require('errors/http-error');
var Data = require('accessors/data');
var Task = require('accessors/task');

module.exports = _.create(Data, {
    schema: 'global',
    table: 'picture',
    columns: {
        id: Number,
        gn: Number,
        deleted: Boolean,
        ctime: String,
        mtime: String,
        details: Object,
        purpose: String,
        user_id: Number,
    },
    criteria: {
        id: Number,
        deleted: Boolean,
        purpose: String,
        user_id: Number,
        url: String,
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
                purpose varchar(64) NOT NULL,
                user_id int NOT NULL DEFAULT 0,
                PRIMARY KEY (id)
            );
            CREATE INDEX ON ${table} ((details->'url'));
        `;
        return db.execute(sql);
    },

    /**
     * Attach triggers to this table, also add trigger on task so details
     * are updated when tasks complete
     *
     * @param  {Database} db
     * @param  {String} schema
     *
     * @return {Promise<Boolean>}
     */
    watch: function(db, schema) {
        return Data.watch.call(this, db, schema).then(() => {
            return Task.createUpdateTrigger(db, schema, this.table, 'updateAlbum');
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
        var table = this.getTableName(schema);
        var sql = `
            GRANT INSERT, SELECT, UPDATE, DELETE ON ${table} TO admin_role;
            GRANT INSERT, SELECT, UPDATE, DELETE ON ${table} TO client_role;
        `;
        return db.execute(sql).return(true);
    },

    /**
     * Add conditions to SQL query based on criteria object
     *
     * @param  {Object} criteria
     * @param  {Object} query
     */
    apply: function(criteria, query) {
        var special = [ 'url' ];
        Data.apply.call(this, _.omit(criteria, special), query);

        var params = query.parameters;
        var conds = query.conditions;
        if (criteria.url !== undefined) {
            params.push(criteria.url);
            conds.push(`details->>'url' = $${params.length}`);
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
     * @param  {Object} options
     *
     * @return {Promise<Object>}
     */
    export: function(db, schema, rows, credentials, options) {
        return Data.export.call(this, db, schema, rows, credentials, options).then((objects) => {
            _.each(objects, (object, index) => {
                var row = rows[index];
                object.purpose = row.purpose;
                object.user_id = row.user_id;
            });
            return objects;
        });
    },
});
