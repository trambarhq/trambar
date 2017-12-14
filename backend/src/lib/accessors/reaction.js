var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var HttpError = require('errors/http-error');
var ExternalData = require('accessors/external-data');

module.exports = _.create(ExternalData, {
    schema: 'project',
    table: 'reaction',
    columns: {
        id: Number,
        gn: Number,
        deleted: Boolean,
        ctime: String,
        mtime: String,
        details: Object,
        type: String,
        tags: Array(String),
        language_codes: Array(String),
        story_id: Number,
        user_id: Number,
        published: Boolean,
        ready: Boolean,
        suppresed: Boolean,
        ptime: String,
        public: Boolean,
        external: Array(Object),
    },
    criteria: {
        id: Number,
        deleted: Boolean,
        type: String,
        tags: Array(String),
        language_codes: Array(String),
        story_id: Number,
        user_id: Number,
        published: Boolean,
        ready: Boolean,
        suppresed: Boolean,
        public: Boolean,

        server_id: Number,
        external_object: Object,
        time_range: String,
        newer_than: String,
        older_than: String,
        search: Object,
    },
    accessControlColumns: {
        public: Boolean,
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
                type varchar(32) NOT NULL DEFAULT '',
                tags varchar(64)[] NOT NULL DEFAULT '{}'::text[],
                language_codes varchar(2)[] NOT NULL DEFAULT '{}'::text[],
                story_id int NOT NULL DEFAULT 0,
                user_id int NOT NULL DEFAULT 0,
                published boolean NOT NULL DEFAULT false,
                ready boolean NOT NULL DEFAULT false,
                suppressed boolean NOT NULL DEFAULT false,
                ptime timestamp,
                public boolean NOT NULL DEFAULT false,
                external jsonb[] NOT NULL DEFAULT '{}',
                PRIMARY KEY (id)
            );
            CREATE INDEX ON ${table} USING gin(("payloadIds"(details))) WHERE "payloadIds"(details) IS NOT NULL;
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
            var propNames = [ 'deleted', 'type', 'tags', 'language_codes', 'story_id', 'user_id', 'published', 'ready', 'ptime', 'public', 'external' ];
            return this.createNotificationTriggers(db, schema, propNames).then(() => {
                // merge changes to details->resources to avoid race between
                // client-side changes and server-side changes
                return this.createResourceCoalescenceTrigger(db, schema, [ 'ready', 'published' ]).then(() => {
                    // completion of tasks will automatically update
                    // details->resources and ready
                    var Task = require('accessors/task');
                    return Task.createUpdateTrigger(db, schema, 'updateReaction', 'updateResource', [ this.table, 'ready', 'published' ]);
                });
            });
        });
    },

    /**
     * Filter out rows that user doesn't have access to
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<Object>} rows
     * @param  {Object} credentials
     *
     * @return {Promise<Array<Object>>}
     */
    filter: function(db, schema, rows, credentials) {
        if (credentials.user.type === 'guest') {
            rows = _.filter(rows, { public: true });
        }
        return Promise.resolve(rows);
    },

    /**
     * Add conditions to SQL query based on criteria object
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object} criteria
     * @param  {Object} query
     *
     * @return {Promise}
     */
    apply: function(db, schema, criteria, query) {
        var special = [
            'time_range',
            'newer_than',
            'older_than',
            'search',
        ];
        ExternalData.apply.call(this, _.omit(criteria, special), query);

        var params = query.parameters;
        var conds = query.conditions;
        if (criteria.time_range !== undefined) {
            conds.push(`ptime <@ $${params.push(criteria.time_range)}::tsrange`);
        }
        if (criteria.newer_than !== undefined) {
            conds.push(`ptime > $${params.push(criteria.newer_than)}`);
        }
        if (criteria.older_than !== undefined) {
            conds.push(`ptime < $${params.push(criteria.older_than)}`);
        }
        if (criteria.search) {
            return this.applyTextSearch(db, schema, criteria.search, query);
        }
        return Promise.resolve();
    },

    /**
     * Import objects sent by client-side code, applying access control
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<Object>} objects
     * @param  {Array<Object>} originals
     * @param  {Object} credentials
     *
     * @return {Promise<Array>}
     */
    import: function(db, schema, objects, originals, credentials, options) {
        return ExternalData.import.call(this, db, schema, objects, originals, credentials).mapSeries((reactionReceived, index) => {
            var reactionBefore = originals[index];
            this.checkWritePermission(reactionReceived, reactionBefore, credentials);

            // set language_codes
            if (reactionReceived.details) {
                reactionReceived.language_codes = _.filter(_.keys(reactionReceived.details.text), { length: 2 });
            }

            // set the ptime if published is set
            if (reactionReceived.published && !reactionReceived.ptime) {
                reactionReceived.ptime = new String('NOW()');
            }

            // mark reaction as having been manually deleted
            if (reactionReceived.deleted) {
                reactionReceived.suppressed = true;
            }
            return reactionReceived;
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
                object.type = row.type;
                object.story_id = row.story_id;
                object.user_id = row.user_id;
                object.ptime = row.ptime;
                object.public = row.public;
                object.published = row.published;
                if (row.ready === false) {
                    object.ready = false;
                }
                if (!object.published) {
                    // don't send text when object isn't published and
                    // there the user isn't the owner
                    if (object.user_id !== credentials.user.id) {
                        object.details = _.omit(object.details, 'text', 'resources');
                    }
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
        if (ExternalData.isRelevantTo(event, user, subscription)) {
            // reactions are relevant to all user even before they're published
            // that's used to show someone is commenting
            return true;
        }
        return false;
    },

    /**
     * Throw an exception if modifications aren't permitted
     *
     * @param  {Object} reactionReceived
     * @param  {Object} reactionBefore
     * @param  {Object} credentials
     */
    checkWritePermission: function(reactionReceived, reactionBefore, credentials) {
        if (credentials.access !== 'read-comment' && credentials.access !== 'read-write') {
            throw new HttpError(400);
        }
        if (reactionBefore) {
            if (reactionBefore.user_id !== credentials.user.id) {
                // can't modify an object that doesn't belong to the user
                throw new HttpError(400);
            }
            if (reactionReceived.hasOwnProperty('user_id')) {
                if (reactionReceived.user_id !== reactionBefore.user_id) {
                    // cannot make someone else the author
                    throw new HttpError(400);
                }
            }
        } else {
            if (reactionReceived.id) {
                throw new HttpError(400);
            }
            if (!reactionReceived.hasOwnProperty('user_id')) {
                throw new HttpError(400);
            }
            if (reactionReceived.user_id !== credentials.user.id) {
                // the author must be the current user
                throw new HttpError(400);
            }
        }
    },
});
