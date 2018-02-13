module.exports = exports = [
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

exports.admin = [
    'join-request',
];

exports.git = [
    'push',
    'merge',
    'note',
    'assignment',
    'issue',
];

exports.git.membership = [
    'assignment',
];
