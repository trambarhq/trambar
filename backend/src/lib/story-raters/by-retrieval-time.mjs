import _ from 'lodash';
import Moment from 'moment';

import RetrievalTimeRatings from './ratings/retrieval-time-ratings.mjs';

export class ByRetrievalTime {
  static type = 'by-retrieval-time';
  static calculation = 'deferred';

  static createContext(stories, listing) {
    const now = Moment();
    const recent = now.clone().subtract(2, 'hour').toISOString();
    const today = now.clone().startOf('day').toISOString();
    const yesterday = now.clone().subtract(1, 'day').startOf('day').toISOString();
    const week = now.clone().subtract(7, 'week').startOf('day').toISOString();
    const month = now.clone().subtract(1, 'month').startOf('day').toISOString();
    const year = now.clone().subtract(1, 'year').startOf('day').toISOString();
    return { recent, today, yesterday, week, month, year };
  }

  static calculateRating(context, story) {
    const period = _.findKey(context, (time) => {
      if (story.btime > time) {
        return true;
      }
    });
    const rating = RetrievalTimeRatings[period] || 0;
    return rating;
  }
}
