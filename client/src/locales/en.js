require('moment/locale/en-au');
require('moment/locale/en-ca');
require('moment/locale/en-gb');
require('moment/locale/en-ie');
require('moment/locale/en-nz');

module.exports = function(localeCode) {
    var freedomLoving = true;
    if (/\-(au|ca|gb|ie|nz)$/.test(localeCode)) {
        freedomLoving = false;
    }
    if (freedomLoving) {
        return americanPhrases;
    } else {
        var merged = {};
        for (var name in americanPhrases) {
            merged[name] = unamericanPhrases[name] || americanPhrases[name];
        }
        return merged
    }
};

var americanPhrases = {
    'action-contact-by-email': 'Contact by e-mail',
    'action-contact-by-ichat': 'Contact by iChat',
    'action-contact-by-phone': 'Contact by phone',
    'action-contact-by-skype': 'Contact by Skype',
    'action-contact-by-slack': 'Contact by Slack',
    'action-contact-by-twitter': 'Contact by Twitter',
    'action-view-github-page': 'View GitHub page',
    'action-view-gitlab-page': 'View GitLab page',
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

    'app-component-close': 'Close',

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
    'bookmark-$name-and-$others-recommend-this': (name, others, count) => {
        return [ `${name} and `, others, ` recommend this` ];
    },
    'bookmark-$name-recommends-this': (name) => {
        return `${name} recommends this`;
    },
    'bookmark-$name1-and-$name2-recommend-this': (name) => {
        return [ name1, ' and ', name2, ' recommend this' ];
    },
    'bookmark-$you-bookmarked-it': 'You bookmarked this',
    'bookmark-$you-bookmarked-it-and-$name-recommends-it': (you, name) => {
        return `You bookmarked this (and ${name} recommends it)`;
    },
    'bookmark-$you-bookmarked-it-and-$others-recommends-it': (you, others, count) => {
        return [ `You bookmarked this (and `, others, ` recommend it)` ];
    },
    'bookmark-recommendations': 'Recommendations',

    'bookmarks-no-bookmarks': 'No bookmarks',

    'bottom-nav-bookmarks': 'Bookmarks',
    'bottom-nav-news': 'News',
    'bottom-nav-notifications': 'Notifications',
    'bottom-nav-people': 'People',
    'bottom-nav-settings': 'Settings',

    'confirmation-cancel': 'Cancel',
    'confirmation-confirm': 'Confirm',

    'development-code-push-$deployment': (deployment) => {
        return `Pull code updates from "${deployment}"`;
    },
    'development-show-diagnostics': 'Show diagnostics',
    'development-show-panel': 'Display this panel',

    'device-selector-camera-$number': (number) => {
        return `Camera ${number}`;
    },
    'device-selector-camera-back': 'Back',
    'device-selector-camera-front': 'Front',
    'device-selector-mic-$number': (number) => {
        return `Mic ${number}`;
    },

    'empty-currently-offline': 'You are currently offline',

    'image-editor-page-rendering-in-progress': 'Rendering web-site preview...',
    'image-editor-poster-extraction-in-progress': 'Extracting preview from video...',
    'image-editor-upload-in-progress': 'Upload in progress...',

    'issue-cancel': 'Cancel',
    'issue-delete': 'Delete',
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

    'membership-request-$you-are-member': 'You are a member of this project',
    'membership-request-$you-are-now-member': 'You are now a member of this project',
    'membership-request-$you-have-requested-membership': 'You have requested membership in this project',
    'membership-request-browse': 'Browse',
    'membership-request-cancel': 'Cancel',
    'membership-request-join': 'Join',
    'membership-request-ok': 'OK',
    'membership-request-proceed': 'Proceed',
    'membership-request-withdraw': 'Withdraw',

    'mobile-device-revoke': 'revoke',
    'mobile-device-revoke-are-you-sure': 'Are you sure you want to revoke authorization to this device?',

    'mobile-setup-address': 'Server address',
    'mobile-setup-close': 'Close',
    'mobile-setup-code': 'Authorization code',
    'mobile-setup-project': 'Project',

    'news-no-stories-by-role': 'No stories by someone with that role',
    'news-no-stories-found': 'No matching stories found',
    'news-no-stories-on-date': 'No stories on that date',
    'news-no-stories-yet': 'No stories yet',

    'notification-$name-added-you-as-coauthor': (name) => {
        return `${name} invited you to jointly edit a post`;
    },
    'notification-$name-added-your-post-to-issue-tracker': (name) => {
        return `${name} added your post to issue tracker`;
    },
    'notification-$name-commented-on-your-$story': (name, story) => {
        switch (story) {
            case 'survey': story = 'survey'; break;
            case 'task-list': story = 'task list'; break;
            case 'post': story = 'post'; break;
            default: story = 'story';
        }
        return `${name} commented on your ${story}`;
    },
    'notification-$name-completed-task': (name) => {
        return `${name} completed a task on your list`;
    },
    'notification-$name-is-assigned-to-your-issue': (name) => {
        return `${name} is assigned to your issue`;
    },
    'notification-$name-likes-your-$story': (name, story) => {
        switch (story) {
            case 'survey': story = 'survey'; break;
            case 'task-list': story = 'task list'; break;
            case 'post': story = 'post'; break;
            default: story = 'story';
        }
        return `${name} likes your ${story}`;
    },
    'notification-$name-mentioned-you-in-$reaction': (name, reaction) => {
        reaction = 'a comment';
        return `${name} mentioned you in ${reaction}`;
    },
    'notification-$name-mentioned-you-in-$story': (name, story) => {
        switch (story) {
            case 'survey': story = 'a survey'; break;
            case 'task-list': story = 'a task list'; break;
            case 'post': story = 'a post'; break;
            case 'issue': story = 'an issue'; break;
            case 'merge-request': story = 'a merge request'; break;
            default: story = 'a story';
        }
        return `${name} mentioned you in ${story}`;
    },
    'notification-$name-merged-code-to-$branch': (name, branch) => {
        return `${name} merged changes into “${branch}”`;
    },
    'notification-$name-opened-an-issue': (name) => {
        return `${name} opened an issue`;
    },
    'notification-$name-posted-a-note-about-your-$story': (name, story) => {
        switch (story) {
            case 'push': story = 'commit'; break;
            case 'issue': story = 'issue'; break;
            case 'merge-request': story = 'merge request'; break;
        }
        return `${name} posted a note about your ${story}`;
    },
    'notification-$name-posted-a-survey': (name) => {
        return `${name} posted a survey`;
    },
    'notification-$name-pushed-code-to-$branch': (name, branch) => {
        return `${name} pushed changes to branch “${branch}”`;
    },
    'notification-$name-requested-to-join': (name) => {
        return `${name} requested to join this project`;
    },
    'notification-$name-sent-bookmark-to-$story': (name, story) => {
        switch (story) {
            case 'survey': story = 'a survey'; break;
            case 'task-list': story = 'a task list'; break;
            case 'post': story = 'a post';
            default: story = 'a story';
        }
        return `${name} sent you a bookmark to ${story}`;
    },
    'notification-$name-voted-in-your-survey': (name) => {
        return `${name} answered your survey`;
    },
    'notification-option-assignment': 'When someone is assigned to your issue',
    'notification-option-bookmark': 'When someone sends you a bookmark',
    'notification-option-coauthor': 'When someone invites you to jointly edit a post',
    'notification-option-comment': 'When someone comments on your story',
    'notification-option-issue': 'When someone opens an issue',
    'notification-option-join-request': 'When someone wants to join this project',
    'notification-option-like': 'When someone likes your story',
    'notification-option-mention': 'When someone mentions you in a story or comment',
    'notification-option-merge': 'When someone merges code into the master branch',
    'notification-option-note': 'When someone posts a note on a commit or issue',
    'notification-option-push': 'When someone pushes code into Git',
    'notification-option-survey': 'When someone posts a survey',
    'notification-option-task-completion': 'When someone completes a task on your list',
    'notification-option-vote': 'When someone answers your survey',
    'notification-option-web-session': 'When a web session is active',

    'notifications-no-notifications-on-date': 'No notifications on that date',
    'notifications-no-notifications-yet': 'No notifications yet',

    'option-add-bookmark': 'Add bookmark',
    'option-add-issue': 'Add post to issue tracker',
    'option-bump-story': 'Bump story',
    'option-edit-comment': 'Edit comment',
    'option-edit-post': 'Edit post',
    'option-hide-comment': 'Hide comment from guests',
    'option-hide-story': 'Hide story from guests',
    'option-keep-bookmark': 'Keep bookmark',
    'option-remove-comment': 'Remove comment',
    'option-remove-story': 'Remove story',
    'option-send-bookmarks': 'Send bookmarks to other users',
    'option-send-bookmarks-to-$count-users': (count) => {
        var users = (count === 1) ? `${count} user` : `${count} users`;
        return `Send bookmarks to ${users}`;
    },
    'option-show-media-preview': 'Show attached media',
    'option-show-text-preview': 'Show text preview',
    'option-statistics-biweekly': 'Show activities of last 14 days',
    'option-statistics-monthly': 'Show monthly activities',
    'option-statistics-to-date': 'Show activities to date',

    'people-no-stories-found': 'No matching stories found',
    'people-no-stories-on-date': 'No activities on that date',
    'people-no-users-by-role': 'No project member has that role',
    'people-no-users-yet': 'No project members yet',

    'person-no-stories-found': 'No matching stories found',
    'person-no-stories-on-date': 'No stories on that date',
    'person-no-stories-yet': 'No stories yet',

    'photo-capture-accept': 'Accept',
    'photo-capture-cancel': 'Cancel',
    'photo-capture-retake': 'Retake',
    'photo-capture-snap': 'Snap',

    'project-description-close': 'Close',

    'project-management-add': 'Add',
    'project-management-cancel': 'Cancel',
    'project-management-description': 'project description',
    'project-management-join-project': 'join project',
    'project-management-manage': 'Manage list',
    'project-management-mobile-set-up': 'mobile set up',
    'project-management-remove': 'Remove',
    'project-management-sign-out': 'sign out',
    'project-management-sign-out-are-you-sure': 'Are you sure you want to sign out from this server?',
    'project-management-withdraw-request': 'withdraw membership request',

    'qr-scanner-cancel': 'Cancel',
    'qr-scanner-invalid-qr-code': 'Invalid QR code',
    'qr-scanner-qr-code-found': 'QR code found',

    'reaction-$name-added-story-to-issue-tracker': (name) => {
        return `${name} added this post to issue tracker`;
    },
    'reaction-$name-cast-a-vote': (name) => {
        return `${name} cast a vote`;
    },
    'reaction-$name-commented-on-branch': (name) => {
        return `${name} commented on this branch`;
    },
    'reaction-$name-commented-on-issue': (name) => {
        return `${name} commented on this issue`;
    },
    'reaction-$name-commented-on-merge': (name) => {
        return `${name} commented on a commit`;
    },
    'reaction-$name-commented-on-merge-request': (name) => {
        return `${name} commented on this merge request`;
    },
    'reaction-$name-commented-on-push': (name) => {
        return `${name} commented on this push`;
    },
    'reaction-$name-completed-a-task': (name) => {
        return `${name} completed a task`;
    },
    'reaction-$name-is-assigned-to-issue': (name) => {
        return `${name} was assigned to this issue`;
    },
    'reaction-$name-is-assigned-to-merge-request': (name) => {
        return `${name} was assigned to this merge request`;
    },
    'reaction-$name-is-editing': (name) => {
        return `${name} is editing a comment...`;
    },
    'reaction-$name-is-sending': (name) => {
        return `${name} is sending a comment...`;
    },
    'reaction-$name-is-writing': (name) => {
        return `${name} is writing a comment...`;
    },
    'reaction-$name-likes-this': (name) => {
        return `${name} likes this`;
    },
    'reaction-status-storage-pending': 'Pending',
    'reaction-status-transcoding': 'Transcoding',
    'reaction-status-uploading': 'Uploading',

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

    'settings-development': 'Developer Options',
    'settings-device': 'Mobile Device',
    'settings-devices': 'Mobile Devices',
    'settings-language': 'Language',
    'settings-mobile-alert': 'Mobile Alert',
    'settings-notification': 'Notification',
    'settings-profile-image': 'Profile image',
    'settings-projects': 'Projects',
    'settings-social-networks': 'Social Networks',
    'settings-user-information': 'User Information',
    'settings-web-alert': 'Web Alert',

    'social-network-github': 'GitHub profile URL',
    'social-network-gitlab': 'GitLab profile URL',
    'social-network-ichat': 'iChat user name',
    'social-network-linkedin': 'Linkedin profile URL',
    'social-network-skype': 'Skype user name',
    'social-network-slack': 'Slack user id',
    'social-network-slack-team': 'Slack team id',
    'social-network-stackoverflow': 'Stack Overflow profile URL',
    'social-network-twitter': 'Twitter user name',

    'start-activation-add-server': 'Add project from another server',
    'start-activation-instructions': (ui) => {
        return [
            'To access a Trambar server on this device, first sign into the server using a web browser. Select a project then go to ',
            ui.settings,
            '. In the ',
            ui.projects,
            ' panel, click ',
            ui.mobileSetup,
            '. A QR code will appear on screen. Then on this device, press the button below and scan the code. Alternately, you may manually input the activation code.'
        ];
    },
    'start-activation-instructions-short': (ui) => {
        return [
            'Sign in using a web browser then scan the QR code shown in ',
            ui.settings,
            ' > ',
            ui.mobileSetup,
        ];
    },
    'start-activation-manual': 'Manual entry',
    'start-activation-new-server': 'New server',
    'start-activation-others-servers': 'Available servers',
    'start-activation-return': 'Return',
    'start-activation-scan-code': 'Scan QR code',
    'start-error-access-denied': 'Request for access rejected',
    'start-error-account-disabled': 'Account is currently disabled',
    'start-error-existing-users-only': 'Only authorized personnel can access this system',
    'start-error-undefined': 'Unexpected error',
    'start-no-projects': 'No projects',
    'start-no-servers': 'No OAuth providers',
    'start-projects': 'Projects',
    'start-social-login': 'Social login',
    'start-system-title-default': 'Trambar',
    'start-welcome': 'Welcome!',
    'start-welcome-again': 'Welcome again',

    'statistics-bar': 'Bar',
    'statistics-line': 'Line',
    'statistics-pie': 'Pie',

    'story-$count-reactions': (count) => {
        return (count === 1) ? `1 reaction` : `${count} reactions`;
    },
    'story-$name-created-$branch-in-$repo': (name, branch, repo) => {
        return `Created branch “${branch}” in project “${repo}”`;
    },
    'story-$name-created-$milestone': (name, milestone) => {
        return `Created milestone “${milestone}”`;
    },
    'story-$name-created-$page': (name, page) => {
        return `Created wiki page “${page}”`;
    },
    'story-$name-created-$repo': (name, repo) => {
        var text = `Created project`;
        if (repo) {
            text += ` “${repo}”`;
        }
        return text;
    },
    'story-$name-deleted-$page': (name, page) => {
        return `Deleted wiki page “${page}”`;
    },
    'story-$name-joined-$repo': (name, repo) => {
        var text = `Joined project`;
        if (repo) {
            text += ` “${repo}”`;
        }
        return text;
    },
    'story-$name-left-$repo': (name, repo) => {
        var text = `Left project`;
        if (repo) {
            text += ` “${repo}”`;
        }
        return text;
    },
    'story-$name-merged-$branches-into-$branch-of-$repo': (name, branches, branch, repo) => {
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
    'story-$name-opened-issue-$number-$title': (name, number, title) => {
        var text = `Opened issue ${number}`;
        if (title) {
            text += `: ${title}`;
        }
        return text;
    },
    'story-$name-pushed-to-$branch-of-$repo': (name, branch, repo) => {
        var text = `Pushed changes to branch “${branch}”`;
        if (repo) {
            text += ` of project “${repo}”`;
        }
        return text;
    },
    'story-$name-requested-merge-$branch1-into-$branch2': (name, branch1, branch2) => {
        return `Requested to merge branch “${branch1}” into “${branch2}”`;
    },
    'story-$name-updated-$page': (name, page) => {
        return `Updated wiki page “${page}”`;
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
    'story-issue-current-status': 'Current status:',
    'story-issue-status-closed': 'Closed',
    'story-issue-status-opened': 'Open',
    'story-issue-status-reopened': 'Reopened',
    'story-like': 'Like',
    'story-markdown': 'Markdown',
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
    'story-push-deleted-$count-files': (count) => {
        var files = (count === 1) ? `1 file` : `${count} files`;
        return `${files} removed`;
    },
    'story-push-deleted-$count-lines': (count) => {
        var lines = (count === 1) ? `1 line` : `${count} lines`;
        return `${lines} removed`;
    },
    'story-push-modified-$count-files': (count) => {
        var files = (count === 1) ? `1 file` : `${count} files`;
        return `${files} modified`;
    },
    'story-push-modified-$count-lines': (count) => {
        var lines = (count === 1) ? `1 line` : `${count} lines`;
        return `${lines} modified`;
    },
    'story-push-renamed-$count-files': (count) => {
        var files = (count === 1) ? `1 file` : `${count} files`;
        return `${files} renamed`;
    },
    'story-remove-yourself': 'Remove yourself',
    'story-remove-yourself-are-you-sure': 'Are you sure you want to remove yourself as a coauthor?',
    'story-status-storage-pending': 'Pending',
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

    'telephone-dialog-close': 'Close',

    'time-$hours-ago': (hours) => {
        return (hours === 1) ? `An hour ago` : `${hours} hours ago`;
    },
    'time-$hr-ago': (hr) => {
        return `${hr} hr ago`;
    },
    'time-$min-ago': (min) => {
        return `${min} min ago`;
    },
    'time-$minutes-ago': (minutes) => {
        return (minutes === 1) ? `A minute ago` : `${minutes} minutes ago`;
    },
    'time-just-now': 'Just now',
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
    'user-activity-$name-reported-issue': 'Reported an issue',
    'user-activity-$name-started-survey': 'Started a survey',
    'user-activity-$name-started-task-list': 'Started a task list',
    'user-activity-$name-wrote-post': 'Wrote a post',
    'user-activity-back': 'Back',
    'user-activity-more': 'More',

    'user-image-adjust': 'Adjust',
    'user-image-cancel': 'Cancel',
    'user-image-replace': 'Replace',
    'user-image-save': 'Save',
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
    'user-statistics-legend-member': 'Membership changes',
    'user-statistics-legend-merge': 'Code merges',
    'user-statistics-legend-merge-request': 'Merge requests',
    'user-statistics-legend-milestone': 'Milestones',
    'user-statistics-legend-post': 'Posts',
    'user-statistics-legend-push': 'Code pushes',
    'user-statistics-legend-repo': 'Repo changes',
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
    'user-statistics-tooltip-$count-merge-request': (count) => {
        return (count === 1) ? `1 merge request` : `${count} merge requests`;
    },
    'user-statistics-tooltip-$count-milestone': (count) => {
        return (count === 1) ? `1 milestone` : `${count} milestones`;
    },
    'user-statistics-tooltip-$count-post': (count) => {
        return (count === 1) ? `1 post` : `${count} posts`;
    },
    'user-statistics-tooltip-$count-push': (count) => {
        return (count === 1) ? `1 push` : `${count} pushes`;
    },
    'user-statistics-tooltip-$count-repo': (count) => {
        return (count === 1) ? `1 repository change` : `${count} repository changes`;
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

    'warning-no-connection': 'No instant update',
};

var unamericanPhrases = {
    'mobile-device-revoke-are-you-sure': 'Are you sure you want to revoke authorisation to this device?',
    'mobile-setup-code': 'Authorisation code',
    'start-error-existing-users-only': 'Only authorised personnel can access this system',
};
