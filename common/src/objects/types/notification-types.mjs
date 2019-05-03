const NotificationTypes = [
    'like',
    'comment',
    'task-completion',
    'vote',
    'survey',
    'coauthor',
    'bookmark',
    'mention',
    'note',
    'assignment',
    'issue',
    'push',
    'merge',
    'join-request',
];

const AdminNotificationTypes = [
    'join-request',
];

const GitNotificationTypes = [
    'push',
    'merge',
    'note',
    'assignment',
    'issue',
];

const MembershipNotificationTypes = [
    'assignment',
];

export {
    NotificationTypes as default,
    NotificationTypes,
    AdminNotificationTypes,
    GitNotificationTypes,
    MembershipNotificationTypes,
};
