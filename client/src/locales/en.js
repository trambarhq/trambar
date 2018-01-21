require('moment/locale/en-au');
require('moment/locale/en-ca');
require('moment/locale/en-gb');
require('moment/locale/en-ie');
require('moment/locale/en-nz');

module.exports = function(localeCode) {
    return {
        'action-contact-by-email': 'Contact by e-mail',
        'action-contact-by-ichat': 'Contact by iChat',
        'action-contact-by-phone': 'Contact by phone',
        'action-contact-by-skype': 'Contact by Skype',
        'action-contact-by-slack': 'Contact by Slack',
        'action-contact-by-twitter': 'Contact by Twitter',
        'action-view-github-page': 'View Github page',
        'action-view-gitlab-page': 'View Gitlab page',
        'action-view-linkedin-page': 'View LinkedIn page',
        'action-view-stackoverflow-page': 'View Stack Overflow Page',

        'activation-address': 'Server address',
        'activation-cancel': 'Cancel',
        'activation-code': 'Activation code',
        'activation-ok': 'OK',
        'activation-schema': 'Project',

        'alert-$count-new-bookmarks': (count) => {
            return (count === 1) ? `1 new bookmark` : `${count} new bookmarks`;
        },
        'alert-$count-new-notifications': (count) => {
            return (count === 1) ? `1 new notification` : `${count} new notifications`;
        },
        'alert-$count-new-stories': (count) => {
            return (count === 1) ? `1 new story` : `${count} new stories`;
        },

        'app-name': 'Trambar',

        'audio-capture-accept': 'Accept',
        'audio-capture-cancel': 'Cancel',
        'audio-capture-pause': 'Pause',
        'audio-capture-rerecord': 'Rerecord',
        'audio-capture-resume': 'Resume',
        'audio-capture-start': 'Start',
        'audio-capture-stop': 'Stop',

        'bookmark-$count-other-users': (count) => {
            return (count === 1) ? `1 other user` : `${count} other users`;
        },
        'bookmark-$count-users': (count) => {
            return (count === 1) ? `1 user` : `${count} users`;
        },
        'bookmark-$name-and-$users-recommend-this': (name, users) => {
            return [ `${name} and `, users, ` recommend this` ];
        },
        'bookmark-$name-recommends-this': (name) => {
            return `${name} recommends this`;
        },
        'bookmark-$name1-and-$name2-recommend-this': (name) => {
            return [ name1, ' and ', name2, ' recommend this' ];
        },
        'bookmark-recommendations': 'Recommendations',
        'bookmark-you-bookmarked-it': 'You bookmarked this',
        'bookmark-you-bookmarked-it-and-$name-recommends-it': (name) => {
            return `You bookmarked this (and ${name} recommends it)`;
        },
        'bookmark-you-bookmarked-it-and-$users-recommends-it': (users) => {
            return [ `You bookmarked this (and `, users, ` recommend it)` ];
        },

        'bottom-nav-bookmarks': 'Bookmarks',
        'bottom-nav-news': 'News',
        'bottom-nav-notifications': 'Notifications',
        'bottom-nav-people': 'People',
        'bottom-nav-settings': 'Settings',

        'confirmation-cancel': 'Cancel',
        'confirmation-confirm': 'Confirm',

        'diagnostics-show': 'Show diagnostics',
        'diagnostics-show-panel': 'Display this panel',

        'image-editor-upload-in-progress': 'Upload in progress...',

        'issue-cancel': 'Cancel',
        'issue-clear': 'Clear',
        'issue-ok': 'OK',
        'issue-repo': 'Repository',
        'issue-title': 'Title',

        'list-$count-more': (count) => {
            return `${count} more...`;
        },

        'media-close': 'Close',
        'media-download-original': 'Download original',
        'media-editor-embed': 'Embed',
        'media-editor-remove': 'Remove',
        'media-editor-shift': 'Shift',
        'media-next': 'Next',
        'media-previous': 'Previous',

        'membership-request-cancel': 'Cancel',
        'membership-request-join': 'Join',
        'membership-request-ok': 'OK',
        'membership-request-proceed': 'Proceed',
        'membership-request-you-are-now-member': 'You are now a member in this project',
        'membership-request-you-have-requested-membership': 'You have requested membership in this project',

        'mobile-device-revoke': 'revoke',
        'mobile-device-revoke-are-you-sure': 'Are you sure you want to revoke authorization to this device?',

        'mobile-setup-address': 'Server address',
        'mobile-setup-close': 'Close',
        'mobile-setup-code': 'Authorization code',

        'notification-$user-added-you-as-coauthor': (user) => {
            return `${user} invited you to jointly edit a post`;
        },
        'notification-$user-commented-on-your-$story': (user, story) => {
            switch (story) {
                case 'push': story = 'push'; break;
                case 'merge': story = 'merge'; break;
                case 'branch': story = 'branch'; break;
                case 'survey': story = 'survey'; break;
                case 'task-list': story = 'task list'; break;
                default: story = 'post';
            }
            return `${user} commented on your ${story}`;
        },
        'notification-$user-completed-task': (user) => {
            return `${user} completed a task on your list`;
        },
        'notification-$user-likes-your-$story': (user, story) => {
            switch (story) {
                case 'push': story = 'push'; break;
                case 'merge': story = 'merge'; break;
                case 'branch': story = 'branch'; break;
                case 'survey': story = 'survey'; break;
                case 'task-list': story = 'task list'; break;
                default: story = 'post';
            }
            return `${user} likes your ${story}`;
        },
        'notification-$user-requested-to-join': (user) => {
            return `${user} requested to join this project`;
        },
        'notification-$user-sent-bookmark-to-$story': (user, story) => {
            switch (story) {
                case 'survey': story = 'a survey'; break;
                case 'task-list': story = 'a task list'; break;
                default: story = 'a post';
            }
            return `${user} sent you a bookmark to ${story}`;
        },
        'notification-$user-voted-in-your-survey': (user) => {
            return `${user} answered your survey`;
        },
        'notification-option-assignment': 'When you are assigned to an issue',
        'notification-option-bookmark': 'When someone sends you a bookmark',
        'notification-option-coauthor': 'When someone invites you to jointly edit a post',
        'notification-option-comment': 'When someone comments on your post',
        'notification-option-issue': 'When someone opens an issue',
        'notification-option-join-request': 'When someone wants to join this project',
        'notification-option-like': 'When someone likes your post',
        'notification-option-merge': 'When someone merges code into the master branch',
        'notification-option-note': 'When someone posts a note on a commit or issue',
        'notification-option-push': 'When someone pushes code into Git',
        'notification-option-survey': 'When someone posts a survey',
        'notification-option-task-completion': 'When someone completes a task on your list',
        'notification-option-vote': 'When someone answers your survey',
        'notification-option-web-session': 'When a web session is active',

        'option-add-bookmark': 'Add bookmark to this story',
        'option-add-issue': 'Add post to issue tracker',
        'option-bookmark-story': 'Bookmark story',
        'option-bump-post': 'Bump post',
        'option-edit-comment': 'Edit comment',
        'option-edit-post': 'Edit post',
        'option-hide-comment': 'Hide comment from non-team members',
        'option-hide-post': 'Hide from non-team members',
        'option-remove-comment': 'Remove comment',
        'option-remove-post': 'Remove post',
        'option-send-bookmarks': 'Send bookmarks to other users',
        'option-send-bookmarks-to-$count-users': (count) => {
            var users = (count === 1) ? `${count} user` : `${count} users`;
            return `Send bookmarks to ${users}`;
        },
        'option-show-media-preview': 'Show attached media',
        'option-show-text-preview': 'Show text preview',

        'photo-capture-accept': 'Accept',
        'photo-capture-cancel': 'Cancel',
        'photo-capture-retake': 'Retake',
        'photo-capture-snap': 'Snap',

        'project-description-close': 'Close',

        'project-management-add': 'Add',
        'project-management-cancel': 'Cancel',
        'project-management-description': 'project description',
        'project-management-manage': 'Manage list',
        'project-management-mobile-set-up': 'mobile set up',
        'project-management-remove': 'Remove',
        'project-management-sign-out': 'sign out',
        'project-management-sign-out-are-you-sure': 'Are you sure you want to sign out from this server?',

        'qr-scanner-cancel': 'Cancel',
        'qr-scanner-invalid-qr-code': 'Invalid QR code',

        'reaction-$user-added-story-to-issue-tracker': (user) => {
            return `${user} added this post to issue tracker`;
        },
        'reaction-$user-cast-a-vote': (user) => {
            return `${user} cast a vote`;
        },
        'reaction-$user-commented-on-branch': (user) => {
            return `${user} commented on this branch`;
        },
        'reaction-$user-commented-on-issue': (user) => {
            return `${user} commented on this issue`;
        },
        'reaction-$user-commented-on-merge': (user) => {
            return `${user} commented on a commit`;
        },
        'reaction-$user-commented-on-merge-request': (user) => {
            return `${user} commented on this merge request`;
        },
        'reaction-$user-commented-on-push': (user) => {
            return `${user} commented on this push`;
        },
        'reaction-$user-completed-a-task': (user) => {
            return `${user} completed a task`;
        },
        'reaction-$user-is-assigned-to-issue': (user) => {
            return `${user} was assigned to this issue`;
        },
        'reaction-$user-is-assigned-to-merge-request': (user) => {
            return `${user} was assigned to this merge request`;
        },
        'reaction-$user-is-editing': (user) => {
            return `${user} is editing a comment...`;
        },
        'reaction-$user-is-writing': (user) => {
            return `${user} is writing a comment...`;
        },
        'reaction-$user-likes-this': (user) => {
            return `${user} likes this`;
        },

        'role-filter-no-roles': 'No roles defined',

        'search-bar-keywords': 'keywords or #hashtags',

        'selection-cancel': 'Cancel',
        'selection-ok': 'OK',

        'server-type-dropbox': 'Dropbox',
        'server-type-facebook': 'Facebook',
        'server-type-github': 'GitHub',
        'server-type-gitlab': 'GitLab',
        'server-type-google': 'Google',
        'server-type-windows': 'Windows Live',

        'settings-device': 'Mobile Device',
        'settings-devices': 'Mobile Devices',
        'settings-diagnostics': 'Diagnostics',
        'settings-language': 'Language',
        'settings-mobile-alert': 'Mobile Alert',
        'settings-notification': 'Notification',
        'settings-profile-image': 'Profile image',
        'settings-projects': 'Projects',
        'settings-social-networks': 'Social Networks',
        'settings-user-information': 'User Information',
        'settings-web-alert': 'Web Alert',

        'social-network-github': 'GitHub profile URL',
        'social-network-gitlab': 'Gitlab profile URL',
        'social-network-ichat': 'iChat user name',
        'social-network-linkedin': 'Linkedin profile URL',
        'social-network-skype': 'Skype user name',
        'social-network-slack': 'Slack user id',
        'social-network-slack-team': 'Slack team id',
        'social-network-stackoverflow': 'Stack Overflow profile URL',
        'social-network-twitter': 'Twitter user name',

        'start-activation-add-server': 'Add project from another server',
        'start-activation-instructions': 'Lorem ipsum dolor sit amet, sint explicari nec id, nisl civibus deleniti ea qui. Sit in debitis veritus consequat. Nullam delenit menandri his at, audiam fabulas te vel. Sit veri oratio suscipiantur in, mea ut duis facer patrioque. Ut partem accumsan molestiae sit.',
        'start-activation-manual': 'Manual entry',
        'start-activation-scan-code': 'Scan QR code',
        'start-error-access-denied': 'Request for access rejected',
        'start-error-account-disabled': 'Account is currently disabled',
        'start-error-existing-users-only': 'Only authorized personnel can access this system',
        'start-error-undefined': 'Unexpected error',
        'start-projects': 'Projects',
        'start-social-login': 'Social login',
        'start-system-title-default': 'Trambar',
        'start-welcome': 'Welcome!',
        'start-welcome-again': 'Welcome again',

        'statistics-bar': 'Bar',
        'statistics-line': 'Line',
        'statistics-pie': 'Pie',

        'story-$count-user-reacted-to-story': (count) => {
            var users = (count === 1) ? `${count} user` : `${count} users`;
            return `${users} reacted to this`;
        },
        'story-add-coauthor': 'Add coauthor',
        'story-add-remove-coauthor': 'Add/Remove coauthor',
        'story-audio': 'Audio',
        'story-author-$count-others': (count) => {
            return `${count} others`;
        },
        'story-author-$name1-and-$name2': (name1, name2) => {
            return [ name1, ' and ', name2 ];
        },
        'story-cancel': 'Cancel',
        'story-cancel-are-you-sure': 'Are you sure you want to abandon this post?',
        'story-cancel-edit-are-you-sure': 'Are you sure you want to abandon changes you\'ve made?',
        'story-coauthors': 'Coauthors',
        'story-comment': 'Comment',
        'story-drop-files-here': 'Drag and drop media files here',
        'story-file': 'File',
        'story-issue-$user-opened-$number-$title': (user, number, title) => {
            var text = `Opened issue ${number}`;
            if (title) {
                text += `: ${title}`;
            }
            return text;
        },
        'story-issue-current-status': 'Current status:',
        'story-issue-status-closed': 'Closed',
        'story-issue-status-opened': 'Open',
        'story-issue-status-reopened': 'Reopened',
        'story-like': 'Like',
        'story-markdown': 'Markdown',
        'story-member-joined-$repo': (repo) => {
            var text = `Joined project`;
            if (repo) {
                text += ` “${repo}”`;
            }
            return text;
        },
        'story-member-left-$repo': (repo) => {
            var text = `Left project`;
            if (repo) {
                text += ` “${repo}”`;
            }
            return text;
        },
        'story-merge-request-$branch1-into-$branch2': (branch1, branch2) => {
            return `Requested to merge branch “${branch1}” into “${branch2}”`;
        },
        'story-milestone-created-$name': (name) => {
            return `Created milestone “${name}”`;
        },
        'story-milestone-due-date': 'Due date:',
        'story-milestone-start-date': 'Start date:',
        'story-options': 'Options',
        'story-paste-image-here': 'An image pasted into the text editor will also end up here',
        'story-pending': 'Pending...',
        'story-photo': 'Photo',
        'story-post': 'Post',
        'story-push-added-$count-files': (count) => {
            var files = (count === 1) ? `1 file` : `${count} files`;
            return `${files} added`;
        },
        'story-push-added-$count-lines': (count) => {
            var lines = (count === 1) ? `1 line` : `${count} lines`;
            return `${lines} added`;
        },
        'story-push-components-changed': 'The following parts were changed:',
        'story-push-created-$branch-in-$repo': (branch, repo) => {
            return `Created branch “${branch}” in project “${repo}”`;
        },
        'story-push-deleted-$count-files': (count) => {
            var files = (count === 1) ? `1 file` : `${count} files`;
            return `${files} removed`;
        },
        'story-push-deleted-$count-lines': (count) => {
            var lines = (count === 1) ? `1 line` : `${count} lines`;
            return `${lines} removed`;
        },
        'story-push-merged-$branches-into-$branch-of-$repo': (branches, branch, repo) => {
            var text = `Merged code`;
            if (branches && branches.length > 0) {
                var sources = branches.map((branch) => {
                    return `“${branch}”`;
                });
                text += ` from ${sources.join(', ')}`;
            }
            text += ` into branch “${branch}”`;
            if (repo) {
                text += ` of project “${repo}”`;
            }
            return text;
        },
        'story-push-modified-$count-files': (count) => {
            var files = (count === 1) ? `1 file` : `${count} files`;
            return `${files} modified`;
        },
        'story-push-pushed-to-$branch-of-$repo': (branch, repo) => {
            var text = `Pushed changes to branch “${branch}”`;
            if (repo) {
                text += ` of project “${repo}”`;
            }
            return text;
        },
        'story-push-renamed-$count-files': (count) => {
            var files = (count === 1) ? `1 file` : `${count} files`;
            return `${files} renamed`;
        },
        'story-remove-yourself': 'Remove yourself',
        'story-remove-yourself-are-you-sure': 'Are you sure you want to remove yourself as a coauthor?',
        'story-repo-created-$name': (name) => {
            var text = `Created project`;
            if (name) {
                text += ` “${name}”`;
            }
            return text;
        },
        'story-status-transcoding-$progress': (progress) => {
            return `Transcoding (${progress}%)`;
        },
        'story-status-uploading-$progress': (progress) => {
            return `Uploading (${progress}%)`;
        },
        'story-survey': 'Survey',
        'story-task-list': 'Task list',
        'story-video': 'Video',
        'story-vote-submit': 'Submit',
        'story-wiki-created-page-with-$title': (title) => {
            return `Created wiki page “${title}”`;
        },
        'story-wiki-deleted-page-with-$title': (title) => {
            return `Deleted wiki page “${title}”`;
        },
        'story-wiki-updated-page-with-$title': (title) => {
            return `Updated wiki page “${title}”`;
        },

        'telephone-dialog-close': 'Close',

        'time-yesterday': 'Yesterday',

        'upload-progress-uploading-$count-files-$size-remaining': (count, size) => {
            var files = (count === 1) ? `1 file` : `${count} files`;
            return `Uploading ${files}, ${size} remaining`;
        },

        'user-actions': 'Actions',

        'user-activity-$name-created-branch': 'Created a new branch',
        'user-activity-$name-created-merge-request': 'Made a merge request',
        'user-activity-$name-created-milestone': 'Created a milestone',
        'user-activity-$name-created-repo': 'Created a git project',
        'user-activity-$name-edited-wiki-page': 'Edited a wiki page',
        'user-activity-$name-joined-repo': 'Joined a git project',
        'user-activity-$name-left-repo': 'Left a git project',
        'user-activity-$name-merged-code': 'Performed a code merge',
        'user-activity-$name-opened-issue': 'Opened an issue',
        'user-activity-$name-posted-$count-audio-clips': (name, count) => {
            var audios = (count === 1) ? `a audio clip` : `${count} audio clips`;
            return `Posted ${audios}`;
        },
        'user-activity-$name-posted-$count-links': (name, count) => {
            var links = (count === 1) ? `a link` : `links`;
            var website = (count === 1) ? `a website` : `${count} websites`;
            return `Posted ${links} to ${website}`
        },
        'user-activity-$name-posted-$count-pictures': (name, count) => {
            var pictures = (count === 1) ? `a picture` : `${count} pictures`;
            return `Posted ${pictures}`;
        },
        'user-activity-$name-posted-$count-video-clips': (name, count) => {
            var videos = (count === 1) ? `a video clip` : `${count} video clips`;
            return `Posted ${videos}`;
        },
        'user-activity-$name-pushed-code': 'Pushed code to repo',
        'user-activity-$name-started-survey': 'Started a survey',
        'user-activity-$name-started-task-list': 'Started a task list',
        'user-activity-$name-wrote-post': 'Wrote a post',
        'user-activity-more': 'More...',

        'user-image-remove': 'Remove',
        'user-image-select': 'Select',
        'user-image-snap': 'Snap',

        'user-info-email': 'E-mail address',
        'user-info-gender': 'Gender',
        'user-info-gender-female': 'Female',
        'user-info-gender-male': 'Male',
        'user-info-gender-unspecified': 'Unspecified',
        'user-info-name': 'Name',
        'user-info-phone': 'Phone number',

        'user-statistics-legend-branch': 'New branches',
        'user-statistics-legend-issue': 'Issues',
        'user-statistics-legend-merge': 'Code merges',
        'user-statistics-legend-merge-request': 'Merge requests',
        'user-statistics-legend-milestone': 'Milestones',
        'user-statistics-legend-push': 'Code pushes',
        'user-statistics-legend-repo': 'Repo changes',
        'user-statistics-legend-story': 'Posts',
        'user-statistics-legend-survey': 'Surveys',
        'user-statistics-legend-task-list': 'Task lists',
        'user-statistics-legend-wiki': 'Wiki edits',
        'user-statistics-today': 'Today',
        'user-statistics-tooltip-$count-branch': (count) => {
            return (count === 1) ? `1 branch` : `${count} branches`;
        },
        'user-statistics-tooltip-$count-issue': (count) => {
            return (count === 1) ? `1 issue` : `${count} issues`;
        },
        'user-statistics-tooltip-$count-member': (count) => {
            return (count === 1) ? `1 membership change` : `${count} membership changes`;
        },
        'user-statistics-tooltip-$count-merge': (count) => {
            return (count === 1) ? `1 merge` : `${count} merges`;
        },
        'user-statistics-tooltip-$count-milestone': (count) => {
            return (count === 1) ? `1 milestone` : `${count} milestones`;
        },
        'user-statistics-tooltip-$count-push': (count) => {
            return (count === 1) ? `1 push` : `${count} pushes`;
        },
        'user-statistics-tooltip-$count-repo': (count) => {
            return (count === 1) ? `1 repository change` : `${count} repository changes`;
        },
        'user-statistics-tooltip-$count-story': (count) => {
            return (count === 1) ? `1 post` : `${count} posts`;
        },
        'user-statistics-tooltip-$count-survey': (count) => {
            return (count === 1) ? `1 survey` : `${count} surveys`;
        },
        'user-statistics-tooltip-$count-task-list': (count) => {
            return (count === 1) ? `1 task list` : `${count} task lists`;
        },
        'user-statistics-tooltip-$count-wiki': (count) => {
            return (count === 1) ? `1 wiki edit` : `${count} wiki edits`;
        },

        'video-capture-accept': 'Accept',
        'video-capture-cancel': 'Cancel',
        'video-capture-pause': 'Pause',
        'video-capture-resume': 'Resume',
        'video-capture-retake': 'Retake',
        'video-capture-start': 'Start',
        'video-capture-stop': 'Stop',
    };
};
