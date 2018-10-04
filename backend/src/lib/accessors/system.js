var _ = require('lodash');
var Promise = require('bluebird');
var HTTPError = require('errors/http-error').default;
var Data = require('accessors/data');

module.exports = _.create(Data, {
    schema: 'global',
    table: 'system',
    columns: {
        id: Number,
        gn: Number,
        deleted: Boolean,
        ctime: String,
        mtime: String,
        details: Object,
        settings: Object,
    },
    criteria: {
        id: Number,
        deleted: Boolean,
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
                settings jsonb NOT NULL DEFAULT '{}',
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
        var table = this.getTableName(schema);
        var sql = `
            GRANT SELECT ON ${table} TO auth_role;
            GRANT INSERT, SELECT, UPDATE ON ${table} TO admin_role;
            GRANT SELECT ON ${table} TO client_role;
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
        return this.createChangeTrigger(db, schema).then(() => {
            // we need to know the previous settings when address changes, in
            // order to remove hook created previously
            var propNames = [ 'settings' ];
            return this.createNotificationTriggers(db, schema, propNames).then(() => {
                return this.createResourceCoalescenceTrigger(db, schema, []).then(() => {
                    // completion of tasks will automatically update details->resources
                    var Task = require('accessors/task');
                    return Task.createUpdateTrigger(db, schema, 'updateSystem', 'updateResource', [ this.table ]);
                });
            });
        });
    },

    /**
     * Export database row to client-side code, omitting sensitive or
     * unnecessary information
     *
     * @param  {Database} db
     * @param  {String} schema
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
                if (credentials.unrestricted) {
                    object.settings = row.settings;
                } else {
                    object.settings = _.pick(row.settings, [
                        'address',
                        'push_relay',
                    ]);
                }
            });
            return objects;
        });
    },

    /**
     * Throw an exception if modifications aren't permitted
     *
     * @param  {Object} systemReceived
     * @param  {Object} systemBefore
     * @param  {Object} credentials
     */
    checkWritePermission: function(systemReceived, systemBefore, credentials) {
        if (credentials.unrestricted) {
            return;
        }
        throw new HTTPError(403);
    },
});
