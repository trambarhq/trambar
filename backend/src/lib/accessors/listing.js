var _ = require('lodash');
var Promise = require('bluebird');
var Crypto = require('crypto')
var Database = require('database');
var HttpError = require('errors/http-error');
var LiveData = require('accessors/live-data');

module.exports = _.create(LiveData, {
    schema: 'project',
    table: 'listing',
    columns: {
        id: Number,
        gn: Number,
        deleted: Boolean,
        ctime: String,
        mtime: String,
        details: Object,
        atime: String,
        ltime: String,
        dirty: Boolean,
        type: String,
        filters: Object,
        filters_hash: String,
        target_user_id: Number,
    },
    criteria: {
        id: Number,
        deleted: Boolean,
        dirty: Boolean,
        type: String,
        filters: Object,
        filters_hash: String,
        target_user_id: Number,
        match_any: Array(Object),
        has_candidates: Array(Number),
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
                atime timestamp,
                ltime timestamp,
                dirty boolean NOT NULL DEFAULT false,
                type varchar(32) NOT NULL DEFAULT '',
                target_user_id int NOT NULL DEFAULT 0,
                filters jsonb NOT NULL DEFAULT '{}',
                filters_hash varchar(32) DEFAULT '',
                PRIMARY KEY (id)
            );
        `;
        return db.execute(sql);
    },

    /**
     * Add conditions to SQL query based on criteria object
     *
     * @param  {Object} criteria
     * @param  {Object} query
     */
    apply: function(criteria, query) {
        var special = [
            'filters',
            'match_any',
            'has_candidates'
        ];
        LiveData.apply.call(this, _.omit(criteria, special), query);

        var params = query.parameters;
        var conds = query.conditions;
        if (criteria.match_any) {
            var objects = `$${params.push(criteria.match_any)}`;
            conds.push(`"matchAny"(filters, ${objects})`);
        }
        if (criteria.has_candidates) {
            var storyIds = `$${params.push(criteria.has_candidates)}`;
            conds.push(`"hasCandidates"(filters, ${storyIds})`);
        }
    },

    find: function(db, schema, criteria, columns) {
        // autovivify rows when type and filters are specified
        var type = criteria.type;
        var filters = criteria.filters;
        var userId = criteria.target_user_id;
        if (type && filters && userId) {
            // calculate hash of filters for quicker look-up
            if (!(filters instanceof Array)) {
                filters = [ filters ];
            }
            var hashes = _.map(filters, hash);
            // key columns
            var keys = {
                type: type,
                filters_hash: hashes,
                target_user_id: userId,
            };
            // properties of rows that are expected
            var expectedRows = _.map(hashes, (hash, index) => {
                return {
                    type: type,
                    filters_hash: hash,
                    filters: filters[index],
                    target_user_id: userId,
                };
            }) ;
            return this.vivify(db, schema, keys, expectedRows, columns);
        } else {
            return LiveData.find.call(this, db, schema, criteria, columns);
        }
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
        return LiveData.export.call(this, db, schema, rows, credentials, options).then((objects) => {
            _.each(objects, (object, index) => {
                var row = rows[index];
                object.type = row.type;
                object.target_user_id = row.target_user_id;
                object.filters = row.filters;
                object.story_ids = _.map(row.details.stories, 'id');
                object.details = undefined;

                if (credentials.user.id !== row.target_user_id) {
                    throw new HttpError(403);
                }
                // add new stories from list of candidates
                this.finalize(db, schema, row);
            });
            return objects;
        });
    },

    finalize: function(db, schema, row) {
        // move stories from candidate list into actual list
        if (chooseStories(row)) {
            // save the results
            setTimeout(() => {
                Database.open().then((db) => {
                    this.updateOne(db, schema, {
                        id: row.id,
                        details: row.details,
                    });
                });
            }, 50);
        }
        setTimeout(() => {
            Database.open().then((db) => {
                // finalize other listings now for consistency sake
                var criteria = {
                    type: row.type,
                    target_user_id: row.target_user_id
                };
                return this.find(db, schema, criteria, '*').each((otherRow) => {
                    if (otherRow.id !== row.id) {
                        if (chooseStories(otherRow)) {
                            return this.updateOne(db, schema, {
                                id: otherRow.id,
                                details: otherRow.details
                            });
                        }
                    }
                });
            });
        }, 50);
    },
});

function chooseStories(row) {
    var now = new Date;
    var limit = _.get(row.filters, 'limit', 100);
    var retention = _.get(row.filters, 'retention', 8 * HOUR);
    var newStories = _.get(row.details, 'candidates', []);
    var oldStories = _.get(row.details, 'stories', []);

    // we want to know as many new stories as possible
    var newStoryCount = newStories.length;
    // at the same time, we want to preserve as many old stories as we can
    var oldStoryCount = oldStories.length;
    var extra = (oldStoryCount + newStoryCount) - limit;
    if (extra > 0) {
        // well, something's got to give...
        // remove old stories that were retrieved a while ago
        for (var i = 0; extra > 0 && oldStoryCount > 0; i++) {
            var oldStory = oldStories[i];
            var elapsed = getTimeElapsed(oldStory.rtime, now)
            if (elapsed > retention) {
                extra--;
                oldStoryCount--;
            } else {
                break;
            }
        }
        if (extra > 0) {
            // still got too many
            // toss out at most half of the new ones
            var removeNew = Math.min(extra, Math.floor(newStoryCount * 0.5));
            newStoryCount -= removeNew;
            extra -= removeNew;

            if (extra > 0) {
                // remove additional old stories
                var removeOld = Math.min(extra, oldStoryCount);
                oldStoryCount -= removeOld;
                extra -= removeOld;

                if (extra > 0) {
                    newStoryCount -= extra;
                }
            }
        }
    }
    if (oldStoryCount !== oldStories.length || newStories.length > 0) {
        if (oldStoryCount !== oldStories.length) {
            oldStories = _.slice(oldStories, oldStories.length - oldStoryCount);
        }
        if (newStoryCount !== newStories.length) {
            var rtime = now.toISOString();
            // remove lowly rate stories
            newStories = _.orderBy(newStories, [ 'rating', 'ptime' ], [ 'asc', 'asc' ]);
            newStories = _.slice(newStories, newStories.length - newStoryCount);
            newStories = _.orderBy(newStories, [ 'ptime' ], [ 'asc' ]);
            newStories = _.map(newStories, (story) => {
                return {
                    id: story.id,
                    ptime: story.ptime,
                    rtime: rtime,
                };
            });
        }
        row.details.stories = _.concat(oldStories, newStories);
        row.details.candidates = [];
        row.gn += 1;
        return true;
    } else {
        return false;
    }
}

var HOUR = 60 * 60 * 1000;

function getTimeElapsed(start, end) {
    if (!start) {
        return Infinity;
    }
    if (!end) {
        return 0;
    }
    var s = (typeof(start) === 'string') ? new Date(start) : start;
    var e = (typeof(end) === 'string') ? new Date(end) : end;
    return (e - s);
}

/**
 * Generate MD5 hash of filters object
 *
 * @param  {Object} filters
 *
 * @return {String}
 */
function hash(filters) {
    var values = {};
    var keys = _.keys(filters).sort();
    _.each(keys, (key) => {
        values[key] = filters[key];
    });
    var text = JSON.stringify(values);
    var hash = Crypto.createHash('md5').update(text);
    return hash.digest("hex");
}
