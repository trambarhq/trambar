var _ = require('lodash');
var Promise = require('bluebird');
var Crypto = Promise.promisifyAll(require('crypto'));

var Data = require('accessors/data');

module.exports = _.create(Data, {
    schema: 'project',
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
        user_id: Number,
    },
    criteria: {
        id: Number,
        action: String,
        token: String,
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
                token varchar(64) NOT NULL,
                user_id int NOT NULL DEFAULT 0,
                PRIMARY KEY (id)
            );
        `;
        return db.execute(sql);
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
                action: row.action,
                token: row.token,
                user_id: row.user_id,
            };
            return object;
        });
    },

    /**
     * Import objects sent by client-side code, applying access control
     *
     * @param  {Database} db
     * @param  {Schema} schema
     * @param  {Array<Object>} objects
     * @param  {Array<Object>} originals
     * @param  {Object} credentials
     *
     * @return {Promise<Array>}
     */
    import: function(db, schema, objects, originals, credentials) {
        return Promise.map(objects, (object, index) => {
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
