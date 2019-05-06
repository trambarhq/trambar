import _ from 'lodash';
import HTTPError from '../common/errors/http-error.mjs';
import { Data } from './data.mjs';
import Task from './task.mjs';
import Repo from './repo.mjs';

class Server extends Data {
    constructor() {
        super();
        this.schema = 'global';
        this.table = 'server';
        _.extend(this.columns, {
            type: String,
            name: String,
            disabled: Boolean,
            settings: Object,
        });
        _.extend(this.criteria, {
            type: String,
            name: String,
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
                name varchar(128) NOT NULL,
                type varchar(64),
                disabled boolean NOT NULL DEFAULT false,
                settings jsonb NOT NULL DEFAULT '{}',
                PRIMARY KEY (id)
            );
            CREATE UNIQUE INDEX ON ${table} (name) WHERE deleted = false;
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
        let table = this.getTableName(schema);
        // Auth Manager needs to be able to update a server's OAuth tokens
        let sql = `
            GRANT SELECT, UPDATE ON ${table} TO auth_role;
            GRANT INSERT, SELECT, UPDATE ON ${table} TO admin_role;
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
            'disabled',
            'type'
        ]);
        // completion of tasks will automatically update details->resources
        await Task.createUpdateTrigger(db, schema, 'updateServer', 'updateResource', [ this.table ]);
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
            object.name = row.name;
            if (credentials.unrestricted || process.env.ADMIN_GUEST_MODE) {
                object.settings = _.obscure(row.settings, sensitiveSettings);
                object.disabled = row.disabled;
            } else {
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
     * @param  {Object} serverReceived
     * @param  {Object} serverBefore
     * @param  {Object} credentials
     * @param  {Object} options
     *
     * @return {Promise<Object>}
     */
    async importOne(db, schema, serverReceived, serverBefore, credentials, options) {
        let row = await super.importOne(db, schema, serverReceived, serverBefore, credentials, options);
        if (serverReceived.settings instanceof Object) {
            for (let path of sensitiveSettings) {
                // restore the original values if these fields are all x's
                let value = _.get(serverReceived.settings, path);
                if (/^x+$/.test(value)) {
                    let originalValue = _.get(serverBefore.settings, path);
                    _.set(serverReceived.settings, path, originalValue);
                }
            }
        }
        await this.ensureUniqueName(db, schema, serverBefore, row);
        return row;
    }

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
     async associate(db, schema, objects, originals, rows, credentials) {
         let deletedServers = _.filter(rows, (serverAfter, index) => {
             let serverBefore = originals[index];
             if (serverBefore) {
                 return serverAfter.deleted && !serverBefore.deleted;
             }
         });
         let undeletedServers = _.filter(rows, (serverAfter, index) => {
             let serverBefore = originals[index];
             if (serverBefore) {
                 return !serverAfter.deleted && serverBefore.deleted;
             }
         });
         await Repo.deleteAssociated(db, schema, { server: deletedServers });
         await Repo.restoreAssociated(db, schema, { server: undeletedServers });
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
            // not used in client app
            if (subscription.area === 'admin') {
                return true;
            }
        }
        return false;
    }

    /**
     * Throw an exception if modifications aren't permitted
     *
     * @param  {Object} serverReceived
     * @param  {Object} serverBefore
     * @param  {Object} credentials
     */
    checkWritePermission(serverReceived, serverBefore, credentials) {
        if (credentials.unrestricted) {
            return;
        }
        throw new HTTPError(403);
    }
}

let sensitiveSettings = [
    'api.access_token',
    'api.refresh_token',
    'oauth.client_secret',
];

const instance = new Server;

export {
    instance as default,
    Server,
};
