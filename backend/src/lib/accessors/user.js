var _ = require('lodash');
var Promise = require('bluebird');
var HttpError = require('errors/http-error');
var Data = require('accessors/data');

module.exports = _.create(Data, {
    schema: 'global',
    table: 'user',
    columns: {
        id: Number,
        gn: Number,
        ctime: String,
        mtime: String,
        details: Object,
        type: String,
        username: String,
        role_ids: Array(Number),
        server_id: Number,
        external_id: Number,
        requested_project_ids: Array(Number),
        approved: Boolean,
        hidden: Boolean,
        settings: Object,
    },
    criteria: {
        id: Number,
        type: String,
        username: String,
        role_ids: Array(Number),
        server_id: Number,
        external_id: Number,
        requested_project_ids: Array(Number),
        approved: Boolean,
        hidden: Boolean,
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
                server_id int,
                external_id bigint,
                requested_project_ids int[],
                hidden boolean NOT NULL DEFAULT false,
                approved boolean NOT NULL DEFAULT true,
                settings jsonb NOT NULL DEFAULT '{}',
                PRIMARY KEY (id)
            );
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
            GRANT INSERT, SELECT, UPDATE, DELETE ON ${table} TO auth_role;
            GRANT INSERT, SELECT, UPDATE, DELETE ON ${table} TO admin_role;
            GRANT SELECT, UPDATE  ON ${table} TO client_role;
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
        var special = [ 'email' ];
        Data.apply.call(this, _.omit(criteria, special), query);

        var params = query.parameters;
        var conds = query.conditions;
        if (criteria.email !== undefined) {
            conds.push(`details->>'email' = $${params.push(criteria.email)}`);
        }
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
            _.each(objects, (object, index) => {
                var row = rows[index];
                object.type = row.type;
                object.username = row.username;
                object.role_ids = row.role_ids;

                if (credentials.unrestricted) {
                    object.server_id = row.server_id;
                    object.external_id = row.external_id;
                    object.approved = row.approved;
                    object.hidden = row.hidden;
                    object.requested_project_ids = row.requested_project_ids;
                    object.settings = row.settings;
                } else {
                    // user settings can only be seen by the user himself
                    if (row.id === credentials.user.id) {
                        object.settings = row.settings;
                        object.requested_project_ids = row.requested_project_ids;
                    }
                    // don't export these unless they're not their usual values
                    if (!row.approved) {
                        object.approved = row.approved;
                    }
                    if (row.hidden) {
                        object.hidden = row.hidden;
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
     * @param  {Schema} schema
     * @param  {Array<Object>} objects
     * @param  {Array<Object>} originals
     * @param  {Object} credentials
     * @param  {Object} options
     *
     * @return {Promise<Array>}
     */
    import: function(db, schema, objects, originals, credentials, options) {
        return Data.import.call(this, db, schema, objects, originals, credentials).then((objects) => {
            _.each(objects, (userReceived, index) => {
                var userBefore = originals[index];
                this.checkWritePermission(userReceived, userBefore, credentials);

                if (credentials.unrestricted) {
                    if (userReceived.approved) {
                        // clear the list of requested projects
                        userReceived = _.clone(userReceived);
                        userReceived.requested_project_ids = null;
                    }
                }
            });
            return objects;
        });
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
            throw new HttpError(400);
        }
        if (userBefore.id !== credentials.user.id) {
            // user cannot modify someone else
            throw new HttpError(400);
        }
        if (userBefore.deleted) {
            // cannot modified a deleted user
            throw new HttpError(400);
        }
        if (userReceived.deleted) {
            // users cannot delete themselves
            throw new HttpError(400);
        }
        if (userReceived.approved) {
            // user cannot approve himself
            throw new HttpError(400);
        }
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
     * @return {Promise}
     */
     associate: function(db, schema, objects, originals, rows, credentials) {
         return this.updateMemberList(db, schema, objects, originals, rows).then(() => {
             return this.updateStoryRoles(db, schema, originals, rows);
         });
     },

    /**
     * Add newly approved users as well as those meeting auto-acceptance
     * criteria to projects they've requested
     *
     * @param  {Database} db
     * @param  {Schema} schema
     * @param  {Array<Object>} usersReceived
     * @param  {Array<Object>} usersBefore
     * @param  {Array<Object>} usersAfter
     *
     * @return {Promise}
     */
     updateMemberList: function(db, schema, usersReceived, usersBefore, usersAfter) {
        var actions = [];
        _.each(usersReceived, (userReceived, index) => {
            var userBefore = usersBefore[index];
            var userAfter = usersAfter[index];
            var userId = userAfter.id;
            // user.approved can only be set by an admin
            // an error would occur earlier if the current user isn't an admin
            if (userReceived.approved) {
                // use list from the object received from client side, in case
                // the approver changed the list
                var projectIds = userReceived.requested_project_ids
                if (!projectIds) {
                    // get the list of ids from the original row
                    // (since import() has cleared requested_project_ids)
                    if (userBefore) {
                        projectIds = userBefore.requested_project_ids;
                    }
                }
                _.each(projectIds, (projectId) => {
                    actions.push({ type: 'add-always', projectId, userId });
                });
            } else {
                var projectIds = userAfter.requested_project_ids;
                _.each(projectIds, (projectId) => {
                    if (userAfter.type === 'member' || userAfter.type === 'admin') {
                        actions.push({ type: 'add-if-members-allowed', projectId, userId });
                    } else if (userAfter.approved) {
                        actions.push({ type: 'add-if-approved-users-allowed', projectId, userId });
                    }
                });
            }
        });
        if (_.isEmpty(actions)) {
            return Promise.resolve();
        }
        // update user_ids column in project table
        var Project = require('accessors/project');
        var criteria = {
            id: _.uniq(_.map(actions, 'projectId'))
        };
        return Project.find(db, schema, criteria, 'id, user_ids, settings').then((projects) => {
            // see which project need be updated
            var updatedProjects = _.filter(projects, (project) => {
                // get the actions for this project
                var projectActions = _.filter(actions, { projectId: project.id });
                var projectChanged = false;
                _.each(projectActions, (action) => {
                    // check the project's settings to see if user should be added
                    var adding = false;
                    var membership = project.settings.membership || {};
                    switch (action.type) {
                        case 'add-always':
                            adding = true;
                            break;
                        case 'add-if-members-allowed':
                            adding = !!membership.accept_team_member_automatically;
                            break;
                        case 'add-if-approved-users-allowed':
                            adding = !!membership.accept_approved_users_automaticlly;
                            break;
                    }
                    if (adding) {
                        project.user_ids = _.union(project.user_ids, [ action.userId ]);
                        projectChanged = true;
                    }
                });
                return projectChanged;
            });
            if (!_.isEmpty(updatedProjects)) {
                return Project.update(db, schema, updatedProjects).return();
            }
        });
    },

    /**
     * Update stories of users when they acquire new roles (or lose them)
     *
     * @param  {Database} db
     * @param  {Schema} schema
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
         var criteria = {
             user_ids: userIds,
             deleted: false,
         };
         return Project.find(db, schema, criteria, 'name').each((project) => {
             var Story = require('accessors/story');
            return Story.updateUserRoles(db, project.name, userIds);
         });
     },

    /**
     * Return false if the user has no access to system
     *
     * @param  {User} user
     *
     * @return {Boolean}
     */
    checkAccess: function(user) {
        if (!user || user.deleted) {
            return false;
        }
        return true;
    }
});
