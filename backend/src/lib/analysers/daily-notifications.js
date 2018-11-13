import _ from 'lodash';
import Moment from 'moment-timezone';
import Notification from 'accessors/notification';

const DailyNotifications = {
    type: 'daily-notifications',
    // tables from which the stats are derived
    sourceTables: [ 'notification' ],
    // filters and the columns they act on--determine which objects are
    // included in the statistics;
    filteredColumns: {
        notification: {
            target_user_id: 'target_user_id',
            time_range: 'ctime',
        },
    },
    // additional criteria that objects must also meet to be included
    fixedFilters: {
        notification: {
            deleted: false,
        }
    },
    // columns in the table(s) that affects the results (columns used by the
    // filters would, of course, also impact the results)
    depedentColumns: {
        notification: [
            'type',
            'ctime',
        ],
    },

    generate: function(db, schema, filters) {
        // apply fixed filters
        var criteria = _.clone(this.fixedFilters.notification);
        // then apply per-row filters
        _.assign(criteria, _.omit(filters, 'timezone'));

        // load the notifications
        return Notification.find(db, schema, criteria, 'type, ctime').then((rows) => {
            var timezone = _.get(filters, 'timezone', 'GMT');

            var notifications = {};
            _.each(rows, (row) => {
                // get the date, taking into consideration the timezone requested
                var date = Moment(row.ctime).tz(timezone).format('YYYY-MM-DD');
                var counts = notifications[date];
                if (!counts) {
                    counts = notifications[date] = {};
                }
                // increment the count for story type
                counts[row.type] = (counts[row.type] || 0) + 1;
            });
            return {
                details: notifications,
                sample_count: rows.length,
            };
        });
    }
}

export {
    DailyNotifications as default,
    DailyNotifications,
};
