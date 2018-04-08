var _ = require('lodash');
var Promise = require('bluebird');

module.exports = {
    format,
};

function format(system, schema, user, notification, lang) {
    var title = _.get(system, [ 'details', 'title', lang ]);
    if (!title) {
        title = getLocalizedText('app-name', lang);
    }
    return {
        schema: schema,
        title: title,
        message: getNotificationText(user, notification, lang),
        profile_image: getProfileImageURL(user),
        type: notification.type,
        notification_id: notification.id,
        user_id: notification.user_id,
        reaction_id: notification.reaction_id,
        story_id: notification.story_id,
    };
}

function getNotificationText(user, notification, lang) {
    var t = function() {
        var args = _.concat(lang, arguments);
        return getLocalizedText.apply(null, args);
    };
    var n = function() {
        var args = _.concat(lang, arguments);
        return getLocalizedName.apply(null, args);
    };
    var name = n(user);
    switch (notification.type) {
        case 'like':
            return t('notification-$name-likes-your-$story', name, notification.details.story_type);
        case 'comment':
            return t('notification-$name-commented-on-your-$story', name, notification.details.story_type);
        case 'issue':
            return t('notification-$name-opened-an-issue', name);
        case 'vote':
            return t('notification-$name-voted-in-your-survey', name);
        case 'task-completion':
            return t('notification-$name-completed-task', name);
        case 'note':
            return t('notification-$name-posted-a-note-about-your-$story', name, notification.details.story_type);
        case 'assignment':
            return t('notification-$name-is-assigned-to-your-issue', name);
        case 'tracking':
            return t('notification-$name-added-your-post-to-issue-tracker', name);
        case 'push':
            return t('notification-$name-pushed-code-to-$branch', name, notification.details.branch);
        case 'merge':
            return t('notification-$name-merged-code-to-$branch', name, notification.details.branch);
        case 'coauthor':
            return t('notification-$name-added-you-as-coauthor', name);
        case 'survey':
            return t('notification-$name-posted-a-survey', name);
        case 'bookmark':
            return t('notification-$name-sent-bookmark-to-$story', name, notification.details.story_type);
        case 'mention':
            if (notification.details.story_type) {
                return t('notification-$name-mentioned-you-in-$story', name, notification.details.story_type);
            } else if (notification.details.reaction_type) {
                return t('notification-$name-mentioned-you-in-$reaction', name, notification.details.reaction_type);
            } else {
                break;
            }
        case 'join-request':
            return t('notification-$name-requested-to-join', name);
    }
}

function getLocalizedName(lang, user) {
    var name = new String(pick(user.details.name, lang));
    name.gender = user.details.gender;
    return name;
}

var phraseTables = {};

function getLocalizedText(lang, phrase, ...args) {
    var table = phraseTables[lang];
    if (!table) {
        var module;
        try {
            module = require(`locales/${lang}`);
        } catch(err) {
            module = require('locales/en');
        }
        table = phraseTables[lang] = module(lang);
    }
    var f = table[phrase];
    if (f instanceof Function) {
        return f.apply(table, args);
    } else {
        return String(f);
    }
}

function pick(versions, lang) {
    var s;
    if (typeof(versions) === 'object') {
        s = versions[lang];
        if (!s) {
            s = _.first(versions);
        }
    } else {
        s = String(versions);
    }
    return s;
}

/**
 * Return URL to profile image
 *
 * @param  {User} user
 *
 * @return {String|undefined}
 */
function getProfileImageURL(user) {
    var image = _.find(user.details.resources, { type: 'image' });
    var imageURL;
    if (image && image.url) {
        // form the URL
        return applyClippingRectangle(image.url, image.clip, 192, 192, 75);
    }
}

/**
 * Return URL to an image for an attached resource
 *
 * @param  {Reaction} reaction
 *
 * @return {String|undefined}
 */
function getReactionImageURL(reaction) {
    var res = _.first(reaction.details.resources);
    if (res) {
        var url;
        switch (res.type) {
            case 'image':
                url = res.url;
                break;
            case 'video':
            case 'audio':
            case 'website':
                url = res.poster_url;
                break;
        }
        if (url) {
            return applyClippingRectangle(url, res.clip, 512, 512, 75);
        }
    }
}

/**
 * Return URL to image, with clipping rectangle and dimension filters applied
 *
 * @param  {String} url
 * @param  {Object|undefined} clip
 * @param  {Number} width
 * @param  {Number} height
 * @param  {Number} quality
 *
 * @return {String}
 */
function applyClippingRectangle(url, clip, width, height, quality) {
    var filters = [];
    if (clip) {
        var rect = [
            clip.left,
            clip.top,
            clip.width,
            clip.height,
        ];
        filters.push(`cr${rect.join('-')}`)
    }
    filters.push(`re${width}-${height}`);
    filters.push(`qu${quality}`)
    return `${url}/${filters.join('+')}`;
}
