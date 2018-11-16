import _ from 'lodash';
import Promise from 'bluebird';
import HTTPError from 'errors/http-error';
import Data from 'accessors/data';

const Bookmark = _.create(Data, {
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
        hidden: Boolean,
        suppresed: Boolean,
    },
    criteria: {
        id: Number,
        deleted: Boolean,
        story_id: Number,
        user_ids: Array(Number),
        target_user_id: Number,
        hidden: Boolean,
        suppressed: Boolean,
    },
    version: 2,

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
                story_id int NOT NULL,
                user_ids int[] NOT NULL,
                target_user_id int NOT NULL,
                hidden boolean NOT NULL DEFAULT false,
                public boolean NOT NULL DEFAULT false,
                suppressed boolean NOT NULL DEFAULT false,
                PRIMARY KEY (id)
            );
            CREATE INDEX ON ${table} (story_id) WHERE deleted = false;
            CREATE INDEX ON ${table} (target_user_id) WHERE deleted = false;
        `;
        return db.execute(sql);
    },

    /**
     * Upgrade table in schema to given DB version (from one version prior)
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Number} version
     *
     * @return {Promise<Boolean>}
     */
    upgrade: function(db, schema, version) {
        if (version === 2) {
            // adding: hidden, suppressed
            var table = this.getTableName(schema);
            var sql = `
                ALTER TABLE ${table}
                ADD COLUMN IF NOT EXISTS
                hidden boolean NOT NULL DEFAULT false;
                ALTER TABLE ${table}
                ADD COLUMN IF NOT EXISTS
                suppressed boolean NOT NULL DEFAULT false;
            `;
            return db.execute(sql).return(true);
        }
        return Promise.resolve(false);
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
            var propNames = [ 'deleted', 'story_id', 'user_ids', 'target_user_id', 'hidden', 'public' ];
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
                object.hidden = row.hidden;
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
            this.checkWritePermission(bookmarkReceived, bookmarkBefore, credentials);

            if (bookmarkBefore) {
                if (bookmarkReceived.deleted) {
                    // remove the current user id from list of senders
                    // delete the bookmark only if no one else is
                    var senderIDs = _.without(bookmarkBefore.user_ids, credentials.user.id);
                    bookmarkReceived = {
                        id: bookmarkBefore.id,
                        user_ids: senderIDs,
                        deleted: _.isEmpty(senderIDs),
                        suppressed: _.isEmpty(senderIDs),
                    };
                }
                return bookmarkReceived;
            } else {
                // see if there's a existing bookmark already
                var criteria = {
                    story_id: bookmarkReceived.story_id,
                    target_user_id: bookmarkReceived.target_user_id,
                    deleted: false,
                };
                return this.findOne(db, schema, criteria, 'id, user_ids, hidden').then((row) => {
                    if (row) {
                        // add the user to the list
                        row.user_ids = _.union(row.user_ids, bookmarkReceived.user_ids);
                        if (bookmarkReceived.target_user_id === credentials.user.id) {
                            // reset the hidden flag if it's the target user himself
                            // creating the bookmark
                            row.hidden = false;
                        }
                        bookmarkReceived = row;
                    }
                    return bookmarkReceived;
                });
            }
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
            if (event.current.target_user_id === user.id) {
                return true;
            }
            if (_.includes(event.current.user_ids, user.id)) {
                return true;
            }
        }
        return false;
    },

    /**
     * Throw an exception if modifications aren't permitted
     *
     * @param  {Object} bookmarkReceived
     * @param  {Object} bookmarkBefore
     * @param  {Object} credentials
     */
    checkWritePermission: function(bookmarkReceived, bookmarkBefore, credentials) {
        if (bookmarkBefore) {
            // the only operation permitted is the removal of the bookmark
            if (bookmarkReceived.deleted) {
                // deleting a bookmark sent to someone else
                // current user must be among the senders
                if (!_.includes(bookmarkBefore.user_ids, credentials.user.id)) {
                    throw new HTTPError(400);
                }
            } else if (bookmarkReceived.hidden) {
                // only the target user can hide a bookmark
                if (bookmarkBefore.target_user_id !== credentials.user.id) {
                    throw new HTTPError(400);
                }
            } else {
                throw new HTTPError(400);
            }
            return bookmarkReceived;
        } else {
            // must be the current user
            if (!_.isEqual(bookmarkReceived.user_ids, [ credentials.user.id ])) {
                throw new HTTPError(400);
            }
            // can't create bookmarks to nothing
            if (!bookmarkReceived.story_id || !bookmarkReceived.target_user_id) {
                throw new HTTPError(400);
            }
        }
    },

    /**
     * Mark bookmarks associated with stories as deleted
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object} associations
     *
     * @return {Promise}
     */
    deleteAssociated: function(db, schema, associations) {
        var promises = _.mapValues(associations, (objects, type) => {
            if (_.isEmpty(objects)) {
                return;
            }
            if (type === 'story') {
                var storyIds = _.map(objects, 'id');
                var criteria = {
                    story_id: storyIds,
                    deleted: false,
                    suppressed: false,
                };
                return this.updateMatching(db, schema, criteria, { deleted: true });
            }
        });
        return Promise.props(promises);
    },

    /**
     * Clear deleted flag of bookmarks to specified stories
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object} associations
     *
     * @return {Promise}
     */
    restoreAssociated: function(db, schema, associations) {
        var promises = _.mapValues(associations, (objects, type) => {
            if (_.isEmpty(objects)) {
                return;
            }
            if (type === 'story') {
                var storyIds = _.map(objects, 'id');
                var criteria = {
                    story_id: storyIds,
                    deleted: true,
                    // don't restore bookmarks that were manually deleted
                    suppressed: false,
                };
                return this.updateMatching(db, schema, criteria, { deleted: false });
            }
        });
        return Promise.props(promises);
    },
});

export {
    Bookmark as default,
    Bookmark,
};
