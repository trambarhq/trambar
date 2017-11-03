module.exports = function(languageCode) {
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

        'app-name': 'Trambar',

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
        'bookmark-$name-and-$users-recommend-this': (name, users, count) => {
            return [ `${name} and `, users, ` recommend this` ];
        },
        'bookmark-$name-recommends-this': (name) => {
            return `${name} recommends this`;
        },
        'bookmark-$name1-and-$name2-recommend-this': (name) => {
            return `${name1} and ${name2} recommend this`;
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
        'comment-$user-commented-on-issue': (user) => {
            return `${user} commented on this issue`;
        },
        'comment-$user-commented-on-merge': (user) => {
            return `${user} commented on a merge`;
        },
        'comment-$user-commented-on-merge-request': (user) => {
            return `${user} commented on this merge request`;
        },
        'comment-$user-commented-on-push': (user) => {
            return `${user} commented on a commit`;
        },
        'comment-$user-completed-a-task': (user) => {
            return `${user} completed a task`;
        },
        'comment-$user-is-assigned-to-issue': (user) => {
            return `${user} was assigned to this issue`;
        },
        'comment-$user-is-editing': (user) => {
            return `${user} is editing a comment...`;
        },
        'comment-$user-is-writing': (user) => {
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

        'membership-request-cancel': 'Cancel',
        'membership-request-join': 'Join',
        'membership-request-ok': 'OK',
        'membership-request-proceed': 'Proceed',
        'membership-request-you-are-now-member': 'You are now a member in this project',
        'membership-request-you-have-requested-membership': 'You have requested membership in this project',

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
        'notification-$user-completed-task': (user) => {
            return `${user} completed a task on your list`;
        },
        'notification-$user-likes-your-push': (user) => {
            return `${user} likes your push`;
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
        'notification-$user-voted-in-your-survey': (user) => {
            return `${user} answered your survey`;
        },

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

        'role-filter-no-roles': 'No roles defined',

        'search-bar-keywords': 'Keywords',

        'selection-cancel': 'Cancel',
        'selection-ok': 'OK',

        'server-type-dropbox': 'Dropbox',
        'server-type-facebook': 'Facebook',
        'server-type-github': 'GitHub',
        'server-type-gitlab': 'GitLab',
        'server-type-google': 'Google',

        'settings-language': 'Language',
        'settings-notification': 'Notification',
        'settings-projects': 'Projects',
        'settings-user-profile': 'User Profile',

        'start-projects': 'Projects',
        'start-social-login': 'Social login',
        'start-system-title-default': 'Trambar',
        'start-welcome': 'Welcome!',

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
        'story-author-$name-and-$users': (name, users, count) => {
            return [ name, ' and ', users ];
        },
        'story-author-$name1-and-$name2': (name1, name2) => {
            return `${name1} and ${name2}`;
        },
        'story-cancel': 'Cancel',
        'story-coauthors': 'Coauthors',
        'story-comment': 'Comment',
        'story-drop-files-here': 'Drag and drop media files here',
        'story-file': 'File',
        'story-issue-current-status': 'Current status:',
        'story-issue-$user-opened-$number-$title': (user, number, title) => {
            return `Opened issue ${number}: ${title}`;
        },
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
        'story-wiki-created-page-with-$title': (title) => {
            return `Updated wiki page “${title}”`;
        },
        'story-wiki-deleted-page-with-$title': (title) => {
            return `Deleted wiki page “${title}”`;
        },
        'story-wiki-updated-page-with-$title': (title) => {
            return `Updated wiki page “${title}”`;
        },

        'survey-item-$number': (number) => {
            return `choice ${number}`;
        },
        'task-list-item-$number': (number) => {
            return `task ${number}`;
        },

        'telephone-dialog-close': 'Close',

        'user-actions': 'Actions',

        'user-statistics-legend-issue': 'Issues',
        'user-statistics-legend-merge': 'Code merges',
        'user-statistics-legend-milestone': 'Milestones',
        'user-statistics-legend-push': 'Code pushes',
        'user-statistics-legend-story': 'Posts',
        'user-statistics-legend-survey': 'Surveys',
        'user-statistics-legend-task-list': 'Task lists',
        'user-statistics-legend-wiki': 'Wiki edits',

        'user-summary-$name-created-a-milestone': 'Created a milestone',
        'user-summary-$name-created-repo': 'Created a git project',
        'user-summary-$name-edited-wiki-page': 'Edited a wiki page',
        'user-summary-$name-joined-repo': 'Joined a git project',
        'user-summary-$name-left-repo': 'Left a git project',
        'user-summary-$name-merged-code': 'Performed a code merge',
        'user-summary-$name-opened-an-issue': 'Opened an issue',
        'user-summary-$name-posted-a-link': 'Post a link to a website',
        'user-summary-$name-posted-a-picture': 'Posted a picture',
        'user-summary-$name-posted-a-video-clip': 'Posted a video clip',
        'user-summary-$name-posted-an-audio-clip': 'Posted an audio clip',
        'user-summary-$name-pushed-code': 'Pushed code to repo',
        'user-summary-$name-started-survey': 'Started a survey',
        'user-summary-$name-started-task-list': 'Started a task list',
        'user-summary-$name-wrote-a-post': 'Wrote a post',
        'user-summary-more': 'More...',

        'video-capture-accept': 'Accept',
        'video-capture-cancel': 'Cancel',
        'video-capture-pause': 'Pause',
        'video-capture-retake': 'Retake',
        'video-capture-start': 'Start',
        'video-capture-stop': 'Stop',
    };
};
