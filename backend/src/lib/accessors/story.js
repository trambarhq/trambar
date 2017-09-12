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
     * @param  {Object} criteria
     * @param  {Object} query
     */
    apply: function(criteria, query) {
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
            var value = `$${params.push(criteria.bumped_after)}`
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
            var lang = criteria.search.lang;
            var value = `$${params.push(criteria.search.text)}`;
            // TODO: obtain languages for which we have indices
            var languageCodes = [ lang ];
            // search query in each language
            var tsQueries = _.map(languageCodes, (code) => {
                // TODO: handle query in a more sophisticated manner
                return `plainto_tsquery('search_${code}', ${value}) AS query_${code}`;
            });
            // text vector in each language
            var tsVectors = _.map(languageCodes, (code) => {
                var vector = `to_tsvector('search_${code}', details->'text'->>'${code}')`;
                // give results in the user's language a higher weight
                // A = 1.0, B = 0.4 by default
                var weight = (code === lang) ? 'A' : 'B';
                vector = `setweight(${vector}, '${weight}') AS vector_${code}`;
                return vector;
            });
            // conditions
            var tsConds = _.map(languageCodes, (code) => {
                return `vector_${code} @@ query_${code}`;
            });
            // search result rankings
            var tsRanks = _.map(languageCodes, (code) => {
                return `ts_rank_cd(vector_${code}, query_${code})`;
            });
            var tsRank = (tsRanks.length > 1) ? `GREATEST(${tsRanks.join(', ')})` : tsRanks[0];
            conds.push('(' + tsConds.join(' OR ') + ')');
            query.table += `, ${tsVectors.join(', ')}`;
            query.table += `, ${tsQueries.join(', ')}`;
            query.columns += `, ${tsRank} AS relevance`;
            query.order = `relevance DESC`;
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
                    if (object.user_id !== credentials.user.id) {
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
        return Data.import.call(this, db, schema, objects, originals, credentials).map((object, index) => {
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
            if (object.bump) {
                object.btime = Moment().toISOString();
                delete object.bump;
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
                // load the original objects
                var publishedStoryIds = _.map(publishedStories, 'id');
                return this.find(db, schema, { id: publishedStoryIds }, '*').then((publishedOriginals) => {
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
