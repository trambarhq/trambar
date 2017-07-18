module.exports = function(languageCode) {
    var phrases = {
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
        'bookmark-$users-recommend-it': (users) => {
            if (users.length === 1) {
                return `${users[0]} recommends it`
            } else {
                var tokens = [];
                _.each(users, (user, index) => {
                    if (index > 0) {
                        tokens.push(' and ');
                    }
                    tokens.push(user);
                });
                tokens.push(' recommend it');
                return tokens;
            }
        },
        'bookmark-$users-recommend-this': (users) => {
            if (users.length === 1) {
                return `${users[0]} recommends this`
            } else {
                var tokens = [];
                _.each(users, (user, index) => {
                    if (index > 0) {
                        tokens.push(' and ');
                    }
                    tokens.push(user);
                });
                tokens.push(' recommend this');
                return tokens;
            }
        },
        'bookmark-recommendations': 'Recommendations',
        'bookmark-you-bookmarked-it': 'You bookmarked this',

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
            return `${users} reacted to this story`;
        },
        'story-add-coauthor': 'Add coauthor',
        'story-add-remove-coauthor': 'Remove coauthor',
        'story-audio': 'Audio',
        'story-author-two-names': (name1, name2) => {
            return [ name1, ' and ', name2 ];
        },
        'story-author-$count-others': (count) =>{
            return `${count} others`;
        },
        'story-cancel': 'Cancel',
        'story-coauthors': 'Coauthors',
        'story-comment': 'Comment',
        'story-file': 'File',
        'story-like': 'Like',
        'story-markdown': 'Markdown',
        'story-options': 'Options',
        'story-photo': 'Photo',
        'story-post': 'Post',
        'story-pending': 'Pending...',
        'story-task-list': 'Task list',
        'story-video': 'Video',
        'story-vote': 'Vote',

        'task-list-item-$number': (number) => {
            return `task ${number}`;
        },

        'user-actions': 'Actions',

        'video-capture-accept': 'Accept',
        'video-capture-cancel': 'Cancel',
        'video-capture-pause': 'Pause',
        'video-capture-retake': 'Retake',
        'video-capture-start': 'Start',
        'video-capture-stop': 'Stop',

        'vote-item-$number': (number) => {
            return `choice ${number}`;
        },
    };
    var languageName = 'English';
    var scriptDirection = 'ltr';
    var countries = {
        au: 'Australia',
        ca: 'Canada',
        hk: 'Hong Kong',
        ie: 'Ireland',
        sg: 'Singapore',
        gb: 'United Kingdom',
        us: 'United States',
    };
    var countryCode = 'us';
    return {
        languageName,
        scriptDirection,
        countryCode,
        countries,
        phrases,
    };
};
