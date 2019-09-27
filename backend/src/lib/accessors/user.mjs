import _ from 'lodash';
import HTTPError from '../common/errors/http-error.mjs';
import { ExternalData } from './external-data.mjs';
import Project from './project.mjs';
import Story from './story.mjs';
import Reaction from './reaction.mjs';
import Task from './task.mjs';

class User extends ExternalData {
    constructor() {
        super();
        this.schema = 'global';
        this.table = 'user';
        this.columns = {
            ...this.columns,
            type: String,
            username: String,
            role_ids: Array(Number),
            requested_project_ids: Array(Number),
            disabled: Boolean,
            settings: Object,
        };
        this.criteria = {
            ...this.criteria,
            type: String,
            username: String,
            email: String,
            role_ids: Array(Number),
            requested_project_ids: Array(Number),
            disabled: Boolean,
        };
        this.eventColumns = {
            ...this.eventColumns,
            requested_project_ids: Array(Number),
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
        await db.execute(sql);
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
        // TODO revoke INSERT and UPDATE of column 'type'
        const table = this.getTableName(schema);
        const sql = `
            GRANT INSERT, SELECT, UPDATE ON ${table} TO auth_role;
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
     * @return {Promise}
     */
    async watch(db, schema) {
        await this.createChangeTrigger(db, schema);
        await this.createNotificationTriggers(db, schema);
        await this.createResourceCoalescenceTrigger(db, schema, []);
        await Task.createUpdateTrigger(db, schema, 'updateUser', 'updateResource', [ this.table ]);
    }

    /**
     * Add conditions to SQL query based on criteria object
     *
     * @param  {Object} criteria
     * @param  {Object} query
     */
    apply(criteria, query) {
        const { email, ...basic } = criteria;
        super.apply(basic, query);

        const params = query.parameters;
        const conds = query.conditions;
        if (email !== undefined) {
            conds.push(`details->>'email' = $${params.push(email)}`);
        }
    }

    /**
     * Save a row, appending a number if a username conflict occurs
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {user} object
     *
     * @return {Promise<Object>}
     */
    async saveUnique(db, schema, user) {
        // this doesn't work within a transaction
        try {
            const objectAfter = await this.saveOne(db, schema, user);
            return objectAfter;
        } catch (err) {
            // unique violation
            if (err.code === '23505') {
                user = { ...user };
                const m = /(.*)(\d+)$/.exec(user.username);
                if (m) {
                    const number = parseInt(m[2]);
                    user.username = m[1] + (number + 1);
                } else {
                    user.username += '2';
                }
                return this.saveUnique(db, schema, user);
            }
            throw err;
        }
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
                        const contactInfo = [
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
        }
        return objects;
    }

    /**
     * Import object sent by client-side code
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object} userReceived
     * @param  {Object} userBefore
     * @param  {Object} credentials
     * @param  {Object} options
     *
     * @return {Promise<Object>}
     */
    async importOne(db, schema, userReceived, userBefore, credentials, options) {
        const row = await super.importOne(db, schema, userReceived, userBefore, credentials, options);
        if (userBefore && !userBefore.deleted && !_.isEmpty(userReceived.requested_project_ids)) {
            // remove ids of projects that'd accept the user automatically
            // as well as those that can't be joined
            const projectIDs = userReceived.requested_project_ids;
            const criteria = { id: projectIDs, deleted: false };
            const projects = await Project.find(db, schema, criteria, 'id, settings');
            const pendingProjectIDs = _.filter(projectIDs, (projectID) => {
                const project = _.find(projects, { id: projectID });
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
            if (_.isEmpty(pendingProjectIDs)) {
                pendingProjectIDs = null;
            }
            row.requested_project_ids = pendingProjectIDs;
            await this.ensureUniqueName(db, schema, userBefore, row, 'username');
        }
        return row;
    }

    /**
     * See if a database change event is relevant to a given user
     *
     * @param  {Object} event
     * @param  {User} user
     * @param  {Subscription} subscription
     *
     * @return {Boolean}
     */
    isRelevantTo(event, user, subscription) {
        if (super.isRelevantTo(event, user, subscription)) {
            if (event.id === user.id) {
                return true;
            } else {
                const columns = _.keys(event.diff);
                const publicColumns = _.without(columns, 'settings');
                if (!_.isEmpty(publicColumns)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Return true if user can join project
     *
     * @param  {User} user
     * @param  {Project} project
     *
     * @return {Boolean}
     */
    canJoin(user, project) {
        if (!project) {
            return false;
        }
        if (user.type === 'guest') {
            return !!_.get(project, 'settings.membership.allow_guest_request');
        } else {
            return !!_.get(project, 'settings.membership.allow_user_request');
        }
    }

    /**
     * Return true if user would be accepted into project automatically
     *
     * @param  {User} user
     * @param  {Project} project
     *
     * @return {Boolean}
     */
    canJoinAutomatically(user, project) {
        if (_.includes(project.user_ids, user.id)) {
            // user is already a member
            return true;
        }
        if (user.type === 'guest') {
            return !!_.get(project, 'settings.membership.approve_guest_request');
        } else {
            return !!_.get(project, 'settings.membership.approve_user_request');
        }
    }

    /**
     * Throw an exception if modifications aren't permitted
     *
     * @param  {Object} userReceived
     * @param  {Object} userBefore
     * @param  {Object} credentials
     */
    checkWritePermission(userReceived, userBefore, credentials) {
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
    }

    /**
     * Create associations between newly created or modified rows with
     * rows in other tables
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<Object>} usersReceived
     * @param  {Array<Object>} usersBefore
     * @param  {Array<Object>} usersAfter
     * @param  {Object} credentials
     *
     * @return {Promise}
     */
     async associate(db, schema, usersReceived, usersBefore, usersAfter, credentials) {
         await this.updateMemberList(db, schema, usersReceived, usersBefore, usersAfter);
         await this.updateStoryRoles(db, schema, usersBefore, usersAfter);
         await this.updateContentDeletion(db, schema, usersBefore, usersAfter);
     }

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
    async updateMemberList(db, schema, usersReceived, usersBefore, usersAfter) {
        const newMembers = {};
        for (let [ index, userReceived ] of usersReceived.entries()) {
            // the project ids removed earlier by import() are the ones that
            // can be joined automatically (or can't be joined at all)
            const userAfter = usersAfter[index];
            const projectIDs = _.difference(userReceived.requested_project_ids, userAfter.requested_project_ids);
            for (let projectID of projectIDs) {
                const members = newMembers[projectID];
                if (!members) {
                    members = newMembers[projectID] = [];
                }
                members.push(userAfter);
            }
        }
        if (_.isEmpty(newMembers)) {
            return;
        }
        const projectIDs = _.map(_.keys(newMembers), parseInt);
        const criteria = { id: projectIDs, deleted: false };
        // update user_ids column in project table
        const projects = await Project.find(db, schema, criteria, 'id, user_ids, settings');
        for (let project of projects) {
            // make sure user can actually join
            const newProjectMembers = _.filter(newMembers[project.id], (user) => {
                return this.canJoin(user, project) && this.canJoinAutomatically(user, project);
            });
            const newUserIDs = _.map(newProjectMembers, 'id');
            const projectAfter = {
                id: project.id,
                user_ids: _.union(project.user_ids, newUserIDs),
            };
            await Project.updateOne(db, schema, projectAfter);
        }
    }

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
    async updateStoryRoles(db, schema, usersBefore, usersAfter) {
        const usersWithRoleChanges = _.filter(usersBefore, (userBefore, index) => {
            if (userBefore) {
                const userAfter = usersAfter[index];
                if (!_.isEmpty(_.xor(userBefore.role_ids, userAfter.role_ids))) {
                    return true;
                }
            }
        });
        if (_.isEmpty(usersWithRoleChanges)) {
            return;
        }

        // find projects the users belongs to
        const userIDs = _.map(usersWithRoleChanges, 'id');
        const criteria = { user_ids: userIDs, deleted: false };
        const projects = await Project.find(db, schema, criteria, 'name');
        for (let project of projects) {
            await Story.updateUserRoles(db, project.name, userIDs);
        }
    }

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
    async updateContentDeletion(db, schema, usersBefore, usersAfter) {
        const deletedUsers = _.filter(usersAfter, (userAfter, index) => {
            const userBefore = usersBefore[index];
            if (userBefore) {
                return userAfter.deleted && !userBefore.deleted;
            }
        });
        const undeletedUsers = _.filter(usersAfter, (userAfter, index) => {
            const userBefore = usersBefore[index];
            if (userBefore) {
                return !userAfter.deleted && userBefore.deleted;
            }
        });
        if (_.isEmpty(deletedUsers) && _.isEmpty(undeletedUsers)) {
            return;
        }

        // go through each project
        const criteria = { deleted: false };
        const projects = await Project.find(db, schema, criteria, 'name');
        for (let project of projects) {
            const contentSchema = project.name;
            await Story.deleteAssociated(db, contentSchema, { user: deletedUsers });
            await Story.restoreAssociated(db, contentSchema, { user: undeletedUsers });
            await Reaction.deleteAssociated(db, contentSchema, { user: deletedUsers });
            await Reaction.restoreAssociated(db, contentSchema, { user: undeletedUsers });
        }
    }
}

const instance = new User;

export {
    instance as default,
    User,
};
