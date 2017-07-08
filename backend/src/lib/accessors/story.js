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
        related_object_id: Number,
        published_version_id: Number,
        user_ids: Array(Number),
        role_ids: Array(Number),
        published: Boolean,
        ptime: String,
        public: Boolean,
    },
    criteria: {
        id: Number,
        deleted: Boolean,
        type: String,
        related_object_id: Number,
        published_version_id: Number,
        user_ids: Array(Number),
        role_ids: Array(Number),
        published: Boolean,
        public: Boolean,
        time_range: String,
        newer_than: String,
        older_than: String,
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
                related_object_id int,
                published_version_id int,
                user_ids int[] NOT NULL DEFAULT '{}'::int[],
                role_ids int[] NOT NULL DEFAULT '{}'::int[],
                published boolean NOT NULL DEFAULT false,
                ptime timestamp,
                public boolean NOT NULL DEFAULT false,
                PRIMARY KEY (id)
            );
        `;
        return db.execute(sql);
    },

    apply: function(criteria, query) {
        var special = [ 'time_range', 'newer_than', 'older_than', 'ready' ];
        Data.apply.call(this, _.omit(criteria, special), query);

        var params = query.parameters;
        var conds = query.conditions;
        if (criteria.time_range !== undefined) {
            params.push(criteria.time_range);
            conds.push(`ptime <@ $${params.length}::tsrange`);
        }
        if (criteria.newer_than !== undefined) {
            params.push(criteria.newer_than);
            conds.push(`ptime > $${params.length}`);
        }
        if (criteria.older_than !== undefined) {
            params.push(criteria.older_than);
            conds.push(`ptime < $${params.length}`);
        }
        if (criteria.ready !== undefined) {
            if (criteria.ready === true) {
                conds.push(`ptime IS NOT NULL`);
            } else {
                conds.push(`ptime IS NULL`);
            }
        }
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
     * @return {Promise<Array>}
     */
    export: function(db, schema, rows, credentials) {
        return Promise.map(rows, (row) => {
            var object = {
                id: row.id,
                gn: row.gn,
                details: row.details,
                type: row.type,
                user_ids: row.user_ids,
                role_ids: row.role_ids,
                ptime: row.ptime,
                public: row.public,
                published: row.published,
            };
            if (row.related_object_id) {
                switch (row.type) {
                    case 'commit':
                        object.commit_id = row.related_object_id;
                        break;
                    case 'issue':
                        object.issue_id = row.related_object_id;
                        break;
                }
            }
            if (row.published_version_id) {
                object.published_version_id = row.published_version_id;
            }
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
                if (!_.includes(original.user_ids, credentials.user.id)) {
                    // can't modify an object that doesn't belong to the user
                    throw new HttpError(403);
                }
                if (object.hasOwnProperty('user_ids')) {
                    if (!_.isEqual(object.user_ids, original.user_ids)) {
                        if (original.user_ids[0] !== credentials.user.id) {
                            // only the main author can modify the list
                            throw new HttpError(403);
                        }
                        if (object.user_ids[0] !== original.user_ids[0]) {
                            // cannot make someone else the main author
                            throw new HttpError(403);
                        }
                    }
                }
            } else {
                if (object.id) {
                    throw new HttpError(400);
                }
                if (!object.hasOwnProperty('user_ids')) {
                    throw new HttpError(403);
                }
                if (object.user_ids[0] !== credentials.user.id) {
                    // the main author must be the current user
                    throw new HttpError(403);
                }
            }

            // set the ptime if published is set and there're no outstanding
            // media tasks
            if (object.published && !object.ptime) {
                var payloadIds = getPayloadIds(object);
                if (_.isEmpty(payloadIds)) {
                    object.ptime = Moment().toISOString();
                }
            }
            return object;
        }).then((objects) => {
            // look for temporary copies created for editing published stories
            var publishedTempCopies = _.filter(objects, (object) => {
                if (object.published_version_id) {
                    if (object.published) {
                        return true;
                    }
                }
            });
            if (!_.isEmpty(publishedTempCopies)) {
                // create copies of the temp objects that save to the published version
                var publishedStories = _.map(publishedTempCopies, (tempCopy) => {
                    // don't need the object any more
                    tempCopy.deleted = true;

                    var publishedStory = _.omit(tempCopy, 'deleted', 'published_version_id', 'ptime');
                    publishedStory.details = _.omit(tempCopy.details, 'fn');
                    publishedStory.id = tempCopy.published_version_id;
                    return publishedStory;
                });
                console.log(publishedStories);
                // load the original objects
                var publishedStoryIds = _.map(publishedStories, 'id');
                return this.find(db, schema, { id: publishedStoryIds }, '*').then((publishedOriginals) => {
                    console.log(publishedOriginals)
                    publishedOriginals = _.map(publishedStories, (object) => {
                        return _.find(publishedOriginals, { id: object.id }) || null;
                    });
                    // check permission
                    return this.import(db, schema, publishedStories, publishedOriginals, credentials);
                }).then((publishedStories) => {
                    return _.concat(objects, publishedStories);
                });
            } else {
                return objects;
            }
        }).then((objects) => {
            /*if (!_.every(publishedOriginals, { published_version_id: null })) {
                // prevent recursion
                throw new HttpError(400);
            }*/
            return objects;
        });
    },

    /**
     * Create associations between newly created or modified rows with
     * rows in other tables
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<Object>} rows
     * @param  {Array<Object>} originals
     * @param  {Object} credentials
     *
     * @return {Promise<Array<Object>>}
     */
    associate: function(db, schema, rows, originals, credentials) {
        return Promise.map(rows, (row, index) => {
            var original = originals[index];
            var payloadIdsBefore = getPayloadIds(original);
            var payloadIdsAfter = getPayloadIds(row);
            var newPayloadIds = _.difference(payloadIdsAfter, payloadIdsBefore);
            if (!_.isEmpty(newPayloadIds)) {
                // payload ids are actually task ids
                return Task.find(db, schema, { id: newPayloadIds }, '*').then((tasks) => {
                    _.each(tasks, (task) => {
                        task.details.associated_object = {
                            type: this.table,
                            id: row.id,
                        };
                    });
                    return Task.save(db, schema, tasks);
                }).return(row);
            }
            return row;
        });
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
