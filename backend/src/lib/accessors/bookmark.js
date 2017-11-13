var _ = require('lodash');
var Promise = require('bluebird');
var HttpError = require('errors/http-error');
var Data = require('accessors/data');

module.exports = _.create(Data, {
    schema: 'project',
    table: 'bookmark',
    columns: {
        id: Number,
        gn: Number,
        deleted: Boolean,
        ctime: String,
        mtime: String,
        details: Object,
        story_id: Number,
        user_ids: Array(Number),
        target_user_id: Number,
    },
    criteria: {
        id: Number,
        deleted: Boolean,
        story_id: Number,
        user_ids: Array(Number),
        target_user_id: Number,
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
                story_id int NOT NULL DEFAULT 0,
                user_ids int[] NOT NULL DEFAULT '{}'::int[],
                target_user_id int NOT NULL DEFAULT 0,
                public boolean NOT NULL DEFAULT false,
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
            var propNames = [ 'story_id', 'user_ids', 'target_user_id', 'public' ];
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
                object.story_id = row.story_id;
                object.user_ids = row.user_ids;
                object.target_user_id = row.target_user_id;

                // TODO: check user ids
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
        return Data.import.call(this, db, schema, objects, originals, credentials).mapSeries((bookmarkReceived, index) => {
            var bookmarkBefore = originals[index];
            if (bookmarkBefore) {
                // the only operation permitted is the removal of the bookmark
                if (bookmarkReceived.deleted) {
                    bookmarkReceived = { id: bookmarkBefore.id };
                    if (bookmarkBefore.target_user_id === credentials.user.id) {
                        bookmarkReceived.deleted = true;
                    } else if (_.includes(bookmarkBefore.user_ids, credentials.user.id)) {
                        if (bookmarkBefore.user_ids.length === 1) {
                            bookmarkReceived.deleted = true;
                        } else {
                            // someone else is recommending this story still
                            bookmarkReceived.user_ids =_.difference(bookmarkBefore.user_ids, [ credentials.user.id ]);
                        }
                    } else {
                        throw new HttpError(403);
                    }
                } else {
                    throw new HttpError(400);
                }
                return bookmarkReceived;
            } else {
                // must be the current user
                if (!_.isEqual(bookmarkReceived.user_ids, [ credentials.user.id ])) {
                    throw new HttpError(403);
                }
                if (!bookmarkReceived.story_id || !bookmarkReceived.target_user_id) {
                    throw new HttpError(400);
                }

                // see if there's a existing bookmark already
                var criteria = {
                    story_id: bookmarkReceived.story_id,
                    target_user_id: bookmarkReceived.target_user_id,
                };
                return this.findOne(db, schema, criteria, 'id, user_ids').then((row) => {
                    if (row) {
                        // add the user to the list
                        row.user_ids = _.union(row.user_ids, bookmarkReceived.user_ids);
                        bookmarkReceived = row;
                    }
                    return bookmarkReceived;
                });
            }
        });
    },
});
