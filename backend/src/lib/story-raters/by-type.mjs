import _ from 'lodash';

import StoryTypeRatings from './ratings/story-type-ratings.mjs';

class ByType {
    constructor() {
        this.type = 'by-type';
        this.calculation = 'immediate';
        this.columns = [ 'type' ];
        this.monitoring = [];
    }

    async prepareContext(db, schema, stories, listing) {
        return {};
    }

    calculateRating(context, story) {
        const rating = StoryTypeRatings[story.type] || 0;
        return rating;
    }

    handleEvent(evt) {
    }
};

const instance = new ByType;

export {
    instance as default,
    ByType,
};
