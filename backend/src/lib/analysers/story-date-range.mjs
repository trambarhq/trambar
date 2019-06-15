import _ from 'lodash';
import Story from '../accessors/story.mjs';

class StoryDateRange {
    constructor() {
        this.type = 'story-date-range';
        // tables from which the stats are derived
        this.sourceTables = [ 'story' ];
        this.filteredColumns = {
            story: {
                user_ids: 'user_ids',
                role_ids: 'role_ids',
                external_object: 'external',
                public: 'public',
            },
        };
        this.depedentColumns = {
            story: [
                'ptime',
            ],
        };
        // additional criteria that objects must also meet to be included
        this.fixedFilters = {
            story: {
                deleted: false,
                published: true,
            }
        };
    }

    async generate(db, schema, filters) {
        // apply fixed filters
        const criteria = { ...this.fixedFilters.story, ...filters };
        const columns = 'MIN(ptime), MAX(ptime), COUNT(ptime)';
        const row = await Story.findOne(db, schema, criteria, columns);
        return {
            details: {
                start_time: _.get(row, 'min', ''),
                end_time: _.get(row, 'max', ''),
            },
            sample_count: _.get(row, 'count', 0),
        };
    }
}

const instance = new StoryDateRange;

export {
    instance as default,
    StoryDateRange,
};
