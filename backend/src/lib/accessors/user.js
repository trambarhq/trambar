var _ = require('lodash');
var Promise = require('bluebird');
var HTTPError = require('errors/http-error').default;
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
        settings: Object,
        external: Array(Object),
        exchange: Array(Object),
        itime: String,
        etime: String,
    },
    criteria: {
        id: Number,
        deleted: Boolean,
        type: String,
        username: String,
        email: String,
        role_ids: Array(Number),
        requested_project_ids: Array(Number),
        disabled: Boolean,

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
                username varchar(128) NOT NULL,
                role_ids int[] NOT NULL DEFAULT '{}'::int[],
                requested_project_ids int[],
                disabled boolean NOT NULL DEFAULT false,
                settings jsonb NOT NULL DEFAULT '{}',
                external jsonb[] NOT NULL DEFAULT '{}',
                exchange jsonb[] NOT NULL DEFAULT '{}',
                itime timestamp,
                etime timestamp,
                PRIMARY KEY (id)
            );
            CREATE UNIQUE INDEX ON ${table} (username) WHERE deleted = false;
            CREATE INDEX ON ${table} ((details->>'email')) WHERE details ? 'email';
            CREATE INDEX ON ${table} USING gin(("payloadTokens"(details))) WHERE "payloadTokens"(details) IS NOT NULL;
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
        // TODO revoke INSERT and UPDATE of column 'type'
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
            var propNames = [ 'deleted', 'requested_project_ids', 'external', 'mtime', 'itime', 'etime' ];
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
                    object.disabled = row.disabled;
                    object.requested_project_ids = row.requested_project_ids;
                    object.settings = row.settings;
                } else {
                    // user settings can only be seen by the user himself
                    if (row.id === credentials.user.id) {
                        object.settings = row.settings;
                        object.requested_project_ids = row.requested_project_ids;
                    } else {
                        // don't let guests see contact info
                        if (credentials.user.type === 'guest') {
                            var contactInfo = [
                                'phone',
                                'email',
                                'skype_username',
                                'ichat_username',
                                'twitter_username',
                            ];
                            object.details = _.omit(object.details, contactInfo);
                        }
                    }

                    // don't export these unless they're not their usual values
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
            if (userBefore && !userBefore.deleted && !_.isEmpty(userReceived.requested_project_ids)) {
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
            return this.ensureUniqueName(db, schema, userBefore, userReceived, 'username');
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
            if (event.id === user.id) {
                return true;
            } else {
                var columns = _.keys(event.diff);
                var publicColumns = _.without(columns, 'settings');
                if (!_.isEmpty(publicColumns)) {
                    return true;
                }
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
     * @param  {Object} userReceived
     * @param  {Object} userBefore
     * @param  {Object} credentials
     */
    checkWritePermission: function(userReceived, userBefore, credentials) {
        if (credentials.unrestricted) {
            return;
        }
        if (!userBefore) {
            // normal user cannot create new user
            throw new HTTPError(403);
        }
        if (userBefore.id !== credentials.user.id) {
            // user cannot modify someone else
            throw new HTTPError(403);
        }
        if (userReceived.deleted || userReceived.disabled) {
            // users cannot delete themselves
            throw new HTTPError(400);
        }
        if (userBefore.deleted) {
            // cannot modified a deleted user
            throw new HTTPError(400);
        }
        if (userReceived.type !== userBefore.type) {
            // user cannot change his own type
            throw new HTTPError(403);
        }
        if (!_.isEqual(userReceived.role_ids, userBefore.role_ids)) {
            // user cannot change his roles
            throw new HTTPError(403);
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
     * @return {Promise}
     */
     associate: function(db, schema, objects, originals, rows, credentials) {
         return Promise.all([
             this.updateMemberList(db, schema, objects, originals, rows),
             this.updateStoryRoles(db, schema, originals, rows),
             this.updateContentDeletion(db, schema, originals, rows),
         ]);
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
            var projectAfter = {
                id: project.id,
                user_ids: _.union(project.user_ids, newUserIds),
            };
            return Project.updateOne(db, schema, projectAfter);
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

    /**
     * Update deleted flag of stories when user is deleted or undeleted
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<Object>} usersBefore
     * @param  {Array<Object>} usersAfter
     *
     * @return {Promise}
     */
    updateContentDeletion: function(db, schema, usersBefore, usersAfter) {
        return Promise.try(() => {
            var deletedUsers = _.filter(usersAfter, (userAfter, index) => {
                var userBefore = usersAfter[index];
                if (userBefore) {
                    return userAfter.deleted && !userBefore.deleted;
                }
            });
            var undeletedUsers = _.filter(usersAfter, (userAfter, index) => {
                var userBefore = usersAfter[index];
                if (userBefore) {
                    return !userAfter.deleted && userBefore.deleted;
                }
            });
            if (_.isEmpty(deletedUsers) && _.isEmpty(undeletedUsers)) {
                return;
            }

            var Project = require('accessors/project');
            var Story = require('accessors/story');
            var Reaction = require('accessors/reaction');
            // go through each project
            var criteria = { deleted: false };
            return Project.find(db, schema, criteria, 'name').each((project) => {
                var contentSchema = project.name;
                return Promise.all([
                    Story.deleteAssociated(db, contentSchema, { user: deletedUsers }),
                    Story.restoreAssociated(db, contentSchema, { user: undeletedUsers }),
                    Reaction.deleteAssociated(db, contentSchema, { user: deletedUsers }),
                    Reaction.restoreAssociated(db, contentSchema, { user: undeletedUsers }),
                ]);
            });
        });
    },
});
