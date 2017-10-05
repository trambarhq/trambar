var _ = require('lodash');
var Promise = require('bluebird');
var Data = require('accessors/data');
var HttpError = require('errors/http-error');

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
            CREATE INDEX ON ${table} USING gin(("payloadIds"(details))) WHERE "payloadIds"(details) IS NOT NULL;
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
            var Task = require('accessors/task');
            return Task.createUpdateTrigger(db, schema, 'updateProject', 'updateResource', [ this.table ]);
        });
    },

    /**
     * Add conditions to SQL query based on criteria object
     *
     * @param  {Object} criteria
     * @param  {Object} query
     */
    apply: function(criteria, query) {
        Data.apply.call(this, criteria, query);

        if (query.columns !== '*') {
            // filter() needs these columns to work
            query.columns += ', deleted, user_ids, settings';
        }
    },

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
    filter: function(db, schema, rows, credentials) {
        rows = _.filter(rows, (row) => {
            return this.checkAccess(row, credentials.user, 'know');
        });
        return Promise.resolve(rows);
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
                object.name = row.name;
                object.repo_ids = row.repo_ids;
                object.user_ids = row.user_ids;
                if (credentials.unrestricted) {
                    object.settings = row.settings;
                } else {
                    object.settings = _.pick(row.settings, 'access_control');
                }
            });
            return objects;
        });
    },

    /**
     * Import objects sent by client-side code, applying access control
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<Object>} objects
     * @param  {Array<Object>} originals
     * @param  {Object} credentials
     * @param  {Object} options
     *
     * @return {Promise<Array>}
     */
    import: function(db, schema, objects, originals, credentials, options) {
        return Data.import.call(this, db, schema, objects, originals, credentials).map((projectReceived, index) => {
            var projectBefore = originals[index];
            this.checkWritePermission(projectReceived, projectBefore, credentials);
            return projectReceived;
        });
    },

    /**
     * Throw if current user cannot make modifications
     *
     * @param  {[type]} projectReceived
     * @param  {[type]} projectBefore
     * @param  {[type]} credentials
     *
     * @return {[type]}
     */
    checkWritePermission: function(projectReceived, projectBefore, credentials) {
        if (!credentials.unrestricted) {
            throw new HttpError(400);
        }
    },

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
     * @return {Promise<Array>}
     */
    associate: function(db, schema, objects, originals, rows, credentials) {
        return this.updateNewMembers(db, schema, objects, originals, rows);
    },

    /**
     * Remove ids from requested_project_ids of users who've just joined
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<Object>} projectsReceived
     * @param  {Array<Object>} projectsBefore
     * @param  {Array<Object>} projectsAfter
     *
     * @return {Promise}
     */
    updateNewMembers: function(db, schema, projectsReceived, projectsBefore, projectsAfter) {
        // first, obtain ids of projects that new members are added to
        var newUserMemberships = {};
        _.each(projectsReceived, (projectReceived, index) => {
            var projectBefore = projectsBefore[index];
            var projectAfter = projectsAfter[index];
            if (projectReceived.user_ids) {
                var newUserIds = projectAfter.user_ids;
                if (projectBefore) {
                    newUserIds = _.difference(projectAfter.user_ids, projectBefore.user_ids);
                }
                _.each(newUserIds, (userId) => {
                    var ids = newUserMemberships[userId];
                    if (ids) {
                        ids.push(projectAfter.id);
                    } else {
                        newUserMemberships[userId] = [ projectAfter.id ];
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

    /**
     * Synchronize table with data sources
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object} criteria
     */
    sync: function(db, schema, criteria) {
        this.sendSyncNotification(db, schema, criteria);
    },

    /**
     * Add members to a project atomically
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Number} projectId
     * @param  {Array<Number>} userIds
     *
     * @return {Promise<Object>}
     */
    addMembers: function(db, schema, projectId, userIds) {
        var table = this.getTableName(schema);
        var params = [];
        var sql = `
            UPDATE ${table} SET user_ids = user_ids || $${params.push(userIds)}
            WHERE id = $${params.push(projectId)}
            RETURNING *
        `;
        return db.execute(sql, params);
    },

    /**
     * Return false if the user has no access to project
     *
     * Need these columns: deleted, user_ids, settings
     *
     * @param  {Project} project
     * @param  {User} user
     * @param  {String} access
     *
     * @return {Boolean}
     */
    checkAccess: function(project, user, access) {
        if (!project || project.deleted) {
            return false;
        }
        // project member and admins have full access
        if (_.includes(project.user_ids, user.id)) {
            return true;
        }
        if (user.type === 'admin') {
            return true;
        }

        // see if read-only access should be granted
        var ms = project.settings.membership;
        if (!ms) {
            return false;
        }
        if (access === 'know' || access === 'read') {
            // see if people can know about the project's existence
            if (user.type === 'member') {
                if (!ms.allow_request_from_team_members) {
                    return false;
                }
            } else if (user.type === 'guest') {
                if (user.approved) {
                    if (!ms.allow_request_from_approved_guests) {
                        return false;
                    }
                } else {
                    if (!ms.allow_request_from_unapproved_guests) {
                        return false;
                    }
                }
            } else {
                return false;
            }
            if (access == 'know') {
                return true;
            }
        }
        var ac = project.settings.access_control;
        if (!ac) {
            return false;
        }
        if (access === 'read') {
            if (!_.includes(user.requested_project_ids, project.id)) {
                // only users who wants to join the project can have
                // read-only access
                return false;
            }
            if (user.type === 'member') {
                if (!ac.grant_team_members_read_only) {
                    return false;
                }
            } else if(user.type === 'guest') {
                if (user.approved) {
                    if (!ac.grant_approved_users_read_only) {
                        return false;
                    }
                } else {
                    if (!ac.grant_unapproved_users_read_only) {
                        return false;
                    }
                }
            } else {
                return false;
            }
            return true;
        }
        return false;
    }
});
