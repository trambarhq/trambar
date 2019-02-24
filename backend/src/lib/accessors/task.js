import _ from 'lodash';
import { Data } from 'accessors/data';
import HTTPError from 'errors/http-error';

class Task extends Data {
    constructor() {
        super();
        this.schema = 'both';
        this.table = 'task';
        _.extend(this.columns, {
            action: String,
            token: String,
            options: Object,
            details: Object,
            completion: Number,
            failed: Boolean,
            user_id: Number,
            etime: String,
        });
        _.extend(this.criteria, {
            action: String,
            token: String,
            completion: Number,
            failed: Boolean,
            user_id: Number,
            options: Object,
            etime: String,

            newer_than: String,
            older_than: String,
            complete: Boolean,
            noop: Boolean,
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
                action varchar(64) NOT NULL,
                token varchar(64),
                options jsonb NOT NULL DEFAULT '{}',
                completion int NOT NULL DEFAULT 0,
                failed boolean NOT NULL DEFAULT false,
                user_id int,
                etime timestamp,
                PRIMARY KEY (id)
            );
            CREATE UNIQUE INDEX ON ${table} (token) WHERE token IS NOT NULL AND deleted = false;
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
            'action',
            'user_id',
            'server_id',
            'failed',
            'deleted'
        ]);
    }

    /**
     * Add conditions to SQL query based on criteria object
     *
     * @param  {Object} criteria
     * @param  {Object} query
     */
    apply(criteria, query) {
        let special = [
            'options',
            'newer_than',
            'older_than',
            'complete',
            'noop',
        ];
        super.apply(_.omit(criteria, special), query);

        let params = query.parameters;
        let conds = query.conditions;
        if (criteria.options !== undefined) {
            conds.push(`options @> $${params.push(criteria.options)}`);
        }
        if (criteria.newer_than !== undefined) {
            conds.push(`ctime > $${params.push(criteria.newer_than)}`);
        }
        if (criteria.older_than !== undefined) {
            conds.push(`ctime < $${params.push(criteria.older_than)}`);
        }
        if (criteria.complete !== undefined) {
            if (criteria.complete) {
                conds.push(`completion = 100`);
            } else {
                conds.push(`completion <> 100`);
            }
        }
        if (criteria.noop !== undefined) {
            if (criteria.noop) {
                conds.push(`completion = 0`);
            } else {
                conds.push(`completion > 0`);
            }
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
            // TODO: access control
            let row = rows[index];
            object.action = row.action;
            object.token = row.token;
            object.user_id = row.user_id;
            object.etime = row.etime;
            object.failed = row.failed;
            object.completion = row.completion;
            if (credentials.area === 'admin') {
                object.server_id = row.server_id;
                object.options = row.options;
            } else {
                delete object.details;
            }
        }
        return objects;
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
            if (event.current.user_id) {
                if (event.current.user_id === user.id) {
                    return true;
                }
            } else {
                if (subscription.area === 'admin') {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Throw if current user cannot make modifications
     *
     * @param  {Object} taskReceived
     * @param  {Object} taskBefore
     * @param  {Object} credentials
     */
    checkWritePermission(taskReceived, taskBefore, credentials) {
        if (taskBefore) {
            // task cannot be modified
            throw new HTTPError(400);
        }
        if (taskReceived.user_id !== credentials.user.id) {
            throw new HTTPError(403);
        }
    }

    /**
     * Create a trigger on this table that updates another table
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {String} triggerName
     * @param  {String} method
     * @param  {Array<String>} args
     *
     * @return {Promise}
     */
    async createUpdateTrigger(db, schema, triggerName, method, args) {
        let table = this.getTableName(schema);
        let sql = `
            CREATE TRIGGER "${triggerName}"
            AFTER UPDATE ON ${table}
            FOR EACH ROW
            EXECUTE PROCEDURE "${method}"(${args.join(', ')});
        `;
        await db.execute(sql);
    }
}

const instance = new Task;

export {
    instance as default,
    Task
};
