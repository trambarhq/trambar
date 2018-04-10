var _ = require('lodash');
var Promise = require('bluebird');
var ExternalData = require('accessors/external-data');

module.exports = _.create(ExternalData, {
    schema: 'global',
    table: 'role',
    columns: {
        id: Number,
        gn: Number,
        deleted: Boolean,
        ctime: String,
        mtime: String,
        details: Object,
        name: String,
        disabled: Boolean,
        external: Array(Object),
        exchange: Array(Object),
        settings: Object,
        itime: String,
        etime: String,
    },
    criteria: {
        id: Number,
        deleted: Boolean,
        name: String,
        disabled: Boolean,
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
                name varchar(128) NOT NULL DEFAULT '',
                disabled boolean NOT NULL DEFAULT false,
                general boolean NOT NULL DEFAULT true,
                external jsonb[] NOT NULL DEFAULT '{}',
                exchange jsonb[] NOT NULL DEFAULT '{}',
                itime timestamp,
                etime timestamp,
                settings jsonb NOT NULL DEFAULT '{}',
                PRIMARY KEY (id)
            );
            CREATE UNIQUE INDEX ON ${table} (name) WHERE deleted = false;
        `;
        return db.execute(sql);
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
            var propNames = [ 'deleted', 'disabled', 'general', 'external', 'mtime', 'itime', 'etime' ];
            return this.createNotificationTriggers(db, schema, propNames).then(() => {
                // completion of tasks will automatically update details->resources
                var Task = require('accessors/task');
                return Task.createUpdateTrigger(db, schema, 'updateRole', 'updateResource', [ this.table ]);
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
        return ExternalData.export.call(this, db, schema, rows, credentials, options).then((objects) => {
            _.each(objects, (object, index) => {
                var row = rows[index];
                object.name = row.name;

                if (credentials.unrestricted) {
                    object.disabled = row.disabled;
                    object.settings = row.settings;
                } else {
                    if (row.disabled) {
                        object.disabled = row.disabled;
                    }
                }
            });
            return objects;
        });
    },

    /**
     * Import objects sent by client-side code, applying access control
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<Object>} objects
     * @param  {Array<Object>} originals
     * @param  {Object} credentials
     * @param  {Object} options
     *
     * @return {Promise<Array>}
     */
    import: function(db, schema, objects, originals, credentials, options) {
        return ExternalData.import.call(this, db, schema, objects, originals, credentials, options).mapSeries((roleReceived, index) => {
            var roleBefore = originals[index];
            return this.ensureUniqueName(db, schema, roleBefore, roleReceived);
        });
    },
});
