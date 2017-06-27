module.exports = function(languageCode) {
    var phrases = {
        'app-name': 'Trambar',
        'bottom-nav-bookmarks': 'bookmarks',
        'bottom-nav-news': 'news',
        'bottom-nav-notifications': 'notifications',
        'bottom-nav-people': 'people',
        'bottom-nav-settings': 'settings',

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

        'selection-cancel': 'Cancel',
        'selection-ok': 'OK',

        'story-$1-user-reacted-to-story': ($1) => {
            var users = ($1 === 1) ? `${$1} user` : `${$1} users`;
            return `${users} reacted to this story`;
        },
        'story-add-coauthor': 'Add coauthor',
        'story-add-remove-coauthor': 'Remove coauthor',
        'story-cancel': 'Cancel',
        'story-comment': 'Comment',
        'story-file': 'File',
        'story-like': 'Like',
        'story-options': 'Options',
        'story-photo': 'Photo',
        'story-post': 'Post',
        'story-pending': 'Pending...',
        'story-video': 'Video',

        'video-capture-accept': 'Accept',
        'video-capture-cancel': 'Cancel',
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
