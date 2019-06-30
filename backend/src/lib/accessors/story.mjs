import _ from 'lodash';
import HTTPError from '../common/errors/http-error.mjs';
import { ExternalData } from './external-data.mjs';
import Bookmark from './bookmark.mjs';
import Notification from './notification.mjs';
import User from './user.mjs';
import Task from './task.mjs';

class Story extends ExternalData {
    constructor() {
        super();
        this.schema = 'project';
        this.table = 'story';
        this.columns = {
            ...this.columns,
            type: String,
            tags: Array(String),
            language_codes: Array(String),
            published_version_id: Number,
            user_ids: Array(Number),
            role_ids: Array(Number),
            published: Boolean,
            ready: Boolean,
            suppressed: Boolean,
            ptime: String,
            btime: String,
            public: Boolean,
            unfinished_tasks: Number,
        };
        this.criteria = {
            ...this.criteria,
            type: String,
            tags: Array(String),
            language_codes: Array(String),
            published_version_id: Number,
            user_ids: Array(Number),
            role_ids: Array(Number),
            published: Boolean,
            ready: Boolean,
            suppressed: Boolean,
            public: Boolean,

            server_id: Number,
            lead_author_id: Number,
            exclude: Array(Number),
            time_range: String,
            newer_than: String,
            older_than: String,
            bumped_after: String,
            url: String,
            has_tags: Boolean,
            has_unfinished_tasks: Boolean,
            search: Object,
            per_user_limit: Number,
        };
        this.eventColumns = {
            ...this.eventColumns,
            type: String,
            tags: Array(String),
            language_codes: Array(String),
            user_ids: Array(Number),
            role_ids: Array(Number),
            published: Boolean,
            ready: Boolean,
            ptime: String,
            btime: String,
            public: Boolean,
            unfinished_tasks: Number,
        };
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
        const table = this.getTableName(schema);
        const sql = `
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
                published_version_id int,
                user_ids int[] NOT NULL DEFAULT '{}'::int[],
                role_ids int[] NOT NULL DEFAULT '{}'::int[],
                published boolean NOT NULL DEFAULT false,
                ready boolean NOT NULL DEFAULT false,
                suppressed boolean NOT NULL DEFAULT false,
                ptime timestamp,
                btime timestamp,
                public boolean NOT NULL DEFAULT false,
                unfinished_tasks int,
                external jsonb[] NOT NULL DEFAULT '{}',
                exchange jsonb[] NOT NULL DEFAULT '{}',
                itime timestamp,
                etime timestamp,
                PRIMARY KEY (id)
            );
            CREATE INDEX ON ${table} USING gin(user_ids) WHERE deleted = false;
            CREATE INDEX ON ${table} USING gin(role_ids) WHERE deleted = false;
            CREATE INDEX ON ${table} USING gin(("lowerCase"(tags))) WHERE deleted = false AND cardinality(tags) <> 0;
            CREATE INDEX ON ${table} USING gin(("payloadTokens"(details))) WHERE "payloadTokens"(details) IS NOT NULL;
            CREATE INDEX ON ${table} ((COALESCE(ptime, btime))) WHERE published = true AND ready = true;
            CREATE INDEX ON ${table} (id) WHERE unfinished_tasks > 0 AND published = true AND deleted = false;
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
        await this.createNotificationTriggers(db, schema);
        await this.createResourceCoalescenceTrigger(db, schema, [ 'ready', 'ptime' ]);
        await Task.createUpdateTrigger(db, schema, 'updateStory', 'updateResource', [ this.table ]);
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
        const { lead_author_id, time_range, newer_than, older_than, bumped_after,
                url, has_tags, has_unfinished_tasks, search, per_user_limit,
                ...basic } = criteria;
        super.apply(basic, query);

        const params = query.parameters;
        const conds = query.conditions;
        if (lead_author_id !== undefined) {
            if (lead_author_id instanceof Array) {
                conds.push(`user_ids[1:1] <@ $${params.push(lead_author_id)}`);
            } else {
                conds.push(`user_ids[1] = $${params.push(lead_author_id)}`);
            }
        }
        if (time_range !== undefined) {
            conds.push(`ptime <@ $${params.push(time_range)}::tsrange`);
        }
        if (newer_than !== undefined) {
            conds.push(`ptime > $${params.push(newer_than)}`);
        }
        if (older_than !== undefined) {
            conds.push(`ptime < $${params.push(older_than)}`);
        }
        if (bumped_after !== undefined) {
            const time = `$${params.push(bumped_after)}`
            conds.push(`COALESCE(ptime, btime) > ${time}`);
        }
        if (url !== undefined) {
            conds.push(`details->>'url' = $${params.push(url)}`);
        }
        if (has_tags !== undefined) {
            if (has_tags) {
                conds.push(`CARDINALITY(tags) <> 0`);
            } else {
                conds.push(`CARDINALITY(tags) = 0`);
            }
        }
        if (has_unfinished_tasks !== undefined) {
            if (has_unfinished_tasks) {
                conds.push(`unfinished_tasks > 0`);
            } else {
                conds.push(`unfinished_tasks = 0`);
            }
        }
        if (search) {
            await this.applyTextSearch(db, schema, search, query);
        }
        if (typeof(per_user_limit) === 'number') {
            // use a lateral join to limit the number of results per user
            // apply conditions on sub-query
            const user = User.getTableName('global');
            const story = this.getTableName(schema);
            const conditions = _.concat(`${user}.id = ANY(user_ids)`, query.conditions);
            const subquery = `
                SELECT DISTINCT top_story.id
                FROM ${user} JOIN LATERAL (
                    SELECT * FROM ${story}
                    WHERE ${conditions.join(' AND ')}
                    ORDER BY COALESCE(ptime, btime) DESC
                    LIMIT ${per_user_limit}
                ) top_story ON true
            `;
            const condition = `id IN (${subquery})`
            query.conditions = [ condition ];
        }
    }

    /**
     * Return SQL expression that yield searchable text
     *
     * @param  {String} languageCode
     *
     * @return {String}
     */
    getSearchableText(languageCode) {
        return `"extractStoryText"(type, details, external, '${languageCode}')`;
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
     * @return {Promise<Array>}
     */
    async export(db, schema, rows, credentials, options) {
        const objects = await super.export(db, schema, rows, credentials, options);
        for (let [ index, object ] of objects.entries()) {
            const row = rows[index];
            object.type = row.type;
            object.user_ids = row.user_ids;
            object.role_ids = row.role_ids;
            object.ptime = row.ptime;
            object.public = row.public;
            object.published = row.published;
            object.tags = row.tags;
            if (row.type === 'task-list') {
                object.unfinished_tasks = row.unfinished_tasks;
            }
            if (row.published_version_id) {
                object.published_version_id = row.published_version_id;
            }
            if (row.ready === false) {
                object.ready = false;
            }
            if (row.btime) {
                object.btime = row.btime;
            }
            if (!row.published) {
                // don't send text when object isn't published and
                // the user isn't the owner
                if (!_.includes(object.user_ids, credentials.user.id)) {
                    object.details = _.omit(object.details, 'text', 'resources');
                }
            }
        }
        return objects;
    }

    /**
     * Import objects sent by client-side code, applying access control
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<Object>} storiesReceived
     * @param  {Array<Object>} storiesBefore
     * @param  {Object} credentials
     * @param  {Object} options
     *
     * @return {Promise<Array>}
     */
    async import(db, schema, storiesReceived, storiesBefore, credentials, options) {
        const storiesPublished = [];
        const rows = [];
        for (let [ index, storyReceived ] of storiesReceived.entries()) {
            const storyBefore = storiesBefore[index];
            this.checkWritePermission(storyReceived, storyBefore, credentials);

            const row = await super.importOne(db, schema, storyReceived, storyBefore, credentials);
            // set language_codes
            if (storyReceived.details) {
                row.language_codes = _.filter(_.keys(storyReceived.details.text), { length: 2 });
            }

            // set the ptime if published is set
            if (storyReceived.published && !storyReceived.ptime) {
                row.ptime = new String('NOW()');
            }

            // update btime if user wants to bump story
            if (storyReceived.bump) {
                row.btime = Object('NOW()');
                delete row.bump;
            }

            // mark story as having been manually deleted
            if (storyReceived.deleted) {
                row.suppressed = true;
            }

            // set unfinished_tasks to null when story type is no longer 'task-list'
            if (storyReceived.hasOwnProperty('type')) {
                if (storyReceived.type !== 'task-list') {
                    storyReceived.unfinished_tasks = null;
                }
            }

            if (storyReceived.published_version_id && storyReceived.published) {
                // load the original, published version
                const criteria = { id: storyReceived.published_version_id, deleted: false };
                const storyPublished = await this.findOne(db, schema, criteria, '*');
                if (storyPublished) {
                    // update the original row with properties from the temp copy
                    const updates = {
                        id: storyPublished.id,
                        details: storyReceived.details,
                        type: storyReceived.type,
                        user_ids: storyReceived.user_ids,
                        role_ids: storyReceived.role_ids,
                        public: storyReceived.public,
                        tags: storyReceived.tags,
                        language_codes: storyReceived.language_codes,
                    };
                    // check permission again (just in case)
                    this.checkWritePermission(updates, storyPublished, credentials);
                    storiesPublished.push(updates);

                    // stick contents of the original row into the temp copy
                    // so we can retrieve them later potentially
                    row = {
                        id: (storyBefore) ? storyBefore.id : undefined,
                        details: storyPublished.details,
                        type: storyPublished.type,
                        user_ids: storyPublished.user_ids,
                        role_ids: storyPublished.role_ids,
                        public: storyPublished.public,
                        tags: storyPublished.tags,
                        language_codes: storyPublished.language_codes,
                        deleted: true,
                    };
                }
            }
            rows.push(row);
        }
        for (let storyPublished of storiesPublished) {
            rows.push(storyPublished);
        }
        return rows;
    }

    /**
     * Create associations between newly created or modified rows with
     * rows in other tables
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<Object>} storiesReceived
     * @param  {Array<Object>} storiesBefore
     * @param  {Array<Object>} storiesAfter
     * @param  {Object} credentials
     *
     * @return {Promise}
     */
     async associate(db, schema, storiesReceived, storiesBefore, storiesAfter, credentials) {
         const deletedStories = _.filter(storiesAfter, { deleted: true });
         await Bookmark.deleteAssociated(db, schema, { story: deletedStories });
         await Notification.deleteAssociated(db, schema, { story: deletedStories });
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
            if (event.current.published && event.current.ready) {
                return true;
            }
            if (_.includes(event.current.user_ids, user.id)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Throw an exception if modifications aren't permitted
     *
     * @param  {Object} storyReceived
     * @param  {Object} storyBefore
     * @param  {Object} credentials
     */
    checkWritePermission(storyReceived, storyBefore, credentials) {
        if (credentials.access !== 'read-write') {
            throw new HTTPError(400);
        }
        if (storyBefore) {
            if (!_.includes(storyBefore.user_ids, credentials.user.id)) {
                // can't modify an object that doesn't belong to the user
                // unless user is an admin or a moderator
                if (credentials.user.type !== 'admin' && credentials.user.type !== 'moderator') {
                    throw new HTTPError(400);
                }
            }
            if (storyReceived.hasOwnProperty('user_ids')) {
                if (!_.isEqual(storyReceived.user_ids, storyBefore.user_ids)) {
                    if (storyBefore.user_ids[0] !== credentials.user.id) {
                        // a coauthor can remove himself only
                        const withoutCurrentUser = _.without(storyBefore.user_ids, credentials.user.id);
                        if (!_.isEqual(storyReceived.user_ids, withoutCurrentUser)) {
                            throw new HTTPError(400);
                        }
                    }
                    if (storyReceived.user_ids[0] !== storyBefore.user_ids[0]) {
                        // cannot make someone else the lead author
                        throw new HTTPError(400);
                    }
                }
            }
        } else {
            if (storyReceived.id) {
                throw new HTTPError(400);
            }
            if (!storyReceived.hasOwnProperty('user_ids')) {
                throw new HTTPError(400);
            }
            if (storyReceived.user_ids[0] !== credentials.user.id) {
                // the lead author must be the current user
                throw new HTTPError(400);
            }
        }
    }

    /**
     * Repopulate role_ids with role ids of authors when their roles change,
     * doing so selectively as the column is supposed to reflect their roles
     * at the time when the stories were created.
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<Number>} userIDs
     *
     * @return {Promise}
     */
    async updateUserRoles(db, schema, userIDs) {
        const userTable = User.getTableName('global');
        const storyTable = this.getTableName(schema);

        // for normal stories, we update those published earlier on the same day
        const condition1 = `
            ptime > current_date::timestamp
        `;
        // for stories where ctime > ptime (meaning they were imported),
        // we update those less than a week old.
        const condition2 = `
            ctime > ptime AND ctime > NOW() - INTERVAL '1 week'
        `;
        // subquery that yield story_id and role_id (unnested)
        const roleIDSubQuery = `
            SELECT s.id AS story_id, UNNEST(u.role_ids) AS role_id
            FROM ${userTable} u
            INNER JOIN ${storyTable} s
            ON u.id = ANY(s.user_ids)
        `;
        // subquery that yield story_id and role_ids (aggregated, distinct)
        const roleIDsSubQuery = `
            SELECT story_id, array_agg(DISTINCT role_id) AS role_ids
            FROM (${roleIDSubQuery}) AS story_role_id
            GROUP BY story_id
        `;
        const sql = `
            UPDATE ${storyTable}
            SET role_ids = story_role_ids.role_ids
            FROM (${roleIDsSubQuery}) AS story_role_ids
            WHERE (${condition1} OR ${condition2})
            AND user_ids && $1
            AND id = story_role_ids.story_id
        `;
        await db.execute(sql, [ userIDs ]);
    }

    /**
     * Mark stories as deleted if their lead authors are those specified
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
                const userIDs = _.map(objects, 'id');
                const criteria = {
                    lead_author_id: userIDs,
                    deleted: false,
                };
                const stories = await this.updateMatching(db, schema, criteria, { deleted: true });
                await Bookmark.deleteAssociated(db, schema, { story: stories });
                await Notification.deleteAssociated(db, schema, { story: stories });
            }
        }
    }

    /**
     * Clear deleted flag of stories beloging to specified users
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
                const userIDs = _.map(objects, 'id');
                const criteria = {
                    lead_author_id: userIDs,
                    deleted: true,
                    // don't restore stories that were manually deleted
                    suppressed: false,
                };
                const stories = await this.updateMatching(db, schema, criteria, { deleted: false });
                await Bookmark.restoreAssociated(db, schema, { story: stories });
                await Notification.restoreAssociated(db, schema, { story: stories });
            }
        }
    }
}

const instance = new Story;

export {
    instance as default,
    Story,
};
