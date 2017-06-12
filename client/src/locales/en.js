module.exports = function(languageCode) {
    var phrases = {
        'app-name': 'Trambar',
        'bottom-nav-bookmarks': 'bookmarks',
        'bottom-nav-news': 'news',
        'bottom-nav-notifications': 'notifications',
        'bottom-nav-people': 'people',
        'bottom-nav-settings': 'settings',

        'selection-cancel': 'Cancel',
        'selection-ok': 'OK',

        'story-cancel': 'Cancel',
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
