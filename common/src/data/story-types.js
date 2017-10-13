module.exports = exports = [
    'push',
    'merge',
    'issue',
    'milestone',
    'wiki',
    'member',
    'repo',
    'story',
    'survey',
    'task-list',
];

exports.icons = {
    'push': require('octicons/build/svg/repo-push.svg'),
    'merge': require('octicons/build/svg/git-merge.svg'),
    'issue': require('octicons/build/svg/issue-opened.svg'),
    'issue.opened': require('octicons/build/svg/issue-opened.svg'),
    'issue.closed': require('octicons/build/svg/issue-closed.svg'),
    'issue.reopened': require('octicons/build/svg/issue-reopened.svg'),
    'milestone': require('octicons/build/svg/milestone.svg'),
    'wiki': require('octicons/build/svg/file-text.svg'),
    'member': require('octicons/build/svg/person.svg'),
    'repo': require('octicons/build/svg/repo.svg'),
    'story': require('octicons/build/svg/note.svg'),
    'survey': require('octicons/build/svg/list-unordered.svg'),
    'task-list': require('octicons/build/svg/list-ordered.svg'),
};

exports.editable = [
    'story',
    'task-list',
    'survey',
];

exports.trackable = [
    'story',
];

exports.git = [
    'push',
    'merge',
    'issue',
    'milestone',
    'wiki',
    'member',
    'repo',
];
