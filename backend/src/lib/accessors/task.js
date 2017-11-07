var _ = require('lodash');
var Promise = require('bluebird');
var Crypto = Promise.promisifyAll(require('crypto'));
var Data = require('accessors/data');
var HttpError = require('errors/http-error');

module.exports = _.create(Data, {
    schema: 'both',
    table: 'task',
    columns: {
        id: Number,
        gn: Number,
        deleted: Boolean,
        ctime: String,
        mtime: String,
        details: Object,
        action: String,
        token: String,
        details: Object,
        completion: Number,
        user_id: Number,
        etime: String,
    },
    criteria: {
        id: Number,
        action: String,
        token: String,
        completion: Number,
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
                action varchar(64) NOT NULL,
                token varchar(64) NULL,
                options jsonb NOT NULL DEFAULT '{}',
                completion int NOT NULL DEFAULT 0,
                user_id int NOT NULL DEFAULT 0,
                etime timestamp,
                PRIMARY KEY (id)
            );
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
            var propNames = [];
            return this.createNotificationTriggers(db, schema, propNames);
        });
    },

    /**
     * Create a trigger on this table that updates another table
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {String} triggerName
     * @param  {String} method
     * @param  {Array<String>} arguments
     *
     * @return {Promise<Boolean>}
     */
    createUpdateTrigger: function(db, schema, triggerName, method, arguments) {
        var table = this.getTableName(schema);
        var sql = `
            CREATE TRIGGER "${triggerName}"
            AFTER UPDATE ON ${table}
            FOR EACH ROW
            EXECUTE PROCEDURE "${method}"(${arguments.join(', ')});
        `;
        return db.execute(sql).return(true);
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
                // TODO: access control
                var row = rows[index];
                object.action = row.action;
                object.token = row.token;
                object.user_id = row.user_id;
                object.options = row.options;
                object.completion = row.completion;
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
        return Data.import.call(this, db, schema, objects, originals, credentials).map((object, index) => {
            var original = originals[index];
            if (original) {
                // task cannot be modified
                throw new HttpError(403);
            }
            if (object.user_id !== credentials.user.id) {
                throw new HttpError(403);
            }
            return Crypto.randomBytesAsync(24).then((buffer) => {
                object.token = buffer.toString('hex');
                return object;
            });
        });
    },
});
