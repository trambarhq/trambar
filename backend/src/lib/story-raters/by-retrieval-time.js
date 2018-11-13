import _ from 'lodash';
import Promise from 'bluebird';
import Moment from 'moment';

import RetrievalTimeRatings from 'story-raters/ratings/retrieval-time-ratings';

const ByRetrievalTime = {
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

export {
    ByRetrievalTime as default,
    ByRetrievalTime,
};
