import _ from 'lodash';
import Promise from 'bluebird';

import StoryTypeRatings from 'story-raters/ratings/story-type-ratings';

const ByType = {
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

export {
    ByType as default,
    ByType,
};
