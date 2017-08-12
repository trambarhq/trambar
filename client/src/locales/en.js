module.exports = function(languageCode) {
    return {
        'app-name': 'Trambar',

        'action-contact-by-phone': 'Contact by phone',
        'action-contact-by-email': 'Contact by e-mail',
        'action-contact-by-skype': 'Contact by Skype',
        'action-contact-by-slack': 'Contact by Slack',
        'action-contact-by-ichat': 'Contact by iChat',
        'action-view-gitlab-page': 'View Gitlab page',
        'action-view-github-page': 'View Github page',
        'action-view-stackoverflow-page': 'View Stack Overflow Page',

        'audio-capture-accept': 'Accept',
        'audio-capture-cancel': 'Cancel',
        'audio-capture-pause': 'Pause',
        'audio-capture-rerecord': 'Rerecord',
        'audio-capture-start': 'Start',
        'audio-capture-stop': 'Stop',

        'bookmark-$count-other-users': (count) => {
            return (count === 1) ? `1 other user` : `${count} other users`;
        },
        'bookmark-$count-users': (count) => {
            return (count === 1) ? `1 user` : `${count} users`;
        },
        'bookmark-$name-recommends-this': (name) => {
            return `${name} recommends this`;
        },
        'bookmark-$name1-and-$name2-recommend-this': (name) => {
            return `${name1} and ${name2} recommend this`;
        },
        'bookmark-$name-and-$users-recommend-this': (name, users, count) => {
            return [ `${name} and `, users, ` recommend this` ];
        },
        'bookmark-recommendations': 'Recommendations',
        'bookmark-you-bookmarked-it': 'You bookmarked this',
        'bookmark-you-bookmarked-it-and-$name-recommends-it': (name) => {
            return `You bookmarked this (and ${name} recommends it)`;
        },
        'bookmark-you-bookmarked-it-and-$users-recommends-it': (name, users, count) => {
            return [ `You bookmarked this (and `, users, ` recommend it)` ];
        },

        'bottom-nav-bookmarks': 'Bookmarks',
        'bottom-nav-news': 'News',
        'bottom-nav-notifications': 'Notifications',
        'bottom-nav-people': 'People',
        'bottom-nav-settings': 'Settings',

        'comment-$user-cast-a-vote': (user) => {
            return `${user} cast a vote`;
        },
        'comment-$user-completed-a-task': (user) => {
            return `${user} completed a task`;
        },
        'comment-$user-is-typing': (user) => {
            return `${user} is writing a comment...`;
        },
        'comment-$user-likes-this': (user) => {
            return `${user} likes this`;
        },

        'list-$count-more': (count) => {
            return `${count} more...`;
        },

        'media-close': 'Close',
        'media-download-original': 'Download original',
        'media-next': 'Next',
        'media-previous': 'Previous',

        'notification-$user-likes-your-commit': (user) => {
            return `${user} likes your commit`;
        },
        'notification-$user-likes-your-merge': (user) => {
            return `${user} likes your merge`;
        },
        'notification-$user-likes-your-story': (user) => {
            return `${user} likes your post`;
        },
        'notification-$user-likes-your-survey': (user) => {
            return `${user} likes your survey`;
        },
        'notification-$user-likes-your-task-list': (user) => {
            return `${user} likes your task list`;
        },
        'notification-$user-commented-on-your-commit': (user) => {
            return `${user} commented on your commit`;
        },
        'notification-$user-commented-on-your-merge': (user) => {
            return `${user} commented on your merge`;
        },
        'notification-$user-commented-on-your-story': (user) => {
            return `${user} commented on your post`;
        },
        'notification-$user-commented-on-your-survey': (user) => {
            return `${user} commented on your survey`;
        },
        'notification-$user-commented-on-your-task-list': (user) => {
            return `${user} commented on your task list`;
        },
        'notification-$user-voted-in-your-survey': (user) => {
            return `${user} answered your survey`;
        },
        'notification-$user-completed-task': (user) => {
            return `${user} completed a task on your list`;
        },

        'option-add-bookmark': 'Add bookmark to this story',
        'option-add-issue': 'Add post to issue tracker',
        'option-contact-by-phone': 'Contact by phone',
        'option-contact-by-email': 'Contact by e-mail',
        'option-edit-post': 'Edit post',
        'option-hide-post': 'Hide from non-team members',
        'option-send-bookmarks': 'Send bookmarks to other users',
        'option-send-bookmarks-to-$count-users': (count) => {
            var users = (count === 1) ? `${count} user` : `${count} users`;
            return `Send bookmarks to ${users}`;
        },
        'option-show-media': 'Show attached media',
        'option-show-preview': 'Show text preview',
        'option-view-gitlab-page': 'View Gitlab profile page',

        'photo-capture-accept': 'Accept',
        'photo-capture-cancel': 'Cancel',
        'photo-capture-retake': 'Retake',
        'photo-capture-snap': 'Snap',

        'selection-cancel': 'Cancel',
        'selection-ok': 'OK',

        'settings-language': 'Language',
        'settings-notification': 'Notification',
        'settings-projects': 'Projects',
        'settings-user-profile': 'User Profile',

        'sign-in-cancel': 'Cancel',
        'sign-in-with-dropbox': 'Sign in with Dropbox',
        'sign-in-with-facebook': 'Sign in with Facebook',
        'sign-in-with-github': 'Sign in with GitHub',
        'sign-in-with-gitlab': 'Sign in with GitLab',
        'sign-in-with-google': 'Sign in with Google',

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
        'story-author-$name1-and-$name2': (name1, name2) => {
            return `${name1} and ${name2}`;
        },
        'story-author-$name-and-$users': (name, users, count) => {
            return [ name, ' and ', users ];
        },
        'story-author-$count-others': (count) => {
            return `${count} others`;
        },
        'story-cancel': 'Cancel',
        'story-coauthors': 'Coauthors',
        'story-comment': 'Comment',
        'story-file': 'File',
        'story-issue-opened-$number-$title': (number, title) => {
            return `Opened issue ${number}: ${title}`;
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
        'story-milestone-created-$name': (name) => {
            return `Created milestone “${name}”`;
        },
        'story-milestone-start-date': 'Start date:',
        'story-milestone-due-date': 'Due date:',
        'story-options': 'Options',
        'story-pending': 'Pending...',
        'story-photo': 'Photo',
        'story-post': 'Post',
        'story-push-pushed-to-$branch-of-$repo': (branch, repo) => {
            var text = `Pushed changes to branch “${branch}”`;
            if (repo) {
                text += `of project “${repo}”`;
            }
            return text;
        },
        'story-push-added-$count-files': (count) => {
            return `${count} files added`;
        },
        'story-push-modified-$count-files': (count) => {
            return `${count} files modified`;
        },
        'story-push-removed-$count-files': (count) => {
            return `${count} files removed`;
        },
        'story-push-renamed-$count-files': (count) => {
            return `${count} files renamed`;
        },
        'story-push-added-$count-lines': (count) => {
            return `${count} lines added`;
        },
        'story-push-removed-$count-lines': (count) => {
            return `${count} lines removed`;
        },
        'story-repo-created-$name': (name) => {
            var text = `Created project`;
            if (name) {
                text += ` “${name}”`;
            }
            return text;
        },
        'story-survey': 'Survey',
        'story-task-list': 'Task list',
        'story-video': 'Video',
        'story-vote-submit': 'Submit',

        'survey-item-$number': (number) => {
            return `choice ${number}`;
        },
        'task-list-item-$number': (number) => {
            return `task ${number}`;
        },

        'user-actions': 'Actions',

        'user-statistics-legend-commit': 'Commits',
        'user-statistics-legend-story': 'Posts',
        'user-statistics-legend-survey': 'Surveys',
        'user-statistics-legend-task-list': 'Task lists',

        'video-capture-accept': 'Accept',
        'video-capture-cancel': 'Cancel',
        'video-capture-pause': 'Pause',
        'video-capture-retake': 'Retake',
        'video-capture-start': 'Start',
        'video-capture-stop': 'Stop',
    };
};
