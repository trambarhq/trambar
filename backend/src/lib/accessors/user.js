import _ from 'lodash';
import HTTPError from 'errors/http-error';
import { ExternalData } from 'accessors/external-data';
import Project from 'accessors/project';
import Story from 'accessors/story';
import Reaction from 'accessors/reaction';
import Task from 'accessors/task';

class User extends ExternalData {
    constructor() {
        super();
        this.schema = 'global';
        this.table = 'user';
        _.extend(this.columns, {
            type: String,
            username: String,
            role_ids: Array(Number),
            requested_project_ids: Array(Number),
            disabled: Boolean,
            settings: Object,
        });
        _.extend(this.criteria, {
            type: String,
            username: String,
            email: String,
            role_ids: Array(Number),
            requested_project_ids: Array(Number),
            disabled: Boolean,
        });
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
        let table = this.getTableName(schema);
        let sql = `
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
        let table = this.getTableName(schema);
        let sql = `
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
        await this.createNotificationTriggers(db, schema, [
            'deleted',
            'requested_project_ids',
            'external',
            'mtime',
            'itime',
            'etime'
        ]);
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
        let special = [
            'email',
        ];
        super.apply(_.omit(criteria, special), query);

        let params = query.parameters;
        let conds = query.conditions;
        if (criteria.email !== undefined) {
            conds.push(`details->>'email' = $${params.push(criteria.email)}`);
        }
    }

    /**
     * Insert row, appending a number if a username conflict occurs
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {user} object
     *
     * @return {Promise<Object>}
     */
    async insertUnique(db, schema, user) {
        // this doesn't work within a transaction
        try {
            await this.insertOne(db, schema, user);
        } catch (err) {
            // unique violation
            if (err.code === '23505') {
                user = _.clone(user);
                let m = /(.*)(\d+)$/.exec(user.username);
                if (m) {
                    let number = parseInt(m[2]);
                    user.username = m[1] + (number + 1);
                } else {
                    user.username += '2';
                }
                return this.insertUnique(db, schema, user);
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
        let objects = await super.export(db, schema, rows, credentials, options);
        for (let [ index, object ] of objects.entries()) {
            let row = rows[index];
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
                        let contactInfo = [
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
        let row = await super.importOne(db, schema, userReceived, userBefore, credentials, options);
        if (userBefore && !userBefore.deleted && !_.isEmpty(userReceived.requested_project_ids)) {
            // remove ids of projects that'd accept the user automatically
            // as well as those that can't be joined
            let projectIDs = userReceived.requested_project_ids;
            let criteria = { id: projectIDs, deleted: false };
            let projects = await Project.find(db, schema, criteria, 'id, settings');
            let pendingProjectIDs = _.filter(projectIDs, (projectID) => {
                let project = _.find(projects, { id: projectID });
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
                let columns = _.keys(event.diff);
                let publicColumns = _.without(columns, 'settings');
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
        let newMembers = {};
        for (let [ index, userReceived ] of usersReceived.entries()) {
            // the project ids removed earlier by import() are the ones that
            // can be joined automatically (or can't be joined at all)
            let userAfter = usersAfter[index];
            let projectIDs = _.difference(userReceived.requested_project_ids, userAfter.requested_project_ids);
            _.each(projectIDs, (projectID) => {
                let members = newMembers[projectID];
                if (!members) {
                    members = newMembers[projectID] = [];
                }
                members.push(userAfter);
            });
        }
        if (_.isEmpty(newMembers)) {
            return;
        }
        let projectIDs = _.map(_.keys(newMembers), parseInt);
        let criteria = { id: projectIDs, deleted: false };
        // update user_ids column in project table
        let projects = Project.find(db, schema, criteria, 'id, user_ids, settings');
        for (let project of projects) {
            // make sure user can actually join
            let newProjectMembers = _.filter(newMembers[project.id], (user) => {
                return this.canJoin(user, project) && this.canJoinAutomatically(user, project);
            });
            let newUserIDs = _.map(newProjectMembers, 'id');
            let projectAfter = {
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
        let usersWithRoleChanges = _.filter(usersBefore, (userBefore, index) => {
            if (userBefore) {
                let userAfter = usersAfter[index];
                if (!_.isEmpty(_.xor(userBefore.role_ids, userAfter.role_ids))) {
                    return true;
                }
            }
        });
        if (_.isEmpty(usersWithRoleChanges)) {
            return;
        }

        // find projects the users belongs to
        let userIDs = _.map(usersWithRoleChanges, 'id');
        let criteria = { user_ids: userIDs, deleted: false };
        let projects = await Project.find(db, schema, criteria, 'name');
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
        let deletedUsers = _.filter(usersAfter, (userAfter, index) => {
            let userBefore = usersBefore[index];
            if (userBefore) {
                return userAfter.deleted && !userBefore.deleted;
            }
        });
        let undeletedUsers = _.filter(usersAfter, (userAfter, index) => {
            let userBefore = usersBefore[index];
            if (userBefore) {
                return !userAfter.deleted && userBefore.deleted;
            }
        });
        if (_.isEmpty(deletedUsers) && _.isEmpty(undeletedUsers)) {
            return;
        }

        // go through each project
        let criteria = { deleted: false };
        let projects = await Project.find(db, schema, criteria, 'name');
        for (let project of projects) {
            let contentSchema = project.name;
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
