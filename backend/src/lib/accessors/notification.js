import _ from 'lodash';
import Promise from 'bluebird';
import Moment from 'moment';
import Data from 'accessors/data';
import HTTPError from 'errors/http-error';

const Notification = _.create(Data, {
    schema: 'both',
    table: 'notification',
    columns: {
        id: Number,
        gn: Number,
        deleted: Boolean,
        ctime: String,
        mtime: String,
        details: Object,
        type: String,
        story_id: Number,
        reaction_id: Number,
        user_id: Number,
        target_user_id: Number,
        seen: Boolean,
        suppressed: Boolean,
    },
    criteria: {
        id: Number,
        deleted: Boolean,
        type: String,
        story_id: Number,
        reaction_id: Number,
        user_id: Number,
        target_user_id: Number,
        seen: Boolean,
        suppressed: Boolean,

        time_range: String,
        newer_than: String,
        older_than: String,
        search: Object,
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
                type varchar(32) NOT NULL,
                story_id int NOT NULL DEFAULT 0,
                reaction_id int NOT NULL DEFAULT 0,
                user_id int NOT NULL DEFAULT 0,
                target_user_id int NOT NULL,
                seen boolean NOT NULL DEFAULT false,
                suppressed boolean NOT NULL DEFAULT false,
                PRIMARY KEY (id)
            );
            CREATE INDEX ON ${table} (target_user_id) WHERE deleted = false;
            CREATE INDEX ON ${table} (id) WHERE seen = false AND deleted = false;
        `;
        return db.execute(sql);
    },

    /**
     * Upgrade table in schema to given DB version (from one version prior)
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Number} version
     *
     * @return {Promise<Boolean>}
     */
    upgrade: function(db, schema, version) {
        if (version === 2) {
            // adding: suppressed
            var table = this.getTableName(schema);
            var sql = `
                ALTER TABLE ${table}
                ADD COLUMN IF NOT EXISTS
                suppressed boolean NOT NULL DEFAULT false;
            `;
            return db.execute(sql).return(true);
        }
        return Promise.resolve(false);
    },

    /**
     * Attach triggers to the table.
     *
     * @param  {Database} db
     * @param  {String} schema
     *
     * @return {Promise<Boolean>}
     */
    watch: function(db, schema) {
        return this.createChangeTrigger(db, schema).then(() => {
            var propNames = [ 'ctime', 'deleted', 'type', 'story_id', 'reaction_id', 'user_id', 'target_user_id', 'seen' ];
            return this.createNotificationTriggers(db, schema, propNames);
        });
    },

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
    apply: function(db, schema, criteria, query) {
        var special = [
            'time_range',
            'newer_than',
            'older_than',
            'search',
        ];
        Data.apply.call(this, _.omit(criteria, special), query);

        var params = query.parameters;
        var conds = query.conditions;
        if (criteria.time_range !== undefined) {
            conds.push(`ctime <@ $${params.push(criteria.time_range)}::tsrange`);
        }
        if (criteria.newer_than !== undefined) {
            conds.push(`ctime > $${params.push(criteria.newer_than)}`);
        }
        if (criteria.older_than !== undefined) {
            conds.push(`ctime < $${params.push(criteria.older_than)}`);
        }
        if (criteria.search) {
            // TODO
            //return this.applyTextSearch(db, schema, criteria.search, query);
        }
        return Promise.resolve();
    },

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
    export: function(db, schema, rows, credentials, options) {
        return Data.export.call(this, db, schema, rows, credentials, options).then((objects) => {
            _.each(objects, (object, index) => {
                var row = rows[index];
                object.ctime = row.ctime;
                object.type = row.type;
                object.details = row.details;
                object.seen = row.seen;
                if (row.story_id) {
                    object.story_id = row.story_id;
                }
                if (row.reaction_id) {
                    object.reaction_id = row.reaction_id;
                }
                if (row.user_id) {
                    object.user_id = row.user_id;
                }
                object.target_user_id = row.target_user_id;
            });
            return objects;
        });
    },

    /**
     * See if a database change event is relevant to a given user
     *
     * @param  {Object} event
     * @param  {User} user
     * @param  {Subscription} subscription
     *
     * @return {Boolean}
     */
    isRelevantTo: function(event, user, subscription) {
        if (Data.isRelevantTo.call(this, event, user, subscription)) {
            if (event.current.target_user_id === user.id) {
                return true;
            }
        }
        return false;
    },

    /**
     * Throw an exception if modifications aren't permitted
     *
     * @param  {Object} notificationReceived
     * @param  {Object} notificationBefore
     * @param  {Object} credentials
     */
    checkWritePermission: function(notificationReceived, notificationBefore, credentials) {
        if (notificationBefore.target_user_id !== credentials.user.id) {
            // can't modify an object that doesn't belong to the user
            throw new HTTPError(400);
        }
    },

    /**
     * Mark notifications associated with stories or reactions as deleted
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object} associations
     *
     * @return {Promise}
     */
    deleteAssociated: function(db, schema, associations) {
        var promises = _.mapValues(associations, (objects, type) => {
            if (_.isEmpty(objects)) {
                return;
            }
            if (type === 'story') {
                var criteria = {
                    story_id: _.map(objects, 'id'),
                    deleted: false,
                };
                return this.updateMatching(db, schema, criteria, { deleted: true });
            } else if (type === 'reaction') {
                var criteria = {
                    reaction_id: _.map(objects, 'id'),
                    deleted: false,
                };
                return this.updateMatching(db, schema, criteria, { deleted: true });
            }
        });
        return Promise.props(promises);
    },

    /**
     * Mark notifications associated with stories or reactions as deleted
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object} associations
     *
     * @return {Promise}
     */
    restoreAssociated: function(db, schema, associations) {
        var promises = _.mapValues(associations, (objects, type) => {
            if (_.isEmpty(objects)) {
                return;
            }
            if (type === 'story') {
                var criteria = {
                    story_id: _.map(objects, 'id'),
                    deleted: true,
                    suppressed: false,
                };
                return this.updateMatching(db, schema, criteria, { deleted: false });
            } else if (type === 'reaction') {
                var criteria = {
                    reaction_id: _.map(objects, 'id'),
                    deleted: true,
                    suppressed: false,
                };
                return this.updateMatching(db, schema, criteria, { deleted: false });
            }
        });
        return Promise.props(promises);
    },
});

export {
    Notification as default,
    Notification,
};
