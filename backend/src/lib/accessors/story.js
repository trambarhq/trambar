var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var HttpError = require('errors/http-error');
var Data = require('accessors/data');
var Task = require('accessors/task');

module.exports = _.create(Data, {
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
        published_version_id: Number,
        user_ids: Array(Number),
        role_ids: Array(Number),
        repo_id: Number,
        external_id: Number,
        published: Boolean,
        ptime: String,
        btime: String,
        public: Boolean,
    },
    criteria: {
        id: Number,
        deleted: Boolean,
        type: String,
        published_version_id: Number,
        user_ids: Array(Number),
        role_ids: Array(Number),
        repo_id: Number,
        external_id: Number,
        published: Boolean,
        public: Boolean,
        time_range: String,
        newer_than: String,
        older_than: String,
        ready: Boolean,
        commit_id: String,
        bumped_after: String,
        url: String,
        search: Object,
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
                published_version_id int,
                user_ids int[] NOT NULL DEFAULT '{}'::int[],
                role_ids int[] NOT NULL DEFAULT '{}'::int[],
                repo_id int,
                external_id int,
                published boolean NOT NULL DEFAULT false,
                ptime timestamp,
                btime timestamp,
                public boolean NOT NULL DEFAULT false,
                PRIMARY KEY (id)
            );
            CREATE INDEX ON ${table} (ptime) WHERE repo_id IS NOT NULL AND ptime IS NOT NULL;
            CREATE INDEX ON ${table} (repo_id, external_id) WHERE repo_id IS NOT NULL AND external_id IS NOT NULL;
            CREATE INDEX ON ${table} USING gin((details->'commit_ids')) WHERE details ? 'commit_ids';
            CREATE INDEX ON ${table} USING gin(("payloadIds"(details))) WHERE "payloadIds"(details) IS NOT NULL;
        `;
        return db.execute(sql);
    },

    /**
     * Attach triggers to this table, also add trigger on task so details
     * are updated when tasks complete
     *
     * @param  {Database} db
     * @param  {String} schema
     *
     * @return {Promise<Boolean>}
     */
    watch: function(db, schema) {
        return Data.watch.call(this, db, schema).then(() => {
            return Task.createUpdateTrigger(db, schema, this.table, 'updateResource');
        });
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
            'ready',
            'commit_id',
            'bumped_after',
            'url',
            'search',
        ];
        Data.apply.call(this, _.omit(criteria, special), query);

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
        if (criteria.bumped_after !== undefined) {
            var time = `$${params.push(criteria.bumped_after)}`
            conds.push(`(ptime > ${time} || btime > ${time})`);
        }
        if (criteria.commit_id !== undefined) {
            conds.push(`details->'commit_ids' ? $${params.push(criteria.commit_id)}`);
        }
        if (criteria.url !== undefined) {
            conds.push(`details->>'url' = $${params.push(criteria.url)}`);
        }
        if (criteria.ready !== undefined) {
            if (criteria.ready === true) {
                conds.push(`ptime IS NOT NULL`);
            } else {
                conds.push(`ptime IS NULL`);
            }
        }
        if (criteria.search) {
            return this.applyTextSearch(db, schema, criteria.search, query);
        }
        return Promise.resolve();
    },

    /**
     * Export database row to client-side code, omitting sensitive or
     * unnecessary information
     *
     * @param  {Database} db
     * @param  {Schema} schema
     * @param  {Array<Object>} rows
     * @param  {Object} credentials
     * @param  {Object} options
     *
     * @return {Promise<Array>}
     */
    export: function(db, schema, rows, credentials, options) {
        return Data.export.call(this, db, schema, rows, credentials, options).then((objects) => {
            _.each(objects, (object, index) => {
                var row = rows[index];
                object.type = row.type;
                object.user_ids = row.user_ids;
                object.role_ids = row.role_ids;
                object.ptime = row.ptime;
                object.public = row.public;
                object.published = row.published;
                if (row.published_version_id) {
                    object.published_version_id = row.published_version_id;
                }
                if (row.repo_id) {
                    object.repo_id = row.repo_id;
                }
                if (row.external_id) {
                    object.external_id = row.external_id;
                }
                if (!object.published) {
                    // don't send text when object isn't published and
                    // there the user isn't the owner
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
     * @param  {Schema} schema
     * @param  {Array<Object>} objects
     * @param  {Array<Object>} originals
     * @param  {Object} credentials
     * @param  {Object} options
     *
     * @return {Promise<Array>}
     */
    import: function(db, schema, objects, originals, credentials, options) {
        return Data.import.call(this, db, schema, objects, originals, credentials).then((objects) => {
            _.each(objects, (storyReceived, index) => {
                // make sure current user has permission to modify the object
                var storyBefore = originals[index];
                this.checkWritePermission(storyReceived, storyBefore, credentials);

                // set the ptime if published is set and there're no outstanding
                // media tasks
                if (storyReceived.published && !storyReceived.ptime) {
                    var payloadIds = getPayloadIds(storyReceived);
                    if (_.isEmpty(payloadIds)) {
                        storyReceived.ptime = Object('NOW()');
                    }
                }
                // update btime if user wants to bump story
                if (storyReceived.bump) {
                    storyReceived.btime = Object('NOW()');
                    delete storyReceived.bump;
                }
            });

            // look for temporary copies created for editing published stories
            var publishedTempCopies = _.filter(objects, (storyReceived) => {
                if (storyReceived.published_version_id) {
                    if (storyReceived.published) {
                        return true;
                    }
                }
            });
            if (_.isEmpty(publishedTempCopies)) {
                return objects;
            };

            // load the published versions
            var criteria = {
                id: _.map(publishedTempCopies, 'published_version_id'),
                deleted: false,
            };
            return this.find(db, schema, criteria, '*').then((publishedVersions) => {
                var publishedVersionUpdates = _.filter(_.map(publishedTempCopies, (tempCopy) => {
                    var publishedVersion = _.find(publishedVersions, { id: tempCopy.published_version_id });
                    if (!publishedVersion) {
                        // the story has been deleted
                        return null;
                    }

                    // update the original row with properties from the temp copy
                    var updates = {};
                    updates.id = publishedVersion.id;
                    updates.details = _.omit(tempCopy.details, 'fn');
                    updates.type = tempCopy.type;
                    updates.user_ids = tempCopy.user_ids;
                    updates.role_ids  = tempCopy.role_ids;
                    updates.public = tempCopy.public;

                    // stick contents of the original row into the temp copy
                    // so we can retrieve them later potentially
                    tempCopy.details = _.omit(publishedVersion.details, 'fn');
                    tempCopy.type = publishedVersion.type;
                    tempCopy.user_ids = publishedVersion.user_ids;
                    tempCopy.role_ids  = publishedVersion.role_ids;
                    tempCopy.public = publishedVersion.public;
                    tempCopy.deleted = true;

                    // check permission again (just in case)
                    this.checkWritePermission(updates, publishedVersion, credentials);
                    return updates;
                }));

                // append to the list so the original rows are update and
                // then dispatch to the client
                return _.concat(objects, publishedVersionUpdates);
            });
        });
    },

    /**
     * Throw an exception if modifications aren't permitted
     *
     * @param  {Object} storyReceived
     * @param  {Object} storyBefore
     * @param  {Object} credentials
     */
    checkWritePermission: function(storyReceived, storyBefore, credentials) {
        if (storyBefore) {
            if (!_.includes(storyBefore.user_ids, credentials.user.id)) {
                // can't modify an object that doesn't belong to the user
                throw new HttpError(400);
            }
            if (storyReceived.hasOwnProperty('user_ids')) {
                if (!_.isEqual(storyReceived.user_ids, storyBefore.user_ids)) {
                    if (storyBefore.user_ids[0] !== credentials.user.id) {
                        // only the main author can modify the list
                        throw new HttpError(400);
                    }
                    if (storyReceived.user_ids[0] !== storyBefore.user_ids[0]) {
                        // cannot make someone else the lead author
                        throw new HttpError(400);
                    }
                }
            }
        } else {
            if (storyReceived.id) {
                throw new HttpError(400);
            }
            if (!storyReceived.hasOwnProperty('user_ids')) {
                throw new HttpError(400);
            }
            if (storyReceived.user_ids[0] !== credentials.user.id) {
                // the lead author must be the current user
                throw new HttpError(400);
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
        console.log(sql);
        return db.execute(sql, [ userIds ]);
    },
});

/**
 * Return task ids in the object
 *
 * @param  {Object} object
 *
 * @return {Array<Number>}
 */
function getPayloadIds(object) {
    var payloadIds = [];
    if (object && object.details) {
        _.each(object.details.resources, (res) => {
            if (res.payload_id) {
                payloadIds.push(res.payload_id);
            }
        });
    }
    return payloadIds;
}
