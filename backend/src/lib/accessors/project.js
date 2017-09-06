var _ = require('lodash');
var Promise = require('bluebird');
var Data = require('accessors/data');

module.exports = _.create(Data, {
    schema: 'global',
    table: 'project',
    columns: {
        id: Number,
        gn: Number,
        deleted: Boolean,
        ctime: String,
        mtime: String,
        details: Object,
        name: String,
        repo_ids: Array(Number),
        user_ids: Array(Number),
        settings: Object,
    },
    criteria: {
        id: Number,
        deleted: Boolean,
        name: String,
        repo_ids: Array(Number),
        user_ids: Array(Number),
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
                name varchar(64) NOT NULL DEFAULT '',
                repo_ids int[] NOT NULL DEFAULT '{}'::int[],
                user_ids int[] NOT NULL DEFAULT '{}'::int[],
                settings jsonb NOT NULL DEFAULT '{}',
                PRIMARY KEY (id)
            );
        `;
        return db.execute(sql);
    },

    /**
     * Grant privileges to table to appropriate Postgres users
     *
     * @param  {Database} db
     * @param  {String} schema
     *
     * @return {Promise<Boolean>}
     */
    grant: function(db, schema) {
        var table = this.getTableName(schema);
        var sql = `
            GRANT SELECT ON ${table} TO auth_role;
            GRANT INSERT, SELECT, UPDATE, DELETE ON ${table} TO admin_role;
            GRANT SELECT, UPDATE ON ${table} TO client_role;
        `;
        return db.execute(sql).return(true);
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
        return Data.export.call(this, db, schema, rows, credentials, options).then((objects) => {
            var user = credentials.user;
            objects = _.filter(objects, (object, index) => {
                var row = rows[index];
                var accessible = false;
                if (credentials.unrestricted) {
                    accessible = true;
                } else if (_.includes(row.user_ids, user.id)) {
                    accessible = true;
                } else {
                    if (user.type === 'admin') {
                        accessible = true;
                    } else {
                        var ms = _.get(row, 'settings.membership', {});
                        var ac = _.get(row, 'settings.access_control', {});
                        if (ms.allow_request) {
                            if (user.type === 'member') {
                                accessible = !!ac.grant_team_members_read_only;
                            } else if (user.approved) {
                                accessible = !!ac.grant_approved_users_read_only;
                            } else {
                                accessible = !!ac.grant_unapproved_users_read_only;
                            }
                        }
                    }
                }
                if (accessible) {
                    object.name = row.name;
                    object.repo_ids = row.repo_ids;
                    object.user_ids = row.user_ids;
                    if (credentials.unrestricted) {
                        object.settings = row.settings;
                    } else {
                        object.settings = _.pick(row.settings, 'access_control');
                    }
                    return true;
                } else {
                    return false;
                }
            });
            return objects;
        });
    },

    /**
     * Create associations between newly created or modified rows with
     * rows in other tables
     *
     * @param  {Database} db
     * @param  {Schema} schema
     * @param  {Array<Object>} objects
     * @param  {Array<Object>} originals
     * @param  {Array<Object>} rows
     * @param  {Object} credentials
     *
     * @return {Promise<Array>}
     */
    associate: function(db, schema, objects, originals, rows, credentials) {
        // remove ids from requested_project_ids of users who've just joined
        // first, obtain ids of projects that new members are added to
        var newUserMemberships = {};
        _.each(objects, (object, index) => {
            var original = originals[index];
            var row = rows[index];
            if (object.user_ids) {
                var newUserIds = (original)
                               ? _.difference(row.user_ids, original.user_ids)
                               : row.user_ids;
                _.each(newUserIds, (userId) => {
                    var ids = newUserMemberships[userId];
                    if (ids) {
                        ids.push(row.id);
                    } else {
                        newUserMemberships[userId] = [ row.id ];
                    }
                });
            }
        });
        if (_.isEmpty(newUserMemberships)) {
            return Promise.resolve();
        }
        // load the users and update requested_project_ids column
        var User = require('accessors/user');
        var criteria = {
            id: _.map(_.keys(newUserMemberships), parseInt)
        };
        return User.find(db, schema, criteria, 'id, requested_project_ids').then((users) => {
            _.each(users, (user) => {
                user.requested_project_ids = _.difference(user.requested_project_ids, newUserMemberships[user.id]);
                if (_.isEmpty(user.requested_project_ids)) {
                    user.requested_project_ids = null;
                }
            });
            return User.update(db, schema, users);
        }).return();

    },
});
