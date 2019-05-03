import _ from 'lodash';
import Notification from './notification.mjs';

class NotificationDateRange {
    constructor() {
        this.type = 'notification-date-range';
        // tables from which the stats are derived
        this.sourceTables = [ 'notification' ];
        this.filteredColumns = {
            notification: {
                target_user_id: 'target_user_id',
            },
        };
        this.depedentColumns = {
            notification: [
                'ctime',
            ],
        };
        // additional criteria that objects must also meet to be included
        this.fixedFilters = {
            notification: {
                deleted: false,
            }
        };
    }

    async generate(db, schema, filters) {
        // apply fixed filters
        let criteria = _.clone(this.fixedFilters.notification);
        // then apply per-row filters
        _.assign(criteria, filters);
        let columns = 'MIN(ctime), MAX(ctime), COUNT(ctime)';
        let row = await Notification.findOne(db, schema, criteria, columns);
        return {
            details: {
                start_time: _.get(row, 'min', ''),
                end_time: _.get(row, 'max', ''),
            },
            sample_count: _.get(row, 'count', 0),
        };
    }
}

const instance = new NotificationDateRange;

export {
    instance as default,
    NotificationDateRange,
};
