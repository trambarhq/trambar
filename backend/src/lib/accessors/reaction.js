import _ from 'lodash';
import HTTPError from 'errors/http-error';
import { ExternalData } from 'accessors/external-data';
import Task from 'accessors/task';
import Notification from 'accessors/notification';

class Reaction extends ExternalData {
    constructor() {
        super();
        this.schema = 'project';
        this.table = 'reaction';
        _.extend(this.columns, {
            type: String,
            tags: Array(String),
            language_codes: Array(String),
            story_id: Number,
            user_id: Number,
            published: Boolean,
            ready: Boolean,
            suppresed: Boolean,
            ptime: String,
            public: Boolean,
        });
        _.extend(this.criteria, {
            type: String,
            tags: Array(String),
            language_codes: Array(String),
            story_id: Number,
            user_id: Number,
            published: Boolean,
            ready: Boolean,
            suppresed: Boolean,
            public: Boolean,

            server_id: Number,
            time_range: String,
            newer_than: String,
            older_than: String,
            search: Object,
        });
        this.accessControlColumns = {
            public: Boolean,
        };
    }

    /**
     * Create table in schema
     *
     * @param  {Database} db
     * @param  {String} schema
     *
     * @return {Promise}
     */
    async create(db, schema) {
        let table = this.getTableName(schema);
        let sql = `
            CREATE TABLE ${table} (
                id serial,
                gn int NOT NULL DEFAULT 1,
                deleted boolean NOT NULL DEFAULT false,
                ctime timestamp NOT NULL DEFAULT NOW(),
                mtime timestamp NOT NULL DEFAULT NOW(),
                details jsonb NOT NULL DEFAULT '{}',
                type varchar(32) NOT NULL DEFAULT '',
                tags varchar(64)[] NOT NULL DEFAULT '{}'::text[],
                language_codes varchar(2)[] NOT NULL DEFAULT '{}'::text[],
                story_id int NOT NULL,
                user_id int NOT NULL,
                published boolean NOT NULL DEFAULT false,
                ready boolean NOT NULL DEFAULT false,
                suppressed boolean NOT NULL DEFAULT false,
                ptime timestamp,
                public boolean NOT NULL DEFAULT false,
                external jsonb[] NOT NULL DEFAULT '{}',
                exchange jsonb[] NOT NULL DEFAULT '{}',
                itime timestamp,
                etime timestamp,
                PRIMARY KEY (id)
            );
            CREATE INDEX ON ${table} (story_id) WHERE deleted = false;
            CREATE INDEX ON ${table} USING gin(("payloadTokens"(details))) WHERE "payloadTokens"(details) IS NOT NULL;
        `;
        await db.execute(sql);
    }

    /**
     * Attach triggers to the table.
     *
     * @param  {Database} db
     * @param  {String} schema
     *
     * @return {Promise}
     */
    async watch(db, schema) {
        await this.createChangeTrigger(db, schema);
        await this.createNotificationTriggers(db, schema, [
            'deleted',
            'type',
            'tags',
            'language_codes',
            'story_id',
            'user_id',
            'published',
            'ready',
            'ptime',
            'public',
            'external',
            'mtime',
            'itime',
            'etime'
        ]);
        // merge changes to details->resources to avoid race between
        // client-side changes and server-side changes
        await this.createResourceCoalescenceTrigger(db, schema, [ 'ready', 'ptime' ]);
        // completion of tasks will automatically update details->resources and ready
        await Task.createUpdateTrigger(db, schema, 'updateReaction', 'updateResource', [ this.table, 'ready', 'published' ]);
    }

    /**
     * Filter out rows that user doesn't have access to
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<Object>} rows
     * @param  {Object} credentials
     *
     * @return {Promise<Array<Object>>}
     */
    async filter(db, schema, rows, credentials) {
        if (credentials.user.type === 'guest') {
            rows = _.filter(rows, { public: true });
        }
        return rows;
    }

    /**
     * Add conditions to SQL query based on criteria object
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object} criteria
     * @param  {Object} query
     *
     * @return {Promise}
     */
    async apply(db, schema, criteria, query) {
        let special = [
            'time_range',
            'newer_than',
            'older_than',
            'search',
        ];
        super.apply(_.omit(criteria, special), query);

        let params = query.parameters;
        let conds = query.conditions;
        if (criteria.time_range !== undefined) {
            conds.push(`ptime <@ $${params.push(criteria.time_range)}::tsrange`);
        }
        if (criteria.newer_than !== undefined) {
            conds.push(`ptime > $${params.push(criteria.newer_than)}`);
        }
        if (criteria.older_than !== undefined) {
            conds.push(`ptime < $${params.push(criteria.older_than)}`);
        }
        if (criteria.search) {
            await this.applyTextSearch(db, schema, criteria.search, query);
        }
    }

    /**
     * Import object sent by client-side code
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object} reactionReceived
     * @param  {Object} reactionBefore
     * @param  {Object} credentials
     *
     * @return {Promise<Object>}
     */
    async importOne(db, schema, reactionReceived, reactionBefore, credentials, options) {
        let row = await super.importOne(db, schema, reactionReceived, reactionBefore, credentials, options);
        // set language_codes
        if (reactionReceived.details) {
            row.language_codes = _.filter(_.keys(reactionReceived.details.text), { length: 2 });
        }

        // set the ptime if published is set
        if (reactionReceived.published && !reactionReceived.ptime) {
            row.ptime = new String('NOW()');
        }

        // mark reaction as having been manually deleted
        if (reactionReceived.deleted) {
            row.suppressed = true;
        }

        if (!reactionReceived.id) {
            if (reactionReceived.type === 'like' || reactionReceived.type === 'vote') {
                // see if there's an existing like or vote
                let criteria = {
                    type: reactionReceived.type,
                    story_id: reactionReceived.story_id,
                    user_id: reactionReceived.user_id,
                };
                let existingRow = await this.findOne(db, schema, criteria, 'id');
                if (existingRow) {
                    // reuse the row--to avoid triggering new notification
                    row.id = existingRow.id;
                    row.deleted = false;
                }
            }
        }
        return row;
    }

    /**
     * Export database row to client-side code, omitting sensitive or
     * unnecessary information
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<Object>} rows
     * @param  {Object} credentials
     * @param  {Object} options
     *
     * @return {Promise<Object>}
     */
    async export(db, schema, rows, credentials, options) {
        let objects = await super.export(db, schema, rows, credentials, options);
        for (let [ index, object ] of objects.entries()) {
            let row = rows[index];
            object.type = row.type;
            object.story_id = row.story_id;
            object.user_id = row.user_id;
            object.ptime = row.ptime;
            object.public = row.public;
            object.published = row.published;
            object.tags = row.tags;
            if (row.ready === false) {
                object.ready = false;
            }
            if (!row.published || !row.ready) {
                // don't send text when object isn't published and the
                // user isn't the owner
                if (object.user_id !== credentials.user.id) {
                    object.details = _.omit(object.details, 'text', 'resources');
                }
            }
        }
        return objects;
    }

    /**
     * Create associations between newly created or modified rows with
     * rows in other tables
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<Object>} objects
     * @param  {Array<Object>} originals
     * @param  {Array<Object>} rows
     * @param  {Object} credentials
     *
     * @return {Promise}
     */
     async associate(db, schema, objects, originals, rows, credentials) {
         let deletedReactions = _.filter(rows, { deleted: true });
         await Notification.deleteAssociated(db, schema, { reaction: deletedReactions });
     }

    /**
     * See if a database change event is relevant to a given user
     *
     * @param  {Object} event
     * @param  {User} user
     * @param  {Subscription} subscription
     *
     * @return {Boolean}
     */
    isRelevantTo(event, user, subscription) {
        if (subscription.area === 'admin') {
            // admin console doesn't use this object currently
            return false;
        }
        if (super.isRelevantTo(event, user, subscription)) {
            // reactions are relevant to all user even before they're published
            // that's used to show someone is commenting
            return true;
        }
        return false;
    }

    /**
     * Throw an exception if modifications aren't permitted
     *
     * @param  {Object} reactionReceived
     * @param  {Object} reactionBefore
     * @param  {Object} credentials
     */
    checkWritePermission(reactionReceived, reactionBefore, credentials) {
        if (credentials.access !== 'read-comment' && credentials.access !== 'read-write') {
            throw new HTTPError(400);
        }
        if (reactionBefore) {
            if (reactionBefore.user_id !== credentials.user.id) {
                // can't modify an object that doesn't belong to the user
                // unless user is an admin or a moderator
                if (credentials.user.type !== 'admin' && credentials.user.type !== 'moderator') {
                    throw new HTTPError(400);
                }
            }
            if (reactionReceived.hasOwnProperty('user_id')) {
                if (reactionReceived.user_id !== reactionBefore.user_id) {
                    // cannot make someone else the author
                    throw new HTTPError(400);
                }
            }
        } else {
            if (reactionReceived.id) {
                throw new HTTPError(400);
            }
            if (!reactionReceived.hasOwnProperty('user_id')) {
                throw new HTTPError(400);
            }
            if (reactionReceived.user_id !== credentials.user.id) {
                // the author must be the current user
                throw new HTTPError(400);
            }
        }
    }

    /**
     * Mark reactions as deleted if their authors are those specified
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object} associations
     *
     * @return {Promise}
     */
    async deleteAssociated(db, schema, associations) {
        for (let [ type, objects ] of _.entries(associations)) {
            if (_.isEmpty(objects)) {
                continue;
            }
            if (type === 'user') {
                let userIds = _.map(objects, 'id');
                let criteria = {
                    user_id: userIds,
                    deleted: false,
                };
                let reactions = await this.updateMatching(db, schema, criteria, { deleted: true });
                // delete notifications about these reactions as well
                await Notification.deleteAssociated(db, schema, { reaction: reactions });
            }
        }
    }

    /**
     * Clear deleted flag of reactions beloging to specified users
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object} associations
     *
     * @return {Promise}
     */
    async restoreAssociated(db, schema, associations) {
        for (let [ type, objects ] of _.entries(associations)) {
            if (_.isEmpty(objects)) {
                continue;
            }
            if (type === 'user') {
                let userIds = _.map(objects, 'id');
                let criteria = {
                    user_id: userIds,
                    deleted: true,
                    // don't restore reactions that were manually deleted
                    suppressed: false,
                };
                let reactions = await this.updateMatching(db, schema, criteria, { deleted: false });
                // restore notifications as weel
                await Notification.restoreAssociated(db, schema, { reaction: reactions });
            }
        }
    }
}

const instance = new Reaction;

export {
    instance as default,
    Reaction,
};
