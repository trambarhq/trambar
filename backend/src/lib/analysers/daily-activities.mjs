import _ from 'lodash';
import Moment from 'moment';

import Story from '../accessors/story.mjs';

class DailyActivities {
    constructor() {
        this.type = 'daily-activities';
        // tables from which the stats are derived
        this.sourceTables = [ 'story' ];
        // filters and the columns they act on--determine which objects are
        // included in the statistics;
        this.filteredColumns = {
            story: {
                user_ids: 'user_ids',
                role_ids: 'role_ids',
                time_range: 'ptime',
                external_object: 'external',
                public: 'public',
            },
        };
        // additional criteria that objects must also meet to be included
        this.fixedFilters = {
            story: {
                deleted: false,
                published: true,
            }
        };
        // columns in the table(s) that affects the results (columns used by the
        // filters would, of course, also impact the results)
        this.depedentColumns = {
            story: [
                'type',
                'ptime',
                'tags',
            ],
        };
    }

    async generate(db, schema, filters) {
        // apply fixed filters
        let criteria = _.clone(this.fixedFilters.story);
        // then apply per-row filters
        _.assign(criteria, _.omit(filters, 'timezone'));

        // load the stories
        let rows = await Story.find(db, schema, criteria, 'type, tags, ptime');
        let tzOffset = _.get(filters, 'tz_offset', 0);
        let activities = {};
        for (let row of rows) {
            // get the date, taking into consideration the timezone requested
            let date = Moment(row.ptime).utcOffset(tzOffset).format('YYYY-MM-DD');
            // count both story types and tags
            let keys = _.concat(row.type, row.tags);
            for (let key of keys) {
                let counts = activities[date];
                if (!counts) {
                    counts = activities[date] = {};
                }
                // increment the count for key
                counts[key] = (counts[key] || 0) + 1;
            }
        }
        return {
            details: activities,
            sample_count: rows.length,
        };
    }
}

const instance = new DailyActivities;

export {
    instance as default,
    DailyActivities,
};
