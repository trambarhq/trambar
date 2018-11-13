import _ from 'lodash';
import Promise from 'bluebird';
import Moment from 'moment';

import TypeDiversityRatings from 'story-raters/ratings/type-diversity-ratings';
import UserDiversityRatings from 'story-raters/ratings/user-diversity-ratings';

const ByDiversity = {
    type: 'by-diversity',
    calculation: 'immediate',
    columns: [ 'type', 'user_ids' ],
    monitoring: [],

    prepareContext: function(db, schema, stories, listing) {
        return Promise.try(() => {
            var userCounts = {};
            var typeCounts = {};
            _.each(stories, (story) => {
                var userId = story.user_ids[0];
                var type = story.type;
                var userCount = userCounts[userId] || 0;
                var typeCount = typeCounts[type] || 0;
                userCounts[userId] = userCount + 1;
                typeCounts[type] = typeCount + 1;
            });
            var userPercentages = _.mapValues(userCounts, (count) => {
                return _.round(count * 100 / stories.length);
            });
            var typePercentages = _.mapValues(typeCounts, (count) => {
                return _.round(count * 100 / stories.length);
            });
            return { userPercentages, typePercentages };
        });
    },

    calculateRating: function(context, story) {
        var userId = story.user_ids[0];
        var type = story.type;
        var rating = 0;
        var typePercentage = context.typePercentages[type];
        var typeDiversityBonus = _.find(TypeDiversityRatings, (value, key) => {
            if (typePercentage <= parseInt(key)) {
                return true;
            }
        });
        if (typeDiversityBonus) {
            rating += typeDiversityBonus;
        }
        var userPercentage = context.userPercentages[userId];
        var userDiversityBonus = _.find(UserDiversityRatings, (value, key) => {
            if (userPercentage <= parseInt(key)) {
                return true;
            }
        });
        if (userDiversityBonus) {
            rating += userDiversityBonus;
        }
        return rating;
    },
};

export {
    ByDiversity as default,
    ByDiversity,
};
