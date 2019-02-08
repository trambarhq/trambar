import _ from 'lodash';
import Moment from 'moment';

import TypeDiversityRatings from 'story-raters/ratings/type-diversity-ratings';
import UserDiversityRatings from 'story-raters/ratings/user-diversity-ratings';

class ByDiversity {
    constructor() {
        this.type = 'by-diversity';
        this.calculation = 'immediate';
        this.columns = [ 'type', 'user_ids' ];
        this.monitoring = [];
    }

    async prepareContext(db, schema, stories, listing) {
        let userCounts = {};
        let typeCounts = {};
        for (let story of stories) {
            let userId = story.user_ids[0];
            let type = story.type;
            let userCount = userCounts[userId] || 0;
            let typeCount = typeCounts[type] || 0;
            userCounts[userId] = userCount + 1;
            typeCounts[type] = typeCount + 1;
        }
        let userPercentages = _.mapValues(userCounts, (count) => {
            return _.round(count * 100 / stories.length);
        });
        let typePercentages = _.mapValues(typeCounts, (count) => {
            return _.round(count * 100 / stories.length);
        });
        return { userPercentages, typePercentages };
    }

    calculateRating(context, story) {
        let userId = story.user_ids[0];
        let type = story.type;
        let rating = 0;
        let typePercentage = context.typePercentages[type];
        let typeDiversityBonus = _.find(TypeDiversityRatings, (value, key) => {
            if (typePercentage <= parseInt(key)) {
                return true;
            }
        });
        if (typeDiversityBonus) {
            rating += typeDiversityBonus;
        }
        let userPercentage = context.userPercentages[userId];
        let userDiversityBonus = _.find(UserDiversityRatings, (value, key) => {
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

const instance = new ByDiversity;

export {
    instance as default,
    ByDiversity,
};
