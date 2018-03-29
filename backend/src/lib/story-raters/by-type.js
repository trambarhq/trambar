var _ = require('lodash');
var Promise = require('bluebird');

var StoryTypeRatings = require('story-raters/ratings/story-type-ratings');

module.exports = {
    type: 'by-type',
    calculation: 'immediate',
    columns: [ 'type' ],
    monitoring: [],

    prepareContext: function(db, schema, stories, listing) {
        return Promise.resolve({});
    },

    calculateRating: function(context, story) {
        var rating = StoryTypeRatings[story.type] || 0;
        return rating;
    },

    handleEvent: function(evt) {
    },
};
