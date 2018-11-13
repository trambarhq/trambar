import _ from 'lodash';
import Promise from 'bluebird';
import Crypto from 'crypto'
import Database from 'database';
import HTTPError from 'errors/http-error';
import LiveData from 'accessors/live-data';

import ByRetrievalTime from 'story-raters/by-retrieval-time';

const Listing = _.create(LiveData, {
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
        finalized: Boolean,
        type: String,
        filters: Object,
        filters_hash: String,
        target_user_id: Number,
    },
    criteria: {
        id: Number,
        deleted: Boolean,
        dirty: Boolean,
        finalized: Boolean,
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
                finalized boolean NOT NULL DEFAULT true,
                type varchar(32) NOT NULL,
                target_user_id int NOT NULL,
                filters jsonb NOT NULL,
                filters_hash varchar(32) NOT NULL,
                PRIMARY KEY (id)
            );
            CREATE INDEX ON ${table} (target_user_id, filters_hash, type) WHERE deleted = false;
            CREATE UNIQUE INDEX ON ${table} (id) WHERE dirty = true;
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
            var propNames = [ 'deleted', 'dirty', 'finalized', 'type', 'target_user_id' ];
            return this.createNotificationTriggers(db, schema, propNames);
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
            conds.push(`"hasCandidates"(details, ${storyIds})`);
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
        _.each(rows, (row) => {
            if (!row.finalized) {
                if (credentials.user.id === row.target_user_id) {
                    // add new stories from list of candidates
                    this.finalize(db, schema, row);
                }
            }
        });
        return LiveData.export.call(this, db, schema, rows, credentials, options).then((objects) => {
            _.each(objects, (object, index) => {
                var row = rows[index];
                object.type = row.type;
                object.target_user_id = row.target_user_id;
                object.filters = row.filters;
                object.story_ids = _.map(row.details.stories, 'id');
                object.details = undefined;
                if (row.dirty) {
                    object.dirty = true;
                }

                if (credentials.user.id !== row.target_user_id) {
                    throw new HTTPError(403);
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
        if (LiveData.isRelevantTo.call(this, event, user, subscription)) {
            if (event.current.target_user_id === user.id) {
                if (event.current.dirty) {
                    // the row will be updated soon
                    return false;
                }
                if (event.current.finalized) {
                    // since finalization is caused by the client retrieving the
                    // object, there's no point in informing it
                    return false;
                }
                return true;
            }
        }
        return false;
    },

    /**
     * Move stories from candidate list into actual list
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object} row
     */
    finalize: function(db, schema, row) {
        if (chooseStories(row)) {
            // save the results
            setTimeout(() => {
                Database.open().then((db) => {
                    this.updateOne(db, schema, {
                        id: row.id,
                        details: row.details,
                        finalized: true,
                    });
                });
            }, 50);
        }
        setTimeout(() => {
            Database.open().then((db) => {
                // finalize other listings now for consistency sake
                var criteria = {
                    type: row.type,
                    target_user_id: row.target_user_id,
                    finalized: false,
                };
                return this.find(db, schema, criteria, '*').each((otherRow) => {
                    if (otherRow.id !== row.id) {
                        if (chooseStories(otherRow)) {
                            return this.updateOne(db, schema, {
                                id: otherRow.id,
                                details: otherRow.details,
                                finalized: true,
                            });
                        }
                    }
                });
            });
        }, 50);
    },
});

/**
 * Move stories from candidate list into the chosen list, operating on the
 * object passed directly
 *
 * @param  {Story} row
 *
 * @return {Boolean}
 */
function chooseStories(row) {
    var now = new Date;
    var limit = _.get(row.filters, 'limit', 100);
    var retention = _.get(row.filters, 'retention', 24 * HOUR);
    var newStories = _.get(row.details, 'candidates', []);
    var oldStories = _.get(row.details, 'stories', []);
    var backfillingStories = _.get(row.details, 'backfill_candidates', []);

    // we want to show as many new stories as possible
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
            // still got too many--toss out some of the new ones
            var newStoryRatio = Math.min(1, newStoryCount / limit);
            var removalRatio = newStoryRatio * 0.5;
            var removeNew = Math.min(extra, Math.floor(newStoryCount * removalRatio));
            // example:
            //
            // if limit = 100 and newStoryCount = 10
            // then removalRatio = 0.05 and removeNew = 0
            //
            // if limit = 100 and newStoryCount = 20
            // then removalRatio = 0.10 and removeNew = 2
            //
            // if limit = 100 and newStoryCount = 50
            // then removalRatio = 0.25 and removeNew = 12
            //
            // if limit = 100 and newStoryCount = 100
            // then removalRatio = 0.50 and removeNew = 50
            //
            newStoryCount -= removeNew;
            extra -= removeNew;

            if (extra > 0) {
                // remove additional old stories
                var removeOld = Math.min(extra, oldStoryCount);
                oldStoryCount -= removeOld;
                extra -= removeOld;

                if (extra > 0) {
                    // there're no old stories at this point, so the difference
                    // must come from the list of new ones
                    newStoryCount -= extra;
                }
            }
        }
    }
    if (oldStoryCount !== oldStories.length || newStories.length > 0 || backfillingStories.length > 0) {
        if (oldStoryCount !== oldStories.length) {
            // remove older stories
            oldStories = _.slice(oldStories, oldStories.length - oldStoryCount);
        }
        // remember the latest story that was considered (not necessarily going
        // to be included in the list)
        var latestStory = _.maxBy(newStories, 'btime');
        if (newStories.length > newStoryCount) {
            newStories = removeStoriesWithLowRating(newStories, row, newStoryCount);
        }
        var rtime = now.toISOString();
        var stories = addStories(oldStories, newStories, rtime);

        // see if we have the right number of stories
        var gap = limit - _.size(stories);
        if (gap > 0) {
            // backfill the gap
            if (backfillingStories.length > gap) {
                backfillingStories = removeStoriesWithLowRating(backfillingStories, row, gap);
            }
            stories = addStories(stories, backfillingStories, rtime);
        }

        var earliestStory = _.minBy(stories, 'btime');
        if (latestStory) {
            row.details.latest = latestStory.btime;
        }
        if (earliestStory) {
            row.details.earliest = earliestStory.btime;
        }
        row.details.stories = stories;
        row.details.candidates = [];
        row.details.backfill_candidates = undefined;
        // the object is going to be sent prior to being saved
        // bump up the generation number manually
        row.gn += 1;
        return true;
    } else {
        return false;
    }
}

/**
 * Return a new list with new stories added, ordered by btime
 *
 * @param  {Array<Object>} stories
 * @param  {Array<Object>} newStories
 * @param  {String} rtime
 *
 * @return {Array<Object>}
 */
function addStories(stories, newStories, rtime) {
    if (_.isEmpty(newStories)) {
        return stories;
    }
    stories = _.slice(stories);
    _.each(newStories, (story) => {
        // don't need the info used to calculate rating any more
        // just attach the retrieval time
        var s = {
            id: story.id,
            btime: story.btime,
            rtime: rtime,
        };
        // insert it in the correct location based on publication or bump time
        var index = _.sortedIndexBy(stories, s, 'btime');
        stories.splice(index, 0, s);
    });
    return stories;
}

/**
 * Return a list with the desired number of stories, removing those that are
 * lowly rated
 *
 * @param  {Array<Object>} stories
 * @param  {Listing} listing
 * @param  {Number} desiredLength
 *
 * @return {Array<Object>}
 */
function removeStoriesWithLowRating(stories, listing, desiredLength) {
    // apply retrieval time rating adjustments
    var context = ByRetrievalTime.createContext(stories, listing);
    _.eachRight(stories, (story) => {
        story.rating += ByRetrievalTime.calculateRating(context, story);
    });
    var storiesByRating = _.orderBy(stories, [ 'rating', 'btime' ], [ 'asc', 'asc' ]);
    return _.slice(storiesByRating, stories.length - desiredLength);
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
    var keys = _.sortBy(_.keys(filters));
    _.each(keys, (key) => {
        values[key] = filters[key];
    });
    var text = JSON.stringify(values);
    var hash = Crypto.createHash('md5').update(text);
    return hash.digest("hex");
}

export {
    Listing as default,
    Listing,
};
