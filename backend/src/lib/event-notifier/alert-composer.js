var _ = require('lodash');
var Promise = require('bluebird');

exports.format = format;

function format(schema, user, notification, lang) {
    return {
        schema: schema,
        title: getNotificationText(user, notification, lang),
        profile_image: getProfileImageUrl(user),
        type: notification.type,
        user_id: notification.user_id,
        reaction_id: notification.reaction_id,
        story_id: notification.story_id,
    };
}

function getNotificationText(user, notification, lang) {
    var name = getLocalizedName(lang, user);
    switch (notification.type) {
        case 'like':
            return getLocalizedText(lang, 'notification-$user-likes-your-$story', name, notification.details.story_type);
        case 'comment':
            return getLocalizedText(lang, 'notification-$user-commented-on-your-$story', name, notification.details.story_type);
        case 'issue':
            return getLocalizedText(lang, 'notification-$user-opened-an-issue', name);
        case 'vote':
            return getLocalizedText(lang, 'notification-$user-voted-in-your-survey', name);
        case 'task-completion':
            return getLocalizedText(lang, 'notification-$user-completed-task', name);
        case 'note':
            return getLocalizedText(lang, 'notification-$user-posted-a-note-about-your-$story', name, notification.details.story_type);
        case 'assignment':
            return getLocalizedText(lang, 'notification-$user-is-assigned-to-your-issue', name);
        case 'push':
            return getLocalizedText(lang, 'notification-$user-pushed-code-to-$branch', name, notification.details.branch);
        case 'merge':
            return getLocalizedText(lang, 'notification-$user-merged-code-to-$branch', name, notification.details.branch);
        case 'task-list':
            return getLocalizedText(lang, 'notification-$user-added-you-to-task-list', name);
        case 'survey':
            return getLocalizedText(lang, 'notification-$user-posted-a-survey', name);
        case 'bookmark':
            return getLocalizedText(lang, 'notification-$user-sent-bookmark-to-$story', name, notification.details.story_type);
        case 'join_request':
            return getLocalizedText(lang, 'notification-$user-requested-to-join', name);
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
function getProfileImageUrl(user) {
    var image = _.find(user.details.resources, { type: 'image' });
    var imageUrl;
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
function getReactionImageUrl(reaction) {
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
