var _ = require('lodash');
var Promise = require('bluebird');
var HTTPError = require('errors/http-error');
var Data = require('accessors/data');

module.exports = _.create(Data, {
    schema: 'global',
    table: 'device',
    columns: {
        id: Number,
        gn: Number,
        deleted: Boolean,
        ctime: String,
        mtime: String,
        type: String,
        details: Object,
        uuid: String,
        user_id: Number,
        session_handle: String,
    },
    criteria: {
        id: Number,
        deleted: Boolean,
        type: String,
        uuid: String,
        user_id: Number,
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
                type varchar(32) NOT NULL,
                uuid varchar(128) NOT NULL,
                user_id int NOT NULL,
                session_handle varchar(16) NOT NULL,
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
            var propNames = [ 'deleted', 'type', 'user_id', 'session_handle' ];
            return this.createNotificationTriggers(db, schema, propNames);
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
                object.user_id = row.user_id;
                object.type = row.type;
                object.session_handle = row.session_handle;

                if (row.user_id !== credentials.user.id) {
                    throw new HTTPERror(403);
                }
            });
            return objects;
        });
    },

    /**
     * See if a database change event is relevant to a given user
     *
     * @param  {Object} event
     * @param  {User} user
     * @param  {Subscription} subscription
     *
     * @return {Boolean}
     */
    isRelevantTo: function(event, user, subscription) {
        if (subscription.area === 'admin') {
            // admin console doesn't use this object currently
            return false;
        }
        if (Data.isRelevantTo.call(this, event, user, subscription)) {
            if (event.current.user_id === user.id) {
                return true;
            }
        }
        return false;
    },
});
