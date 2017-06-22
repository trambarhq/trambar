module.exports = function(languageCode) {
    var phrases = {
        'app-name': 'Trambar',
        'bottom-nav-bookmarks': 'bookmarks',
        'bottom-nav-news': 'news',
        'bottom-nav-notifications': 'notifications',
        'bottom-nav-people': 'people',
        'bottom-nav-settings': 'settings',

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
        'story-cancel': 'Cancel',
        'story-comment': 'Comment',
        'story-file': 'File',
        'story-like': 'Like',
        'story-photo': 'Photo',
        'story-post': 'Post',
        'story-video': 'Video',
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
