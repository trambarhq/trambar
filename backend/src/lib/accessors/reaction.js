var _ = require('lodash');
var Promise = require('bluebird');
var Data = require('accessors/data');

module.exports = _.create(Data, {
    schema: 'project',
    table: 'reaction',
    columns: {
        id: Number,
        gn: Number,
        deleted: Boolean,
        ctime: String,
        mtime: String,
        details: Object,
        type: String,
        story_id: Number,
        user_id: Number,
        target_user_ids: Array(Number),
        published: Boolean,
        ptime: String,
        public: Boolean,
    },
    criteria: {
        id: Number,
        deleted: Boolean,
        type: String,
        story_id: Number,
        user_id: Number,
        target_user_ids: Array(Number),
        published: Boolean,
        public: Boolean,
    },

    /**
     * Create table in schema
     *
     * @param  {Database} db
     * @param  {String} schema
     *
     * @return {Promise<Result>}
     */
    create: function(db, schema) {
        var table = this.getTableName(schema);
        var sql = `
            CREATE TABLE ${table} (
                id serial,
                gn int NOT NULL DEFAULT 1,
                deleted boolean NOT NULL DEFAULT false,
                ctime timestamp NOT NULL DEFAULT NOW(),
                mtime timestamp NOT NULL DEFAULT NOW(),
                details jsonb NOT NULL DEFAULT '{}',
                type varchar(32) NOT NULL DEFAULT '',
                story_id int NOT NULL DEFAULT 0,
                user_id int NOT NULL DEFAULT 0,
                target_user_ids int[] NOT NULL,
                published boolean NOT NULL DEFAULT false,
                ptime timestamp,
                public boolean NOT NULL DEFAULT false,
                PRIMARY KEY (id)
            );
        `;
        return db.execute(sql);
    },

    /**
     * Export database row to client-side code, omitting sensitive or
     * unnecessary information
     *
     * @param  {Database} db
     * @param  {Schema} schema
     * @param  {Array<Object>} rows
     * @param  {Object} credentials
     *
     * @return {Promise<Object>}
     */
    export: function(db, schema, rows, credentials) {
        return Promise.map(rows, (row) => {
            var object = {
                id: row.id,
                gn: row.gn,
                details: row.details,
                type: row.type,
                story_id: row.story_id,
                user_id: row.user_id,
                target_user_ids: row.target_user_ids,
                ptime: row.ptime,
                public: row.public,
                published: row.published,
            };
            if (!object.published) {
                if (object.user_id !== credentials.user.id) {
                    object.details = _.omit(object.details, 'text', 'resources');
                }
            }
            return object;
        });
    },

    createAlert(schema, reaction, story, sender, languageCode) {
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
});

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
