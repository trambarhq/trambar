var _ = require('lodash');
var Promise = require('bluebird');
var HttpError = require('errors/http-error');
var Data = require('accessors/data');
var Project = require('accessors/project');

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
                request_project_ids int[],
                hidden boolean NOT NULL DEFAULT false,
                approved boolean NOT NULL DEFAULT true,
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
            GRANT INSERT, SELECT, UPDATE, DELETE ON ${table} TO client_role;
        `;
        return db.execute(sql).return(true);
    },

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
     *
     * @return {Promise<Object>}
     */
    export: function(db, schema, rows, credentials) {
        return Promise.map(rows, (row) => {
            var object = {
                id: row.id,
                gn: row.gn,
                details: row.details,
                type: row.type,
                username: row.username,
                role_ids: row.role_ids,
            };
            if (credentials.unrestricted) {
                object.server_id = row.server_id;
                object.external_id = row.external_id;
                object.approved = row.approved;
                object.hidden = row.hidden;
                object.requested_project_id = row.requested_project_ids;
            } else {
                // don't export these unless they're not their usual values
                if (!row.approved) {
                    object.approved = row.approved;
                }
                if (row.hidden) {
                    object.hidden = row.hidden;
                }
            }
            return object;
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
     *
     * @return {Promise<Array>}
     */
    import: function(db, schema, objects, originals, credentials) {
        return Data.import.call(this, db, schema, objects, originals, credentials).map((object, index) => {
            var original = originals[index];
            if (!credentials.unrestricted) {
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
            }
            if (object.approved) {
                // clear the list of requested projects
                object = _.clone(object);
                object.requested_project_ids = null;
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
        var newProjectMemberIds = {};
        _.each(objects, (object, index) => {
            var original = originals[index];
            var row = rows[index];
            if (object.approved) {
                var projectIds = object.requested_project_ids;
                if (!projectIds) {
                    // get the list of ids from the original row
                    if (original) {
                        projectIds = original.requested_project_ids;
                    }
                }
                _.each(projectIds, (projectId) => {
                    var ids = newProjectMemberIds[projectId];
                    if (ids) {
                        ids.push(row.id);
                    } else {
                        newProjectMemberIds[projectId] = [ row.id ];
                    }
                });
            }
        });
        if (_.isEmpty(newProjectMemberIds)) {
            return Promise.resolve();
        }
        // update user_ids column in project table
        var criteria = {
            id: _.map(_.keys(newProjectMemberIds), parseInt)
        };
        return Project.find(db, schema, criteria, 'id, user_ids').then((projects) => {
            _.each(projects, (project) => {
                project.user_ids = _.union(project.user_ids, newProjectMemberIds[project.id]);
            });
            return Project.update(db, schema, projects);
        }).return();
    },
});
