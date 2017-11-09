var _ = require('lodash');
var Story = require('accessors/story');

module.exports = {
    type: 'story-date-range',
    // tables from which the stats are derived
    sourceTables: [ 'story' ],
    filteredColumns: {
        story: {
            user_ids: 'user_ids',
            role_ids: 'role_ids',
            external_object: 'external_object',
        },
    },
    depedentColumns: {
        story: [
            'ptime',
        ],
    },
    // additional criteria that objects must also meet to be included
    fixedFilters: {
        story: {
            deleted: false,
            published: true,
        }
    },

    generate: function(db, schema, filters) {
        // apply fixed filters
        var criteria = _.clone(this.fixedFilters.story);
        // then apply per-row filters
        _.assign(criteria, filters);
        var columns = 'MIN(ptime), MAX(ptime), COUNT(ptime)';
        return Story.findOne(db, schema, criteria, columns).then((row) => {
            return {
                details: {
                    start_time: _.get(row, 'min', ''),
                    end_time: _.get(row, 'max', ''),
                },
                sample_count: _.get(row, 'count', 0),
            };
        });
    }
}
