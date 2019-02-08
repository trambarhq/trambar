import _ from 'lodash';
import HTTPError from 'errors/http-error';
import { Data } from 'accessors/data';
import Task from 'accessors/task';

class Picture extends Data {
    constructor() {
        super();
        this.schema = 'global';
        this.table = 'picture';
        _.extend(this.columns, {
            purpose: String,
            user_id: Number,
        });
        _.extend(this.criteria, {
            purpose: String,
            user_id: Number,
            url: String,
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
                purpose varchar(64) NOT NULL,
                user_id int NOT NULL DEFAULT 0,
                PRIMARY KEY (id)
            );
            CREATE INDEX ON ${table} ((details->'url'));
        `;
        await db.execute(sql);
    }

    /**
     * Attach triggers to this table, also add trigger on task so details
     * are updated when tasks complete
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
            'purpose',
            'user_id'
        ]);
        await this.createResourceCoalescenceTrigger(db, schema, []);
        await Task.createUpdateTrigger(db, schema, 'updatePicture', 'updateResource', [ this.table ]);
    }

    /**
     * Add conditions to SQL query based on criteria object
     *
     * @param  {Object} criteria
     * @param  {Object} query
     */
    apply(criteria, query) {
        let special = [ 'url' ];
        super.apply(_.omit(criteria, special), query);

        let params = query.parameters;
        let conds = query.conditions;
        if (criteria.url !== undefined) {
            conds.push(`details->>'url' = $${params.push(criteria.url)}`);
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
            object.purpose = row.purpose;
            object.user_id = row.user_id;
        }
        return objects;
    }

    /**
     * Throw an exception if modifications aren't permitted
     *
     * @param  {Object} pictureReceived
     * @param  {Object} pictureBefore
     * @param  {Object} credentials
     */
    checkWritePermission(pictureReceived, pictureBefore, credentials) {
        if (credentials.unrestricted) {
            return;
        }
        throw new HTTPError(403);
    }
}

const instance = new Picture;

export {
    instance as default,
    Picture,
};
