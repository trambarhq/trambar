var _ = require('lodash');
var Promise = require('bluebird');
var HTTPError = require('errors/http-error');
var ExternalData = require('accessors/external-data');

module.exports = _.create(ExternalData, {
    schema: 'global',
    table: 'user',
    columns: {
        id: Number,
        gn: Number,
        deleted: Boolean,
        ctime: String,
        mtime: String,
        details: Object,
        type: String,
        username: String,
        role_ids: Array(Number),
        requested_project_ids: Array(Number),
        disabled: Boolean,
        hidden: Boolean,
        settings: Object,
        external: Array(Object),
    },
    criteria: {
        id: Number,
        deleted: Boolean,
        type: String,
        username: String,
        role_ids: Array(Number),
        requested_project_ids: Array(Number),
        disabled: Boolean,
        hidden: Boolean,

        external_object: Object,
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
                username varchar(128),
                role_ids int[] NOT NULL DEFAULT '{}'::int[],
                requested_project_ids int[],
                hidden boolean NOT NULL DEFAULT false,
                disabled boolean NOT NULL DEFAULT false,
                settings jsonb NOT NULL DEFAULT '{}',
                external jsonb[] NOT NULL DEFAULT '{}',
                PRIMARY KEY (id)
            );
            CREATE UNIQUE INDEX ON ${table} (username) WHERE deleted = false;
            CREATE INDEX ON ${table} ((details->>'email')) WHERE details ? 'email';
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
            GRANT INSERT, SELECT, UPDATE ON ${table} TO auth_role;
            GRANT INSERT, SELECT, UPDATE ON ${table} TO admin_role;
            GRANT SELECT, UPDATE ON ${table} TO client_role;
        `;
        return db.execute(sql).return(true);
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
            var propNames = [ 'deleted', 'external' ];
            return this.createNotificationTriggers(db, schema, propNames).then(() => {
                return this.createResourceCoalescenceTrigger(db, schema, []).then(() => {
                    var Task = require('accessors/task');
                    return Task.createUpdateTrigger(db, schema, 'updateUser', 'updateResource', [ this.table ]);
                });
            });
        });
    },

    /**
     * Add conditions to SQL query based on criteria object
     *
     * @param  {Object} criteria
     * @param  {Object} query
     */
    apply: function(criteria, query) {
        var special = [
            'email',
        ];
        ExternalData.apply.call(this, _.omit(criteria, special), query);

        var params = query.parameters;
        var conds = query.conditions;
        if (criteria.email !== undefined) {
            conds.push(`details->>'email' = $${params.push(criteria.email)}`);
        }
    },

    /**
     * Insert row, appending a number if a username conflict occurs
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {user} object
     *
     * @return {Promise<Object>}
     */
    insertUnique: function(db, schema, user) {
        return this.insertOne(db, schema, user).catch((err) => {
            // unique violation
            if (err.code === '23505') {
                user = _.clone(user);
                var m = /(.*)(\d+)$/.exec(user.username);
                if (m) {
                    var number = parseInt(m[2]);
                    user.username = m[1] + (number + 1);
                } else {
                    user.username += '2';
                }
                return this.insertUnique(db, schema, user);
            }
            throw err;
        });
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
        return ExternalData.export.call(this, db, schema, rows, credentials, options).then((objects) => {
            _.each(objects, (object, index) => {
                var row = rows[index];
                object.type = row.type;
                object.username = row.username;
                object.role_ids = row.role_ids;
                if (credentials.unrestricted) {
                    object.hidden = row.hidden;
                    object.disabled = row.disabled;
                    object.requested_project_ids = row.requested_project_ids;
                    object.settings = row.settings;
                } else {
                    // user settings can only be seen by the user himself
                    if (row.id === credentials.user.id) {
                        object.settings = row.settings;
                        object.requested_project_ids = row.requested_project_ids;
                    }
                    // don't export these unless they're not their usual values
                    if (row.hidden) {
                        object.hidden = row.hidden;
                    }
                    if (row.disabled) {
                        object.disabled = row.disabled;
                    }
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
        return ExternalData.import.call(this, db, schema, objects, originals, credentials).mapSeries((userReceived, index) => {
            var userBefore = originals[index];
            this.checkWritePermission(userReceived, userBefore, credentials);
            if (_.isEmpty(userReceived.requested_project_ids)) {
                // remove ids of projects that'd accept the user automatically
                // as well as those that can't be joined
                var Project = require('accessors/project');
                var projectIds = userReceived.requested_project_ids;
                var criteria = { id: projectIds, deleted: false };
                return Project.find(db, schema, criteria, 'id, settings').then((projects) => {
                    projectIds = _.filter(projectIds, (projectId) => {
                        var project = _.find(projects, { id: projectId });
                        if (this.canJoin(userReceived, project)) {
                            if (this.canJoinAutomatically(userReceived, project)) {
                                return false;
                            } else {
                                return true;
                            }
                        } else {
                            return false;
                        }
                    });
                    if (_.isEmpty(projectIds)) {
                        projectIds = null;
                    }
                    userReceived.requested_project_ids = projectIds;
                    return userReceived;
                });
            }
            return userReceived;
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
        if (ExternalData.isRelevantTo.call(this, event, user, subscription)) {
            var columns = _.keys(event.diff);
            var publicColumns = _.without(columns, 'settings');
            if (!_.isEmpty(publicColumns)) {
                return true;
            }
        }
        return false;
    },

    /**
     * Return true if user can join project
     *
     * @param  {User} user
     * @param  {Project} project
     *
     * @return {Boolean}
     */
    canJoin: function(user, project) {
        if (!project) {
            return false;
        }
        if (user.type === 'guest') {
            return !!_.get(project, 'settings.membership.allow_guest_request');
        } else {
            return !!_.get(project, 'settings.membership.allow_user_request');
        }
    },

    /**
     * Return true if user would be accepted into project automatically
     *
     * @param  {User} user
     * @param  {Project} project
     *
     * @return {Boolean}
     */
    canJoinAutomatically: function(user, project) {
        if (_.includes(project.user_ids, user.id)) {
            // user is already a member
            return true;
        }
        if (user.type === 'guest') {
            return !!_.get(project, 'settings.membership.approve_guest_request');
        } else {
            return !!_.get(project, 'settings.membership.approve_user_request');
        }
    },

    /**
     * Throw an exception if modifications aren't permitted
     *
     * @param  {Object} storyReceived
     * @param  {Object} storyBefore
     * @param  {Object} credentials
     */
    checkWritePermission: function(userReceived, userBefore, credentials) {
        if (credentials.unrestricted) {
            return;
        }
        if (!userBefore) {
            // normal user cannot create new user
            throw new HTTPError(400);
        }
        if (userBefore.id !== credentials.user.id) {
            // user cannot modify someone else
            throw new HTTPError(400);
        }
        if (userBefore.deleted) {
            // cannot modified a deleted user
            throw new HTTPError(400);
        }
        if (userReceived.deleted) {
            // users cannot delete themselves
            throw new HTTPError(400);
        }
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
     associate: function(db, schema, objects, originals, rows, credentials) {
         return this.updateMemberList(db, schema, objects, originals, rows).then(() => {
             return this.updateStoryRoles(db, schema, originals, rows);
         });
     },

    /**
     * Add users to projects
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<Object>} usersReceived
     * @param  {Array<Object>} usersBefore
     * @param  {Array<Object>} usersAfter
     *
     * @return {Promise}
     */
    updateMemberList: function(db, schema, usersReceived, usersBefore, usersAfter) {
        var newMembers = {};
        _.each(usersReceived, (userReceived, index) => {
            // the project ids removed earlier by import() are the ones that
            // can be joined automatically
            var userAfter = usersAfter[index];
            var projectIds = _.difference(userReceived.requested_project_ids, userAfter.requested_project_ids);
            _.each(projectIds, (projectId) => {
                var members = newMembers[projectId];
                if (!members) {
                    members = newMembers[projectId] = [];
                }
                members.push(userAfter);
            });
        });
        if (_.isEmpty(newMembers)) {
            return Promise.resolve();
        }
        var Project = require('accessors/project');
        var projectIds = _.map(_.keys(newMembers), parseInt);
        var criteria = { id: projectIds, deleted: false };
        // update user_ids column in project table
        return Project.find(db, schema, criteria, 'id, user_ids, settings').each((project) => {
            var newProjectMembers = _.filter(newMembers[project.id], (user) => {
                return this.canJoin(user, project) && this.canJoinAutomatically(user, project);
            });
            var newUserIds = _.map(newProjectMembers, 'id');
            project.user_ids = _.union(project.user_ids, newUserIds);
            return Project.update(db, schema, project);
        });
    },

    /**
     * Update stories of users when they acquire new roles (or lose them)
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<Object>} usersBefore
     * @param  {Array<Object>} usersAfter
     *
     * @return {Promise}
     */
    updateStoryRoles: function(db, schema, usersBefore, usersAfter) {
        var usersWithRoleChanges = _.filter(usersBefore, (userBefore, index) => {
            if (userBefore) {
                var userAfter = usersAfter[index];
                if (!_.isEmpty(_.xor(userBefore.role_ids, userAfter.role_ids))) {
                    return true;
                }
            }
        });
        if (_.isEmpty(usersWithRoleChanges)) {
            return Promise.resolve();
        }

        // find projects the users belongs to
        var Project = require('accessors/project');
        var userIds = _.map(usersWithRoleChanges, 'id');
        var criteria = { user_ids: userIds, deleted: false };
        return Project.find(db, schema, criteria, 'name').each((project) => {
            var Story = require('accessors/story');
            return Story.updateUserRoles(db, project.name, userIds);
        });
    },
});
