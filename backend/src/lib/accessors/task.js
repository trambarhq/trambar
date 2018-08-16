var _ = require('lodash');
var Promise = require('bluebird');
var Data = require('accessors/data');
var HTTPError = require('errors/http-error');

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
        options: Object,
        details: Object,
        completion: Number,
        failed: Boolean,
        user_id: Number,
        etime: String,
    },
    criteria: {
        id: Number,
        deleted: Boolean,
        action: String,
        token: String,
        completion: Number,
        failed: Boolean,
        deleted: Boolean,
        user_id: Number,
        options: Object,
        etime: String,

        newer_than: String,
        older_than: String,
        complete: Boolean,
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
                token varchar(64),
                options jsonb NOT NULL DEFAULT '{}',
                completion int NOT NULL DEFAULT 0,
                failed boolean NOT NULL DEFAULT false,
                user_id int,
                etime timestamp,
                PRIMARY KEY (id)
            );
            CREATE UNIQUE INDEX ON ${table} (token) WHERE token IS NOT NULL AND deleted = false;
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
            var propNames = [ 'action', 'user_id', 'server_id', 'failed', 'deleted' ];
            return this.createNotificationTriggers(db, schema, propNames);
        });
    },

    /**
     * Add conditions to SQL query based on criteria object
     *
     * @param  {Object} criteria
     * @param  {Object} query
     *
     * @return {Promise}
     */
    apply: function(criteria, query) {
        var special = [
            'options',
            'newer_than',
            'older_than',
            'complete',
        ];
        Data.apply.call(this, _.omit(criteria, special), query);

        var params = query.parameters;
        var conds = query.conditions;
        if (criteria.options !== undefined) {
            conds.push(`options @> $${params.push(criteria.options)}`);
        }
        if (criteria.newer_than !== undefined) {
            conds.push(`ctime > $${params.push(criteria.newer_than)}`);
        }
        if (criteria.older_than !== undefined) {
            conds.push(`ctime < $${params.push(criteria.older_than)}`);
        }
        if (criteria.complete !== undefined) {
            if (criteria.complete) {
                conds.push(`completion = 100`);
            } else {
                conds.push(`completion <> 100`);
            }
        }
    },

    /**
     * Insert rows into table
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<Object>} rows
     *
     * @return {Promise<Array<Object>>}
     */
    insert: function(db, schema, rows) {
        return Data.insert.call(this, db, schema, rows).catch((err) => {
            if (err.code === '23505' && rows.length === 1) {
                // duplicate token--same token is being sent again for some
                // reason; look for the row and return it
                console.warn(`Duplicate task token: ${rows[0].token}`);
                var criteria = {
                    action:  rows[0].action,
                    token: rows[0].token,
                    user_id: rows[0].user_id,
                    deleted: false,
                };
                return this.find(db, schema, criteria, '*').then((rows) => {
                    if (rows.length === 1) {
                        return rows;
                    } else {
                        throw err;
                    }
                });
            }
            throw err;
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
                // TODO: access control
                var row = rows[index];
                object.action = row.action;
                object.token = row.token;
                object.user_id = row.user_id;
                object.etime = row.etime;
                object.failed = row.failed;
                object.completion = row.completion;
                if (credentials.area === 'admin') {
                    object.server_id = row.server_id;
                    object.options = row.options;
                } else {
                    delete object.details;
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
        return Data.import.call(this, db, schema, objects, originals, credentials).mapSeries((taskReceived, index) => {
            var taskBefore = originals[index];
            if (taskBefore) {
                // task cannot be modified
                throw new HTTPError(400);
            }
            if (taskReceived.user_id !== credentials.user.id) {
                throw new HTTPError(403);
            }
            return taskReceived;
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
        if (Data.isRelevantTo.call(this, event, user, subscription)) {
            if (event.current.user_id) {
                if (event.current.user_id === user.id) {
                    return true;
                }
            } else {
                if (subscription.area === 'admin') {
                    return true;
                }
            }
        }
        return false;
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
});
