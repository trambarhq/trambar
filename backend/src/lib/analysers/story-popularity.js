import _ from 'lodash';

import Reaction from 'accessors/reaction';

const StoryPopularity = {
    type: 'story-popularity',
    // tables from which the stats are derived
    sourceTables: [ 'reaction' ],
    // filters and the columns they act on--determine which objects are
    // included in the statistics;
    filteredColumns: {
        reaction: {
            story_id: 'story_id',
        },
    },
    // additional criteria that objects must also meet to be included
    fixedFilters: {
        reaction: {
            deleted: false,
            published: true,
        }
    },
    // columns in the table(s) that affects the results (columns used by the
    // filters would, of course, also impact the results)
    depedentColumns: {
        reaction: [
            'type',
        ],
    },

    generate: function(db, schema, filters) {
        // apply fixed filters
        var criteria = _.clone(this.fixedFilters.reaction);
        // then apply per-row filters
        _.assign(criteria, filters);

        // load the reactions
        return Reaction.find(db, schema, criteria, 'type').then((rows) => {
            // count by type
            var counts = {};
            _.each(rows, (row) => {
                counts[row.type] = (counts[row.type] || 0) + 1;
            });
            return {
                details: counts,
                sample_count: rows.length,
            };
        });
    }
}

export {
    StoryPopularity as default,
    StoryPopularity,
};
