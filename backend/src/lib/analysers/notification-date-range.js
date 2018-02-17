var _ = require('lodash');
var Notification = require('accessors/notification');

module.exports = {
    type: 'notification-date-range',
    // tables from which the stats are derived
    sourceTables: [ 'notification' ],
    filteredColumns: {
        notification: {
            target_user_id: 'target_user_id',
        },
    },
    depedentColumns: {
        notification: [
            'ctime',
        ],
    },
    // additional criteria that objects must also meet to be included
    fixedFilters: {
        notification: {
            deleted: false,
        }
    },

    generate: function(db, schema, filters) {
        // apply fixed filters
        var criteria = _.clone(this.fixedFilters.notification);
        // then apply per-row filters
        _.assign(criteria, filters);
        var columns = 'MIN(ctime), MAX(ctime), COUNT(ctime)';
        return Notification.findOne(db, schema, criteria, columns).then((row) => {
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
