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

        'bottom-nav-bookmarks': 'Bookmarks',
        'bottom-nav-news': 'News',
        'bottom-nav-notifications': 'Notifications',
        'bottom-nav-people': 'People',
        'bottom-nav-settings': 'Settings',

        'option-add-bookmark': 'Add bookmark to this story',
        'option-add-issue': 'Add post to issue tracker',
        'option-contact-by-phone': 'Contact by phone',
        'option-contact-by-email': 'Contact by e-mail',
        'option-hide-post': 'Hide from non-team members',
        'option-send-bookmarks': 'Send bookmarks to other users',
        'option-send-bookmarks-to-$1-users': ($1) => {
            var users = ($1 === 1) ? `${$1} user` : `${$1} users`;
            return `Send bookmarks to ${users}`;
        },
        'option-view-gitlab-page': 'View Gitlab profile page',

        'photo-capture-accept': 'Accept',
        'photo-capture-cancel': 'Cancel',
        'photo-capture-retake': 'Retake',
        'photo-capture-snap': 'Snap',

        'statistics-bar': 'Bar',
        'statistics-line': 'Line',
        'statistics-pie': 'Pie',

        'selection-cancel': 'Cancel',
        'selection-ok': 'OK',

        'story-$1-user-reacted-to-story': ($1) => {
            var users = ($1 === 1) ? `${$1} user` : `${$1} users`;
            return `${users} reacted to this story`;
        },
        'story-add-coauthor': 'Add coauthor',
        'story-add-remove-coauthor': 'Remove coauthor',
        'story-audio': 'Audio',
        'story-cancel': 'Cancel',
        'story-comment': 'Comment',
        'story-file': 'File',
        'story-like': 'Like',
        'story-options': 'Options',
        'story-photo': 'Photo',
        'story-post': 'Post',
        'story-pending': 'Pending...',
        'story-video': 'Video',

        'user-actions': 'Actions',

        'video-capture-accept': 'Accept',
        'video-capture-cancel': 'Cancel',
        'video-capture-pause': 'Pause',
        'video-capture-retake': 'Retake',
        'video-capture-start': 'Start',
        'video-capture-stop': 'Stop',
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
