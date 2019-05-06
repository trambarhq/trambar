import _ from 'lodash';
import Moment from 'moment';

import RetrievalTimeRatings from './ratings/retrieval-time-ratings.mjs';

class ByRetrievalTime {
    constructor() {
        this.type = 'by-retrieval-time';
        this.calculation = 'deferred';
    }

    createContext(stories, listing) {
        let now = Moment();
        let recent = now.clone().subtract(2, 'hour').toISOString();
        let today = now.clone().startOf('day').toISOString();
        let yesterday = now.clone().subtract(1, 'day').startOf('day').toISOString();
        let week = now.clone().subtract(7, 'week').startOf('day').toISOString();
        let month = now.clone().subtract(1, 'month').startOf('day').toISOString();
        let year = now.clone().subtract(1, 'year').startOf('day').toISOString();
        return { recent, today, yesterday, week, month, year };
    }

    calculateRating(context, story) {
        let period = _.findKey(context, (time) => {
            if (story.btime > time) {
                return true;
            }
        });
        let rating = RetrievalTimeRatings[period] || 0;
        return rating;
    }
}

const instance = new ByRetrievalTime;

export {
    instance as default,
    ByRetrievalTime,
};
