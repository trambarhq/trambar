var _ = require('lodash');
var Promise = require('bluebird');

var Statistics = require('accessors/statistics');

var ReactionTypeRatings = require('story-raters/ratings/reaction-type-ratings');

module.exports = {
    type: 'by-popularity',
    calculation: 'immediate',
    columns: [ 'id' ],
    monitoring: [ 'statistics' ],
    statisticsCache: [],

    /**
     * Load data needed to rate the given stories
     *
     * @param  {Database} db
     * @param  {Schema} schema
     * @param  {Array<Story>} stories
     * @param  {Listing} listing
     *
     * @return {Promise<Object>}
     */
    prepareContext: function(db, schema, stories, listing) {
        var missing = [];
        var popularity = {};
        _.each(stories, (story) => {
            var statistics = this.findCachedStatistics(schema, story.id)
            if (statistics) {
                popularity[story.id] = statistics.details;
            } else {
                missing.push(story.id);
            }
        });
        if (_.isEmpty(missing)) {
            return Promise.resolve({ popularity });
        } else {
            return Promise.each(missing, (storyId) => {
                return this.loadStatistics(db, schema, storyId).then((statistics) => {
                    popularity[storyId] = (statistics) ? statistics.details : {};
                });
            }).return({ popularity });
        }
    },

    /**
     * Give a numeric score to a story
     *
     * @param  {Object} context
     * @param  {Story} story
     *
     * @return {Number}
     */
    calculateRating: function(context, story) {
        var details = context.popularity[story.id];
        var rating = _.reduce(details, (total, count, type) => {
            var reactionRating = ReactionTypeRatings[type] || 0;
            return total + (reactionRating * count);
        }, 0);
        return rating;
    },

    /**
     * Handle database change events
     *
     * @param  {Object} evt
     */
    handleEvent: function(evt) {
        if (evt.table === 'statistics') {
            if (evt.diff.details) {
                this.clearCachedStatistics(evt.schema, evt.id);
            }
        }
    },

    /**
     * Load statistics from database, saving it to cache
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Number} storyId
     *
     * @return {Object|null}
     */
    loadStatistics: function(db, schema, storyId) {
        var criteria = {
            type: 'story-popularity',
            filters: {
                story_id: storyId
            },
            deleted: false,
        };
        return Statistics.findOne(db, schema, criteria, 'id, details').then((row) => {
            if (row) {
                this.cacheStatistics(schema, storyId, row);
            }
            return row;
        });
    },

    /**
     * Save statistics to cache
     *
     * @param  {String} schema
     * @param  {Number} storyId
     * @param  {Object} statistics
     */
    cacheStatistics: function(schema, storyId, statistics) {
        var entry = { schema, storyId, statistics };
        this.statisticsCache.unshift(entry);
        if (this.statisticsCache.length > 5000) {
            this.statisticsCache.splice(5000);
        }
    },

    /**
     * Find cached statistics
     *
     * @param  {String} schema
     * @param  {Number} storyId
     *
     * @return {Object|null}
     */
    findCachedStatistics: function(schema, storyId) {
        var index = _.findIndex(this.statisticsCache, { schema, storyId });
        if (index === -1) {
            return null;
        }
        var entry = this.statisticsCache[index];
        this.statisticsCache.splice(index, 1);
        this.statisticsCache.unshift(entry);
        return entry.statistics;
    },

    /**
     * Remove an entry from cache
     *
     * @param  {String} schema
     * @param  {Number} id
     */
    clearCachedStatistics: function(schema, id) {
        var index = _.findIndex(this.statisticsCache, (entry) => {
            if (entry.schema === schema) {
                if (entry.statistics.id === id) {
                    return true;
                }
            }
        });
        if (index === -1) {
            return;
        }
        this.statisticsCache.splice(index, 1);
    },
};
