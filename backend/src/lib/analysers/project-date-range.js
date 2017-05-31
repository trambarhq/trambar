var _ = require('lodash');
var Story = require('accessors/statistics');

module.exports = {
    type: 'project-date-range',
    // tables from which the stats are derived
    sourceTables: [ 'story' ],
    filteredColumns: {
        story: {
            role_ids: 'role_ids',
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
        // query database directly, making use of helper functions in accessor
        var table = Story.getTableName(schema);
        var query = {
            conditions: [],
            parameters: [],
        };
        Story.apply(criteria, query);
        var sql = `
            SELECT MIN(ptime) AS start, MAX(ptime) AS end, COUNT(ptime) FROM ${table}
            WHERE ${query.conditions.join(' AND ')}
        `;
        return db.query(sql, query.parameters).get(0).then((row) => {
            return {
                details: {
                    start_time: _.get(row, 'start', ''),
                    end_time: _.get(row, 'end', ''),
                },
                sample_count: _.get(row, 'count', 0),
            };
        });
    }
}
