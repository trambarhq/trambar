const StoryTypes = [
    'push',
    'merge',
    'branch',
    'tag',
    'issue',
    'milestone',
    'merge-request',
    'wiki',
    'member',
    'repo',
    'post',
    'survey',
    'task-list',
    'website-traffic',
];

const EditableStoryTypes = [
    'post',
    'task-list',
    'survey',
];

const TrackableStoryTypes = [
    'post',
];

const GitStoryTypes = [
    'push',
    'merge',
    'branch',
    'tag',
    'issue',
    'milestone',
    'merge-request',
    'wiki',
    'member',
    'repo',
];

const isNodeJs = Object.prototype.toString.call(typeof process !== 'undefined' ? process : 0) === '[object process]';
let StoryIcons;
if (!isNodeJs) {
    StoryIcons = {
        'push': require('octicons/build/svg/repo-push.svg'),
        'merge': require('octicons/build/svg/git-merge.svg'),
        'branch': require('octicons/build/svg/git-branch.svg'),
        'tag': require('octicons/build/svg/tag.svg'),
        'issue': require('octicons/build/svg/issue-opened.svg'),
        'issue.opened': require('octicons/build/svg/issue-opened.svg'),
        'issue.closed': require('octicons/build/svg/issue-closed.svg'),
        'issue.reopened': require('octicons/build/svg/issue-reopened.svg'),
        'milestone': require('octicons/build/svg/milestone.svg'),
        'merge-request': require('octicons/build/svg/git-pull-request.svg'),
        'wiki': require('octicons/build/svg/file.svg'),
        'member': require('octicons/build/svg/person.svg'),
        'repo': require('octicons/build/svg/repo.svg'),
        'post': require('octicons/build/svg/note.svg'),
        'survey': require('octicons/build/svg/list-unordered.svg'),
        'task-list': require('octicons/build/svg/list-ordered.svg'),
    };
}

export {
    StoryTypes as default,
    StoryTypes,
    EditableStoryTypes,
    TrackableStoryTypes,
    GitStoryTypes,
    StoryIcons,
};
