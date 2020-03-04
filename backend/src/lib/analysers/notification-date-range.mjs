import _ from 'lodash';
import { Notification } from '../accessors/notification.mjs';

export class NotificationDateRange {
  static type = 'notification-date-range';
  // tables from which the stats are derived
  static sourceTables = [ 'notification' ];
  static filteredColumns = {
    notification: {
      target_user_id: 'target_user_id',
    },
  };
  static depedentColumns = {
    notification: [
      'ctime',
    ],
  };
  // additional criteria that objects must also meet to be included
  static fixedFilters = {
    notification: {
      deleted: false,
    }
  };

  static async generate(db, schema, filters) {
    const criteria = { ...this.fixedFilters.notification, ...filters };
    const columns = 'MIN(ctime), MAX(ctime), COUNT(ctime)';
    const row = await Notification.findOne(db, schema, criteria, columns);
    return {
      details: {
        start_time: _.get(row, 'min', ''),
        end_time: _.get(row, 'max', ''),
      },
      sample_count: _.get(row, 'count', 0),
    };
  }
}
