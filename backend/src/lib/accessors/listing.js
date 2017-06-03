var _ = require('lodash');
var Promise = require('bluebird');

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
        filters_hash: String,
        target_user_id: Number,
        match_any: Array(Object),
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
                type varchar(32) NOT NULL,
                target_user_id int NOT NULL,
                filters jsonb NOT NULL DEFAULT '{}',
                filters_hash varchar(32),
                PRIMARY KEY (id)
            );
        `;
        return db.execute(sql);
    },

    /**
     * Export database row to client-side code, omitting sensitive or
     * unnecessary information
     *
     * @param  {Database} db
     * @param  {Schema} schema
     * @param  {Object} row
     * @param  {Object} credentials
     *
     * @return {Promise<Object>}
     */
    export: function(db, schema, row, credentials) {
        return Promise.try(() => {
            this.touch(db, schema, row);
            if (credentials.user.id !== row.target_user_id) {
                throw new HttpError(403);
            }
            this.finalize(row);
            var object = {
                id: row.id,
                gn: row.gn,
                type: row.type,
                target_user_id: row.target_user_id,
                filters: row.filters,
                story_ids: _.map(row.details.stories, 'id')
            };
            return object;
        });
    },

    finalize: function(row) {
        var limit = _.get(row.details, 'limit', 100);
        var retention = _.get(row.details, 'retention', 8 * HOUR);
        var newStories = _.get(row.details, 'candidates', []);
        var oldStories = _.get(row.details, 'stories', []);

        // we want to know as many new stories as possible
        var newStoryCount = Math.min(newStories.length, limit);
        // at the same time, we want to preserve as many old stories as we can
        var oldStoryCount = Math.min(oldStories.length, limit);
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

        if (oldStoryCount !== oldStories.length) {
            oldStories = _.slice(oldStories, oldStories.length - oldStoryCount);
        }
        if (newStoryCount !== newStories.length) {
            // remove lowly rate stories
            newStories = _.orderBy(newStories, [ 'rating', 'ptime' ], [ 'asc', 'asc' ]);
            newStories = _.slice(newStories, newStories.length - newStoryCount);
            newStories = _.orderBy(newStories, [ 'ptime' ], [ 'asc' ]);
            newStories = _.map(newStories, (story) {
                return {
                    id: story.id,
                    rtime: now,
                    rating: story.rating
                };
            });
        }
        row.details.stories = _.concat(oldStories, newStories);
        row.details.candidates = [];
    }
});

var HOUR = 60 * 60 * 1000;
