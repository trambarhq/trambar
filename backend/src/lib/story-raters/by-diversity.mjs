import _ from 'lodash';
import Moment from 'moment';

import TypeDiversityRatings from './ratings/type-diversity-ratings.mjs';
import UserDiversityRatings from './ratings/user-diversity-ratings.mjs';

export class ByDiversity {
  static type = 'by-diversity';
  static calculation = 'immediate';
  static columns = [ 'type', 'user_ids' ];
  static monitoring = [];

  static async prepareContext(db, schema, stories, listing) {
    const userCounts = {};
    const typeCounts = {};
    for (let story of stories) {
      const userID = story.user_ids[0];
      const type = story.type;
      const userCount = userCounts[userID] || 0;
      const typeCount = typeCounts[type] || 0;
      userCounts[userID] = userCount + 1;
      typeCounts[type] = typeCount + 1;
    }
    const userPercentages = _.mapValues(userCounts, (count) => {
      return _.round(count * 100 / stories.length);
    });
    const typePercentages = _.mapValues(typeCounts, (count) => {
      return _.round(count * 100 / stories.length);
    });
    return { userPercentages, typePercentages };
  }

  static calculateRating(context, story) {
    const userID = story.user_ids[0];
    const type = story.type;
    let rating = 0;
    const typePercentage = context.typePercentages[type];
    const typeDiversityBonus = _.find(TypeDiversityRatings, (value, key) => {
      if (typePercentage <= parseInt(key)) {
        return true;
      }
    });
    if (typeDiversityBonus) {
      rating += typeDiversityBonus;
    }
    const userPercentage = context.userPercentages[userID];
    const userDiversityBonus = _.find(UserDiversityRatings, (value, key) => {
      if (userPercentage <= parseInt(key)) {
        return true;
      }
    });
    if (userDiversityBonus) {
      rating += userDiversityBonus;
    }
    return rating;
  }
}
