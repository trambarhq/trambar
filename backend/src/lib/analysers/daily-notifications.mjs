import _ from 'lodash';
import Moment from 'moment-timezone';
import Notification from '../accessors/notification.mjs';

class DailyNotifications {
    constructor() {
        this.type = 'daily-notifications';
        // tables from which the stats are derived
        this.sourceTables = [ 'notification' ];
        // filters and the columns they act on--determine which objects are
        // included in the statistics;
        this.filteredColumns = {
            notification: {
                target_user_id: 'target_user_id',
                time_range: 'ctime',
            },
        };
        // additional criteria that objects must also meet to be included
        this.fixedFilters = {
            notification: {
                deleted: false,
            }
        };
        // columns in the table(s) that affects the results (columns used by the
        // filters would, of course, also impact the results)
        this.depedentColumns = {
            notification: [
                'type',
                'ctime',
            ],
        };
    }

    async generate(db, schema, filters) {
        const { timezone, ...basic } = filters;
        const criteria = { ...this.fixedFilters.notification, ...basic };

        // load the notifications
        const rows = await Notification.find(db, schema, criteria, 'type, ctime');

        const notifications = {};
        for (let row of rows) {
            // get the date, taking into consideration the timezone requested
            const date = Moment(row.ctime).tz(timezone || 'GMT').format('YYYY-MM-DD');
            const counts = notifications[date];
            if (!counts) {
                counts = notifications[date] = {};
            }
            // increment the count for story type
            counts[row.type] = (counts[row.type] || 0) + 1;
        }
        return {
            details: notifications,
            sample_count: rows.length,
        };
    }
}

const instance = new DailyNotifications;

export {
    instance as default,
    DailyNotifications,
};
