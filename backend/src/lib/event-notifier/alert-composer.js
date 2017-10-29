/**
 * Return text of a comment
 *
 * @param  {Reaction} reaction
 * @param  {String} languageCode
 *
 * @return {String}
 */
function getReactionText(reaction, languageCode) {
    var languageVersions = reaction.details.text || {};
    var currentLanguageCode = languageCode.substr(0, 2);
    var matchingPhrase = '';
    var firstNonEmptyPhrase = '';
    var defaultLanguageCode = 'en';
    var defaultLanguagePhrase = '';
    for (var key in languageVersions) {
        var phrase = _.trim(languageVersions[key]);
        var languageCode = _.toLower(key);
        if (languageCode === currentLanguageCode) {
            matchingPhrase = phrase;
        }
        if (!firstNonEmptyPhrase) {
            firstNonEmptyPhrase = phrase;
        }
        if (languageCode === defaultLanguageCode) {
            defaultLanguagePhrase = phrase;
        }
    }
    if (matchingPhrase) {
        return matchingPhrase;
    } else if (defaultLanguagePhrase) {
        return defaultLanguagePhrase;
    } else {
        return firstNonEmptyPhrase;
    }
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

function createAlert(schema, reaction, story, sender, languageCode) {
    var senderName = sender.details.name;
    var title, message;
    switch (reaction.type) {
        // TODO: perform proper localization and handle other reaction types
        case 'like':
            title = `${senderName} likes your story`;
            break;
        case 'comment':
            title = `${senderName} commented on your story`;
            message = getReactionText(reaction, languageCode);
            break;
    }
    if (message && message.length > 200) {
        message = message.substr(0, 200);
    }
    return alert = {
        schema,
        title,
        message,
        profile_image: getProfileImageUrl(sender),
        attached_image: getReactionImageUrl(reaction),
        type: reaction.type,
        user_id: sender.id,
        reaction_id: reaction.id,
        story_id: story.id,
    };
}
