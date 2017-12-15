var _ = require('lodash');
var Promise = require('bluebird');

var RetrievalTimeRatings = require('story-raters/ratings/retrieval-time-ratings');

module.exports = {
    type: 'by-retrieval-time',

    createContext: function(stories, listing) {
        var now = Moment();
        var recent = now.clone().subtract(2, 'hour').toISOString();
        var today = now.clone().startOf('day').toISOString();
        var yesterday = now.clone().subtract(1, 'day').startOf('day').toISOString();
        var week = now.clone().subtract(7, 'day').startOf('day').toISOString();
        return { recent, today, yesterday, week };
    },

    calculateRating: function(context, story) {
        var period = _.findIndex(context, (time) => {
            if (story.btime > time) {
                return true;
            }
        });
        var rating = RetrievalTimeRatings[period] || 0;
        return rating;
    },
};
