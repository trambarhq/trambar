var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var Data = require('accessors/data');
var Task = require('accessors/task');
var HttpError = require('errors/http-error');

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
        repo_id: Number,
        external_id: Number,
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
        repo_id: Number,
        external_id: Number,
        published: Boolean,
        public: Boolean,
        time_range: String,
        newer_than: String,
        older_than: String,
        ready: Boolean,
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
                repo_id int,
                external_id int,
                PRIMARY KEY (id)
            );
            CREATE INDEX ON ${table} (repo_id, external_id) WHERE repo_id IS NOT NULL AND external_id IS NOT NULL;
            CREATE INDEX ON ${table} USING gin(("payloadIds"(details))) WHERE "payloadIds"(details) IS NOT NULL;
        `;
        return db.execute(sql);
    },

    /**
     * Attach triggers to this table, also add trigger on task so details
     * are updated when tasks complete
     *
     * @param  {Database} db
     * @param  {String} schema
     *
     * @return {Promise<Boolean>}
     */
    watch: function(db, schema) {
        return Data.watch.call(this, db, schema).then(() => {
            return Task.createUpdateTrigger(db, schema, this.table, 'updateResource');
        });
    },

    /**
     * Add conditions to SQL query based on criteria object
     *
     * @param  {Object} criteria
     * @param  {Object} query
     */
    apply: function(criteria, query) {
        var special = [ 'time_range', 'newer_than', 'older_than', 'ready' ];
        Data.apply.call(this, _.omit(criteria, special), query);

        var params = query.parameters;
        var conds = query.conditions;
        if (criteria.time_range !== undefined) {
            params.push(criteria.time_range);
            conds.push(`ptime <@ $${params.length}::tsrange`);
        }
        if (criteria.newer_than !== undefined) {
            params.push(criteria.newer_than);
            conds.push(`ptime > $${params.length}`);
        }
        if (criteria.older_than !== undefined) {
            params.push(criteria.older_than);
            conds.push(`ptime < $${params.length}`);
        }
        if (criteria.ready !== undefined) {
            if (criteria.ready === true) {
                conds.push(`ptime IS NOT NULL`);
            } else {
                conds.push(`ptime IS NULL`);
            }
        }
    },

    /**
     * Import objects sent by client-side code, applying access control
     *
     * @param  {Database} db
     * @param  {Schema} schema
     * @param  {Array<Object>} objects
     * @param  {Array<Object>} originals
     * @param  {Object} credentials
     *
     * @return {Promise<Array>}
     */
    import: function(db, schema, objects, originals, credentials, options) {
        return Data.import.call(this, db, schema, objects, originals, credentials).map((object, index) => {
            var original = originals[index];
            if (original) {
                if (original.user_id !== credentials.user.id) {
                    // can't modify an object that doesn't belong to the user
                    throw new HttpError(403);
                }
                if (object.hasOwnProperty('user_id')) {
                    if (object.user_id !== original.user_id) {
                        // cannot make someone else the author
                        throw new HttpError(403);
                    }
                }
            } else {
                if (object.id) {
                    throw new HttpError(400);
                }
                if (!object.hasOwnProperty('user_id')) {
                    throw new HttpError(403);
                }
                if (object.user_id !== credentials.user.id) {
                    // the author must be the current user
                    throw new HttpError(403);
                }
            }

            // set the ptime if published is set and there're no outstanding
            // media tasks
            if (object.published && !object.ptime) {
                var payloadIds = getPayloadIds(object);
                if (_.isEmpty(payloadIds)) {
                    object.ptime = Moment().toISOString();
                }
            }
            return object;
        });
    },


    /**
     * Export database row to client-side code, omitting sensitive or
     * unnecessary information
     *
     * @param  {Database} db
     * @param  {Schema} schema
     * @param  {Array<Object>} rows
     * @param  {Object} credentials
     * @param  {Object} options
     *
     * @return {Promise<Object>}
     */
    export: function(db, schema, rows, credentials, options) {
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
            return object;
        });

        return Data.export.call(this, db, schema, rows, credentials, options).then((objects) => {
            _.each(objects, (object, index) => {
                var row = rows[index];
                object.type = row.type;
                object.story_id = row.story_id;
                object.user_id = row.user_id;
                object.target_user_ids = row.target_user_ids;
                object.ptime = row.ptime;
                object.public = row.public;
                object.published = row.published;
                if (row.repo_id) {
                    object.repo_id = row.repo_id;
                }
                if (row.external_id) {
                    object.external_id = row.external_id;
                }
                if (!object.published) {
                    // don't send text when object isn't published and
                    // there the user isn't the owner
                    if (object.user_id !== credentials.user.id) {
                        object.details = _.omit(object.details, 'text', 'resources');
                    }
                }
            });
            return objects;
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

/**
 * Return task ids in the object
 *
 * @param  {Object} object
 *
 * @return {Array<Number>}
 */
function getPayloadIds(object) {
    var payloadIds = [];
    if (object && object.details) {
        _.each(object.details.resources, (res) => {
            if (res.payload_id) {
                payloadIds.push(res.payload_id);
            }
        });
    }
    return payloadIds;
}
