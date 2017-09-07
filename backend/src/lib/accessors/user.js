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
            params.push(criteria.email);
            conds.push(`details->>'email' = $${params.length}`);
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
        return Data.import.call(this, db, schema, objects, originals, credentials).map((object, index) => {
            var original = originals[index];
            if (credentials.unrestricted) {
                if (object.approved) {
                    // clear the list of requested projects
                    object = _.clone(object);
                    object.requested_project_ids = null;
                }
            } else {
                if (!original) {
                    // normal user cannot create new user
                    throw new HttpError(403);
                }
                if (original.id !== credentials.user.id) {
                    // user cannot modify someone else
                    throw new HttpError(403);
                }
                if (original.deleted) {
                    // cannot modified a deleted user
                    throw new HttpError(403);
                }
                if (object.deleted) {
                    // users cannot delete themselves
                    throw new HttpError(403);
                }
                if (object.approved) {
                    // user cannot approve himself
                    throw new HttpError(403);
                }
            }
            return object;
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
        // look for newly approved users and add them to requested projects
        var actions = [];
        _.each(objects, (object, index) => {
            var original = originals[index];
            var row = rows[index];
            var userId = row.id;
            // user.approved can only be set by an admin
            // an error would occur earlier if the current user isn't an admin
            if (object.approved) {
                // use list from the object sent, in case changes were made
                var projectIds = object.requested_project_ids;
                if (!projectIds) {
                    // get the list of ids from the original row
                    // (since import() has cleared requested_project_ids)
                    if (original) {
                        projectIds = original.requested_project_ids;
                    }
                }
                _.each(projectIds, (projectId) => {
                    actions.push({ type: 'add-always', projectId, userId });
                });
            } else {
                var projectIds = row.requested_project_ids;
                _.each(projectIds, (projectId) => {
                    if (row.type === 'member' || row.type === 'admin') {
                        actions.push({ type: 'add-if-members-allowed', projectId, userId });
                    } else if (row.approved) {
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
});
