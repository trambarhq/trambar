import _ from 'lodash';

const table = 'notification';

function markNotificationsAsSeen(db, notifications) {
    const changes = _.map(notifications, (notification) => {
        return { id: notification.id, seen: true };
    });
    const notificationsAfter = db.save({ table }, changes);
    return notificationsAfter;
}

function markNotificationAsSeen(db, notification) {
    const [ notificationAfter ] = markNotificationsAsSeen(db, [ notification ]);
    return notificationAfter;
}

export {
    markNotificationAsSeen,
    markNotificationsAsSeen,
};
