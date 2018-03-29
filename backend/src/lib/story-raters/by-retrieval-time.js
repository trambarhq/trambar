var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');

var RetrievalTimeRatings = require('story-raters/ratings/retrieval-time-ratings');

module.exports = {
    type: 'by-retrieval-time',
    calculation: 'deferred',

    createContext: function(stories, listing) {
        var now = Moment();
        var recent = now.clone().subtract(2, 'hour').toISOString();
        var today = now.clone().startOf('day').toISOString();
        var yesterday = now.clone().subtract(1, 'day').startOf('day').toISOString();
        var week = now.clone().subtract(7, 'week').startOf('day').toISOString();
        var month = now.clone().subtract(1, 'month').startOf('day').toISOString();
        var year = now.clone().subtract(1, 'year').startOf('day').toISOString();
        return { recent, today, yesterday, week, month, year };
    },

    calculateRating: function(context, story) {
        var period = _.findKey(context, (time) => {
            if (story.btime > time) {
                return true;
            }
        });
        var rating = RetrievalTimeRatings[period] || 0;
        return rating;
    },
};
