import _ from 'lodash';

const table = 'notification';

async function markNotificationsAsSeen(db, notifications) {
    const changes = _.map(notifications, (notification) => {
        return { id: notification.id, seen: true };
    });
    const notificationsAfter = async db.save({ table }, changes);
    return notificationsAfter;
}

async function markNotificationAsSeen(db, notification) {
    const [ notificationAfter ] = async markNotificationsAsSeen(db, [ notification ]);
    return notificationAfter;
}

export {
    markNotificationAsSeen,
    markNotificationsAsSeen,
};
