import _ from 'lodash';
import Promise from 'bluebird';
import Async from 'async-do-while';
import Data from 'accessors/data';
import Task from 'accessors/task';
import Repo from 'accessors/repo';
import User from 'accessors/user';
import HTTPError from 'errors/http-error';
import * as ProjectUtils from 'objects/utils/project-utils';

const Project = _.create(Data, {
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
        archived: Boolean,
    },
    criteria: {
        id: Number,
        deleted: Boolean,
        name: String,
        repo_ids: Array(Number),
        user_ids: Array(Number),
        archived: Boolean,
    },
    accessControlColumns: {
        user_ids: Array(Number),
        settings: Object,
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
                name varchar(128) NOT NULL DEFAULT '',
                repo_ids int[] NOT NULL DEFAULT '{}'::int[],
                user_ids int[] NOT NULL DEFAULT '{}'::int[],
                role_ids int[],
                settings jsonb NOT NULL DEFAULT '{}',
                archived boolean NOT NULL DEFAULT false,
                PRIMARY KEY (id)
            );
            CREATE UNIQUE INDEX ON ${table} (name) WHERE deleted = false;
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
        var table = this.getTableName(schema);
        var sql = `
            GRANT SELECT ON ${table} TO auth_role;
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
            var propNames = [ 'deleted', 'name', 'repo_ids', 'user_ids', 'archived' ];
            return this.createNotificationTriggers(db, schema, propNames).then(() => {
                return this.createResourceCoalescenceTrigger(db, schema, []).then(() => {
                    // completion of tasks will automatically update details->resources
                    return Task.createUpdateTrigger(db, schema, 'updateProject', 'updateResource', [ this.table ]);
                });
            });
        });
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
        if (!credentials.unrestricted) {
            rows = _.filter(rows, (row) => {
                return ProjectUtils.isVisibleToUser(row, credentials.user);
            });
        }
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
                    object.settings = _.pick(row.settings, 'membership', 'access_control');
                }
                if (row.archived) {
                    object.archived = row.archived;
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
        return Data.import.call(this, db, schema, objects, originals, credentials).mapSeries((projectReceived, index) => {
            var projectBefore = originals[index];
            if (projectReceived.name === 'global' || projectReceived.name === 'admin') {
                throw new HTTPError(409); // 409 conflict
            }
            if (!/^[\w\-]+$/.test(projectReceived.name)) {
                return new HTTPError(400);
            }
            this.checkWritePermission(projectReceived, projectBefore, credentials);

            if (projectReceived.repo_ids) {
                var newRepoIds = _.difference(projectReceived.repo_ids, projectBefore.repo_ids);
                if (!_.isEmpty(newRepoIds)) {
                    // add users with access to repos to project
                    var criteria = { id: newRepoIds, deleted: false };
                    return Repo.find(db, schema, criteria, 'user_ids').then((repos) => {
                        var userIds = _.uniq(_.flatten(_.map(repos, 'user_ids')));
                        var criteria = {
                            id: userIds,
                            disabled: false,
                            deleted: false,
                        };
                        return User.find(db, schema, criteria, 'id').then((users) => {
                            var newUserIds = _.map(users, 'id');
                            var existingUserIds = projectReceived.user_ids || projectBefore.user_ids;
                            projectReceived.user_ids = _.union(existingUserIds, newUserIds);
                            return projectReceived;
                        });
                    });
                }
            }
            return this.ensureUniqueName(db, schema, projectBefore, projectReceived);
        });
    },

    /**
     * Throw an exception if modifications aren't permitted
     *
     * @param  {Object} projectReceived
     * @param  {Object} projectBefore
     * @param  {Object} credentials
     */
    checkWritePermission: function(projectReceived, projectBefore, credentials) {
        if (credentials.unrestricted) {
            return;
        }
        throw new HTTPError(403);
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
        var newUserMemberships = {}, newMemberIds = [];
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
                        newMemberIds.push(userId);
                    }
                });
            }
        });
        if (_.isEmpty(newUserMemberships)) {
            return Promise.resolve();
        }
        // load the users and update requested_project_ids column
        var criteria = { id: newMemberIds };
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

    getSignature: function(db, schema, credentials) {
        var signature;
        var attempts = 0;
        Async.do(() => {
            if (!/^[\w\-]+$/.test(schema)) {
                return Promise.resolve(new HTTPError(404));
            }
            var table = `"${schema}"."meta"`;
            var sql = `SELECT signature FROM ${table} LIMIT 1`;
            return db.query(sql).then((rows) => {
                if (_.isEmpty(rows)) {
                    throw new HTTPError(404);
                }
                var tokens = [];
                tokens.push(rows[0].signature);
                tokens.push(credentials.user.type);
                if (credentials.project) {
                    if (_.includes(credentials.project.user_ids, credentials.user.id)) {
                        tokens.push('member')
                    }
                }
                signature = _.join(tokens, ':');
            }).catch((err) => {
                if (err.code === '42P01') {
                    // wait for schema has not been created yet
                    attempts++;
                    return Promise.delay(500);
                } else {
                    throw err;
                }
            });
        });
        Async.while(() => {
            return !signature && attempts < 20;
        });
        Async.return(() => {
            if (!signature) {
                throw new HTTPError(404);
            }
            return signature;
        });
        return Async.end();
    }
});

export {
    Project as default,
    Project
};
