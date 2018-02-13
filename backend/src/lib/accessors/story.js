var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var HTTPError = require('errors/http-error');
var ExternalData = require('accessors/external-data');

module.exports = _.create(ExternalData, {
    schema: 'project',
    table: 'story',
    columns: {
        id: Number,
        gn: Number,
        deleted: Boolean,
        ctime: String,
        mtime: String,
        details: Object,
        type: String,       // post, commit, merge, deployment, issue, task-start, task-end, survey
        tags: Array(String),
        language_codes: Array(String),
        published_version_id: Number,
        user_ids: Array(Number),
        role_ids: Array(Number),
        published: Boolean,
        ready: Boolean,
        suppressed: Boolean,
        ptime: String,
        btime: String,
        public: Boolean,
        external: Array(Object),
    },
    criteria: {
        id: Number,
        deleted: Boolean,
        type: String,
        tags: Array(String),
        language_codes: Array(String),
        published_version_id: Number,
        user_ids: Array(Number),
        role_ids: Array(Number),
        published: Boolean,
        ready: Boolean,
        suppressed: Boolean,
        public: Boolean,

        server_id: Number,
        lead_author_id: Number,
        external_object: Object,
        exclude: Array(Number),
        time_range: String,
        newer_than: String,
        older_than: String,
        bumped_after: String,
        url: String,
        has_tags: Boolean,
        search: Object,
        per_user_limit: Number,
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
                published_version_id int,
                user_ids int[] NOT NULL DEFAULT '{}'::int[],
                role_ids int[] NOT NULL DEFAULT '{}'::int[],
                published boolean NOT NULL DEFAULT false,
                ready boolean NOT NULL DEFAULT false,
                suppressed boolean NOT NULL DEFAULT false,
                ptime timestamp,
                btime timestamp,
                public boolean NOT NULL DEFAULT false,
                external jsonb[] NOT NULL DEFAULT '{}',
                PRIMARY KEY (id)
            );
            CREATE INDEX ON ${table} USING gin(user_ids) WHERE deleted = false;
            CREATE INDEX ON ${table} USING gin(role_ids) WHERE deleted = false;
            CREATE INDEX ON ${table} USING gin(("lowerCase"(tags))) WHERE deleted = false AND cardinality(tags) <> 0;
            CREATE INDEX ON ${table} USING gin(("payloadTokens"(details))) WHERE "payloadTokens"(details) IS NOT NULL;
            CREATE INDEX ON ${table} ((COALESCE(ptime, btime))) WHERE published = true AND ready = true;
        `;
        //
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
            var propNames = [ 'deleted', 'type', 'tags', 'language_codes', 'user_ids', 'role_ids', 'published', 'ready', 'public', 'ptime', 'external' ];
            return this.createNotificationTriggers(db, schema, propNames).then(() => {
                return this.createResourceCoalescenceTrigger(db, schema, [ 'ready', 'published' ]).then(() => {
                    var Task = require('accessors/task');
                    return Task.createUpdateTrigger(db, schema, 'updateStory', 'updateResource', [ this.table ]).then(() => {});
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
            'lead_author_id',
            'time_range',
            'newer_than',
            'older_than',
            'bumped_after',
            'url',
            'has_tags',
            'search',
            'per_user_limit',
        ];
        ExternalData.apply.call(this, _.omit(criteria, special), query);

        var params = query.parameters;
        var conds = query.conditions;
        if (criteria.lead_author_id !== undefined) {
            if (criteria.lead_author_id instanceof Array) {
                conds.push(`user_ids[1:1] <@ $${params.push(criteria.lead_author_id)}`);
            } else {
                conds.push(`user_ids[1] = $${params.push(criteria.lead_author_id)}`);
            }
        }
        if (criteria.time_range !== undefined) {
            conds.push(`ptime <@ $${params.push(criteria.time_range)}::tsrange`);
        }
        if (criteria.newer_than !== undefined) {
            conds.push(`ptime > $${params.push(criteria.newer_than)}`);
        }
        if (criteria.older_than !== undefined) {
            conds.push(`ptime < $${params.push(criteria.older_than)}`);
        }
        if (criteria.bumped_after !== undefined) {
            var time = `$${params.push(criteria.bumped_after)}`
            conds.push(`COALESCE(ptime, btime) > ${time}`);
        }
        if (criteria.url !== undefined) {
            conds.push(`details->>'url' = $${params.push(criteria.url)}`);
        }
        if (criteria.has_tags !== undefined) {
            if (criteria.has_tags) {
                conds.push(`CARDINALITY(tags) <> 0`);
            } else {
                conds.push(`CARDINALITY(tags) = 0`);
            }
        }
        var promise;
        if (criteria.search) {
            promise = this.applyTextSearch(db, schema, criteria.search, query);
        }
        return Promise.resolve(promise).then(() => {
            if (typeof(criteria.per_user_limit) === 'number') {
                // use a lateral join to limit the number of results per user
                // apply conditions on sub-query
                var user = require('accessors/user').getTableName('global');
                var story = this.getTableName(schema);
                var conditions = _.concat(`${user}.id = ANY(user_ids)`, query.conditions);
                var subquery = `
                    SELECT DISTINCT top_story.id
                    FROM ${user} JOIN LATERAL (
                        SELECT * FROM ${story}
                        WHERE ${conditions.join(' AND ')}
                        ORDER BY COALESCE(ptime, btime) DESC
                        LIMIT ${criteria.per_user_limit}
                    ) top_story ON true
                `;
                var condition = `id IN (${subquery})`
                query.conditions = [ condition ];
            }
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
     * @return {Promise<Array>}
     */
    export: function(db, schema, rows, credentials, options) {
        return ExternalData.export.call(this, db, schema, rows, credentials, options).then((objects) => {
            _.each(objects, (object, index) => {
                var row = rows[index];
                object.type = row.type;
                object.user_ids = row.user_ids;
                object.role_ids = row.role_ids;
                object.ptime = row.ptime;
                object.public = row.public;
                object.published = row.published;
                object.tags = row.tags;
                if (row.published_version_id) {
                    object.published_version_id = row.published_version_id;
                }
                if (row.ready === false) {
                    object.ready = false;
                }
                if (row.btime) {
                    object.btime = row.btime;
                }
                if (!row.published) {
                    // don't send text when object isn't published and
                    // the user isn't the owner
                    if (!_.includes(object.user_ids, credentials.user.id)) {
                        object.details = _.omit(object.details, 'text', 'resources');
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
        var storiesPublished = [];
        return ExternalData.import.call(this, db, schema, objects, originals, credentials).mapSeries((storyReceived, index) => {
            // make sure current user has permission to modify the object
            var storyBefore = originals[index];
            this.checkWritePermission(storyReceived, storyBefore, credentials);

            // set language_codes
            if (storyReceived.details) {
                storyReceived.language_codes = _.filter(_.keys(storyReceived.details.text), { length: 2 });
            }

            // set the ptime if published is set
            if (storyReceived.published && !storyReceived.ptime) {
                storyReceived.ptime = new String('NOW()');
            }

            // update btime if user wants to bump story
            if (storyReceived.bump) {
                storyReceived.btime = Object('NOW()');
                delete storyReceived.bump;
            }

            // mark story as having been manually deleted
            if (storyReceived.deleted) {
                storyReceived.suppressed = true;
            }

            if (storyReceived.published_version_id) {
                if (storyReceived.published) {
                    // load the published versions
                    var criteria = { id: storyReceived.published_version_id, deleted: false };
                    return this.findOne(db, schema, criteria, '*').then((storyPublished) => {
                        if (storyPublished) {
                            // update the original row with properties from the temp copy
                            var updates = {};
                            updates.id = storyPublished.id;
                            updates.details = storyReceived.details;
                            updates.type = storyReceived.type;
                            updates.user_ids = storyReceived.user_ids;
                            updates.role_ids  = storyReceived.role_ids;
                            updates.public = storyReceived.public;

                            // stick contents of the original row into the temp copy
                            // so we can retrieve them later potentially
                            storyReceived.details = storyPublished.details;
                            storyReceived.type = storyPublished.type;
                            storyReceived.user_ids = storyPublished.user_ids;
                            storyReceived.role_ids  = storyPublished.role_ids;
                            storyReceived.public = storyPublished.public;
                            storyReceived.deleted = true;

                            // check permission again (just in case)
                            this.checkWritePermission(updates, storyPublished, credentials);
                            storiesPublished.push(updates);
                        }
                        return storyReceived;
                    });
                }
            }
            return storyReceived;
        }).then((storiesReceived) => {
            return _.concat(storiesReceived, storiesPublished);
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
        if (ExternalData.isRelevantTo.call(this, event, user, subscription)) {
            if (event.current.published && event.current.ready) {
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
     * @param  {Object} storyReceived
     * @param  {Object} storyBefore
     * @param  {Object} credentials
     */
    checkWritePermission: function(storyReceived, storyBefore, credentials) {
        if (credentials.access !== 'read-write') {
            throw new HTTPError(400);
        }
        if (storyBefore) {
            if (!_.includes(storyBefore.user_ids, credentials.user.id)) {
                // can't modify an object that doesn't belong to the user
                // unless user is an admin or a moderator
                if (credentials.user.type !== 'admin' && credentials.user.type !== 'moderator') {
                    throw new HTTPError(400);
                }
            }
            if (storyReceived.hasOwnProperty('user_ids')) {
                if (!_.isEqual(storyReceived.user_ids, storyBefore.user_ids)) {
                    if (storyBefore.user_ids[0] !== credentials.user.id) {
                        // a coauthor can remove himself only
                        var withoutCurrentUser = _.without(storyBefore.user_ids, credentials.user.id);
                        if (!_.isEqual(storyReceived.user_ids, withoutCurrentUser)) {
                            throw new HTTPError(400);
                        }
                    }
                    if (storyReceived.user_ids[0] !== storyBefore.user_ids[0]) {
                        // cannot make someone else the lead author
                        throw new HTTPError(400);
                    }
                }
            }
        } else {
            if (storyReceived.id) {
                throw new HTTPError(400);
            }
            if (!storyReceived.hasOwnProperty('user_ids')) {
                throw new HTTPError(400);
            }
            if (storyReceived.user_ids[0] !== credentials.user.id) {
                // the lead author must be the current user
                throw new HTTPError(400);
            }
        }
    },

    /**
     * Repopulate role_ids with role ids of authors when their roles change,
     * doing so selectively as the column is supposed to reflect their roles
     * at the time when the stories were created.
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<Number>} userIds
     *
     * @return {Promise}
     */
    updateUserRoles: function(db, schema, userIds) {
        var User = require('accessors/user');
        var userTable = User.getTableName('global');
        var storyTable = this.getTableName(schema);

        // for normal stories, we update those published earlier on the same day
        var condition1 = `
            ptime > current_date::timestamp
        `;
        // for stories where ctime > ptime (meaning they were imported),
        // we update those less than a week old.
        var condition2 = `
            ctime > ptime AND ctime > NOW() - INTERVAL '1 week'
        `;
        // subquery that yield story_id and role_id (unnested)
        var roleIdSubQuery = `
            SELECT s.id AS story_id, UNNEST(u.role_ids) AS role_id
            FROM ${userTable} u
            INNER JOIN ${storyTable} s
            ON u.id = ANY(s.user_ids)
        `;
        // subquery that yield story_id and role_ids (aggregated, distinct)
        var roleIdsSubQuery = `
            SELECT story_id, array_agg(DISTINCT role_id) AS role_ids
            FROM (${roleIdSubQuery}) AS story_role_id
            GROUP BY story_id
        `;
        var sql = `
            UPDATE ${storyTable}
            SET role_ids = story_role_ids.role_ids
            FROM (${roleIdsSubQuery}) AS story_role_ids
            WHERE (${condition1} OR ${condition2})
            AND user_ids && $1
            AND id = story_role_ids.story_id
        `;
        return db.execute(sql, [ userIds ]);
    },

    /**
     * Mark stories as deleted if their lead authors are those specified
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<Number>} userIds
     *
     * @return {Promise}
     */
    deleteAssociated: function(db, schema, userIds) {
        if (_.isEmpty(userIds)) {
            return Promise.resolve();
        }
        var criteria = {
            lead_author_id: userIds,
            deleted: false,
        };
        return this.updateMatching(db, schema, criteria, { deleted: true });
    },

    /**
     * Clear deleted flag of stories beloging to specified users
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<Number>} userIds
     *
     * @return {Promise}
     */
    restoreAssociated: function(db, schema, userIds) {
        if (_.isEmpty(userIds)) {
            return Promise.resolve();
        }
        var criteria = {
            lead_author_id: userIds,
            deleted: true,
            // don't restore stories that were manually deleted
            suppressed: false,
        };
        return this.updateMatching(db, schema, criteria, { deleted: false });
    },
});
