import _ from 'lodash';
import Bluebird from 'bluebird';
import { Data } from './data.mjs';
import Task from './task.mjs';
import Repo from './repo.mjs';
import User from './user.mjs';
import HTTPError from '../common/errors/http-error.mjs';
import * as ProjectUtils from '../common/objects/utils/project-utils.mjs';

const illegalProjectNames = [ 'global', 'admin', 'public', 'srv' ];

class Project extends Data {
    constructor() {
        super();
        this.schema = 'global';
        this.table = 'project';
        this.columns = {
            ...this.columns,
            name: String,
            repo_ids: Array(Number),
            user_ids: Array(Number),
            template_repo_id: Number,
            settings: Object,
            archived: Boolean,
        };
        this.criteria = {
            ...this.criteria,
            name: String,
            repo_ids: Array(Number),
            user_ids: Array(Number),
            template_repo_id: Number,
            archived: Boolean,
        };
        this.eventColumns = {
            ...this.eventColumns,
            name: String,
            repo_ids: Array(Number),
            user_ids: Array(Number),
            template_repo_id: Number,
            archived: Boolean,
        };
        this.accessControlColumns = {
            user_ids: Array(Number),
            settings: Object,
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
                name varchar(128) NOT NULL DEFAULT '',
                repo_ids int[] NOT NULL DEFAULT '{}'::int[],
                user_ids int[] NOT NULL DEFAULT '{}'::int[],
                role_ids int[],
                template_repo_id int NULL DEFAULT NULL,
                settings jsonb NOT NULL DEFAULT '{}',
                archived boolean NOT NULL DEFAULT false,
                PRIMARY KEY (id)
            );
            CREATE UNIQUE INDEX ON ${table} (name) WHERE deleted = false;
            CREATE INDEX ON ${table} USING gin(("payloadTokens"(details))) WHERE "payloadTokens"(details) IS NOT NULL;
        `;
        await db.execute(sql);
    }

    /**
     * Upgrade table in schema to given DB version (from one version prior)
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Number} version
     *
     * @return {Promise<Boolean>}
     */
    async upgrade(db, schema, version) {
        if (version === 3) {
            // adding: template_repo_id
            const table = this.getTableName(schema);
            const sql = `
                ALTER TABLE ${table}
                ADD COLUMN IF NOT EXISTS
                template_repo_id int NULL DEFAULT NULL;
            `;
            await db.execute(sql)
            return true;
        }
        return false;
    }

    /**
     * Grant privileges to table to appropriate Postgres users
     *
     * @param  {Database} db
     * @param  {String} schema
     *
     * @return {Promise}
     */
    async grant(db, schema) {
        const table = this.getTableName(schema);
        const sql = `
            GRANT SELECT ON ${table} TO auth_role;
            GRANT INSERT, SELECT, UPDATE ON ${table} TO admin_role;
            GRANT SELECT, UPDATE ON ${table} TO client_role;
        `;
        await db.execute(sql);
    }

    /**
     * Attach triggers to the table.
     *
     * @param  {Database} db
     * @param  {String} schema
     *
     * @return {Promise<Boolean>}
     */
    async watch(db, schema) {
        await this.createChangeTrigger(db, schema);
        await this.createNotificationTriggers(db, schema);
        await this.createResourceCoalescenceTrigger(db, schema, []);
        // completion of tasks will automatically update details->resources
        await Task.createUpdateTrigger(db, schema, 'updateProject', 'updateResource', [ this.table ]);
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
        if (!credentials.unrestricted) {
            rows = _.filter(rows, (row) => {
                return ProjectUtils.isVisibleToUser(row, credentials.user);
            });
        }
        return rows;
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
     * @return {Promise<Array<Object>>}
     */
    async export(db, schema, rows, credentials, options) {
        const objects = await super.export(db, schema, rows, credentials, options);
        for (let [ index, object ] of objects.entries()) {
            const row = rows[index];
            object.name = row.name;
            object.repo_ids = row.repo_ids;
            object.user_ids = row.user_ids;
            if (credentials.unrestricted) {
                object.settings = row.settings;
            } else {
                const columns = [
                    'membership',
                    'access_control',
                    'domains',
                ]
                object.settings = _.pick(row.settings, columns);
            }
            if (row.archived) {
                object.archived = row.archived;
            }
            object.template_repo_id = row.template_repo_id;
        }
        return objects;
    }

    /**
     * Import object sent by client-side code
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object} projectReceived
     * @param  {Object} projectBefore
     * @param  {Object} credentials
     * @param  {Object} options
     *
     * @return {Promise<Object>}
     */
    async importOne(db, schema, projectReceived, projectBefore, credentials, options) {
        const row = await super.importOne(db, schema, projectReceived, projectBefore, credentials, options);
        if (projectReceived.repo_ids) {
            const newRepoIds = _.difference(projectReceived.repo_ids, projectBefore.repo_ids);
            if (!_.isEmpty(newRepoIds)) {
                // add users with access to repos to project
                const repoCriteria = { id: newRepoIds, deleted: false };
                const repos = await Repo.find(db, schema, repoCriteria, 'user_ids');
                const userIds = _.uniq(_.flatten(_.map(repos, 'user_ids')));
                const userCriteria = {
                    id: userIds,
                    disabled: false,
                    deleted: false,
                };
                const users = await User.find(db, schema, userCriteria, 'id');
                const newUserIds = _.map(users, 'id');
                const existingUserIds = projectReceived.user_ids || projectBefore.user_ids;
                row.user_ids = _.union(existingUserIds, newUserIds);
            }
        }
        await this.ensureUniqueName(db, schema, projectBefore, row);
        return row;
    }

    /**
     * Throw an exception if modifications aren't permitted
     *
     * @param  {Object} projectReceived
     * @param  {Object} projectBefore
     * @param  {Object} credentials
     */
    checkWritePermission(projectReceived, projectBefore, credentials) {
        if (_.includes(illegalProjectNames, projectReceived.name)) {
            throw new HTTPError(409); // 409 conflict
        }
        if (!/^[\w\-]+$/.test(projectReceived.name)) {
            return new HTTPError(400);
        }
        if (credentials.unrestricted) {
            return;
        }
        throw new HTTPError(403);
    }

    /**
     * Create associations between newly created or modified rows with
     * rows in other tables
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<Object>} projectsReceived
     * @param  {Array<Object>} projectsBefore
     * @param  {Array<Object>} projectsAfter
     * @param  {Object} credentials
     *
     * @return {Promise}
     */
    async associate(db, schema, projectsReceived, projectsBefore, projectsAfter, credentials) {
        await this.updateNewMembers(db, schema, projectsReceived, projectsBefore, projectsAfter);
    }

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
    async updateNewMembers(db, schema, projectsReceived, projectsBefore, projectsAfter) {
        // first, obtain ids of projects that new members are added to
        const newUserMemberships = {}, newMemberIds = [];
        for (let [ index, projectReceived ] of projectsReceived.entries()) {
            const projectBefore = projectsBefore[index];
            const projectAfter = projectsAfter[index];
            if (projectReceived.user_ids) {
                let newUserIds = projectAfter.user_ids;
                if (projectBefore) {
                    newUserIds = _.difference(projectAfter.user_ids, projectBefore.user_ids);
                }
                for (let userId of newUserIds) {
                    const ids = newUserMemberships[userId];
                    if (ids) {
                        ids.push(projectAfter.id);
                    } else {
                        newUserMemberships[userId] = [ projectAfter.id ];
                        newMemberIds.push(userId);
                    }
                }
            }
        }
        if (_.isEmpty(newMemberIds)) {
            return;
        }
        // load the users and update requested_project_ids column
        const criteria = { id: newMemberIds };
        const users = await User.find(db, schema, criteria, 'id, requested_project_ids');
        for (let user of users) {
            user.requested_project_ids = _.difference(user.requested_project_ids, newUserMemberships[user.id]);
            if (_.isEmpty(user.requested_project_ids)) {
                user.requested_project_ids = null;
            }
        }
        await User.update(db, schema, users);
    }

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
    async addMembers(db, schema, projectId, userIds) {
        const table = this.getTableName(schema);
        const params = [];
        const sql = `
            UPDATE ${table} SET user_ids = user_ids || $${params.push(userIds)}
            WHERE id = $${params.push(projectId)}
            RETURNING *
        `;
        await db.execute(sql, params);
    }

    /**
     * Return cache signature of project schema
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object} credentials
     *
     * @return {[type]}
     */
    async getSignature(db, schema, credentials) {
        if (!/^[\w\-]+$/.test(schema)) {
            throw new HTTPError(404);
        }
        for (let attempts = 0; attempts < 20; attempts++) {
            try {
                const table = `"${schema}"."meta"`;
                const sql = `SELECT signature FROM ${table} LIMIT 1`;
                const [ row ] = await db.query(sql);
                if (row) {
                    const tokens = [];
                    tokens.push(row.signature);
                    tokens.push(credentials.user.type);
                    if (credentials.project) {
                        if (_.includes(credentials.project.user_ids, credentials.user.id)) {
                            tokens.push('member')
                        }
                    }
                    return _.join(tokens, ':');
                }
            } catch (err) {
                if (err.code === '42P01') {
                    // schema has not been created yet, perhaps
                    await Bluebird.delay(500);
                } else {
                    throw err;
                }
            }
        }
        throw new HTTPError(404);
    }
}

const instance = new Project;

export {
    instance as default,
    Project
};
