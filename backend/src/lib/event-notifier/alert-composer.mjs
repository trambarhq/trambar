import _ from 'lodash';
import * as Localization from '../localization.mjs';

function format(system, schema, user, notification, locale) {
    let title = Localization.pick(locale, system.details.title);
    if (!title) {
        title = Localization.translate(locale, 'app-name');
    }
    return {
        schema: schema,
        title: title,
        message: getNotificationText(user, notification, locale),
        profile_image: getProfileImageURL(user),
        type: notification.type,
        notification_id: notification.id,
        user_id: notification.user_id,
        reaction_id: notification.reaction_id,
        story_id: notification.story_id,
        locale: locale,
    };
}

function getNotificationText(user, notification, locale) {
    const name = Localization.name(locale, user);
    const t = function() {
        return Localization.translate.apply(null, [ locale, ...arguments ]);
    };
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
            return t('notification-$name-is-assigned-to-your-$story', name, notification.details.story_type);
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
        case 'snapshot':
            return t('notification-$name-modified-project-website', name);
    }
}

/**
 * Return URL to profile image
 *
 * @param  {User} user
 *
 * @return {String|undefined}
 */
function getProfileImageURL(user) {
    const image = _.find(user.details.resources, { type: 'image' });
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
    const res = _.first(reaction.details.resources);
    if (res) {
        let url;
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
    const filters = [];
    if (clip) {
        const rect = [
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

export {
    format,
};
