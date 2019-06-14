import _ from 'lodash';
import Database from '../database.mjs';
import { Data } from './data.mjs';

class LiveData extends Data {
    constructor() {
        super();
        this.columns = {
            ...this.columns,
            atime: String,
            ltime: String,
            dirty: Boolean,
        };
        this.criteria = {
            ...this.criteria,
            dirty: Boolean,
        };
    }

    /**
     * Create table in schema
     *
     * (for reference purpose only)
     *
     * @param  {Database} db
     * @param  {String} schema
     *
     * @return {Promise<Boolean>}
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
                atime timestamp,
                ltime timestamp,
                dirty boolean NOT NULL DEFAULT false,
                PRIMARY KEY (id)
            );
        `;
        await db.execute(sql);
        return true;
    }

    /**
     * Attach a modified trigger that accounts for atime, utime, and dirty.
     *
     * @param  {Database} db
     * @param  {String} schema
     *
     * @return {Promise<Boolean>}
     */
    async createChangeTrigger(db, schema) {
        const table = this.getTableName(schema);
        const sql = `
            CREATE TRIGGER "indicateLiveDataChangeOnUpdate"
            BEFORE UPDATE ON ${table}
            FOR EACH ROW
            EXECUTE PROCEDURE "indicateLiveDataChange"();
        `;
        await db.execute(sql);
        return true;
    }

    /**
     * Attach modified triggers that accounts for atime, utime, and dirty.
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<String>} propNames
     *
     * @return {Promise}
     */
    async createNotificationTriggers(db, schema, propNames) {
        const table = this.getTableName(schema);
        const args = _.map(propNames, (propName) => {
            // use quotes just in case the name is mixed case
            return `"${propName}"`;
        }).join(', ');
        const sql = `
            CREATE CONSTRAINT TRIGGER "notifyLiveDataChangeOnInsert"
            AFTER INSERT ON ${table} INITIALLY DEFERRED
            FOR EACH ROW
            EXECUTE PROCEDURE "notifyLiveDataChange"(${args});
            CREATE CONSTRAINT TRIGGER "notifyLiveDataChangeOnUpdate"
            AFTER UPDATE ON ${table} INITIALLY DEFERRED
            FOR EACH ROW
            EXECUTE PROCEDURE "notifyLiveDataChange"(${args});
            CREATE CONSTRAINT TRIGGER "notifyLiveDataChangeOnDelete"
            AFTER DELETE ON ${table} INITIALLY DEFERRED
            FOR EACH ROW
            EXECUTE PROCEDURE "notifyLiveDataChange"(${args});
        `;
        await db.execute(sql);
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
     * @return {Promise<Object>}
     */
    async export(db, schema, rows, credentials, options) {
        const objects = await super.export(db, schema, rows, credentials, options);
        for (let [ index, object ] of objects.entries()) {
            const row = rows[index];
            if (row.dirty) {
                object.dirty = true;
            }
            // update access time so regeneration can be expedited
            this.touch(db, schema, row);
        }
        return objects;
    }

    async import() {
        throw new Error('Cannot modify live data');
    }

    /**
     * Lock a row for updates
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Number} id
     * @param  {String} interval
     * @param  {String} columns
     *
     * @return {Promise<Object|null>}
     */
    async lock(db, schema, id, interval, columns) {
        const table = this.getTableName(schema);
        const parameters = [ id, interval ];
        const sql = `
            UPDATE ${table}
            SET ltime = NOW() + CAST($2 AS INTERVAL)
            WHERE id = $1 AND (ltime IS NULL OR ltime < NOW())
            RETURNING ${columns}
        `;
        const [ row ] = await db.query(sql, parameters);
        if (row) {
            if (!this.locked) {
                this.locked = [];
            }
            this.locked.push({ schema, id });
        }
        return row;
    }

    /**
     * Update a row then unlock it when props are provided. If not, simply
     * release the lock.
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Number} id
     * @param  {Object} props
     * @param  {String} columns
     *
     * @return {Promise<Object|null>}
     */
    async unlock(db, schema, id, props, columns) {
        const table = this.getTableName(schema);
        const parameters = [ id ];
        const assignments = [];
        let sql;
        if (props) {
            const index = parameters.length + 1;
            for (let name in this.columns) {
                if (name !== 'id') {
                    const value = props[name];
                    if (value !== undefined) {
                        const bound = '$' + index++;
                        parameters.push(value);
                        assignments.push(`${name} = ${bound}`);
                    }
                }
            }
            sql = `
                UPDATE ${table}
                SET ${assignments.join(',')}, ltime = NULL, dirty = false
                WHERE id = $1 AND ltime >= NOW()
                RETURNING ${columns}
            `;
        } else {
            sql = `
                UPDATE ${table}
                SET ltime = NULL
                WHERE id = $1 AND ltime >= NOW()
            `;
        }
        const [ row ] = await db.query(sql, parameters);
        _.pullAllBy(this.locked, { schema, id });
        return row || null;
    }

    /**
     * Unlock any previous locked row
     *
     * @param  {Database} db
     *
     * @return {Promise}
     */
    async relinquish(db) {
        if (_.isEmpty(this.locked)) {
            return;
        }
        for (let lock of this.locked) {
            await this.unlock(db, lock.schema, lock.id);
        }
    }

    /**
     * Mark rows as dirty
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<Number>} ids
     *
     * @return {Promise}
     */
    async invalidate(db, schema, ids) {
        const table = this.getTableName(schema);
        const parameters = [ ids ];
        const sql = `
            UPDATE ${table} SET dirty = true
            WHERE id = ANY($1) RETURNING id, dirty
        `;
        await db.execute(sql, parameters);
    }

    /**
     * Update a row's access time
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object} row
     */
    touch(db, schema, row) {
        const now = new Date;
        const atime = now.toISOString();
        setTimeout(async () => {
            try {
                const db = await Database.open();
                await this.updateOne(db, schema, { id: row.id, atime });
            } catch (err) {
                console.error(err);
            }
        }, 20);
    }

    /**
     * Ensure that rows exist in the database
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object} keys
     * @param  {Array<Object>} expectedRows
     * @param  {String} columns
     *
     * @return {Array<Object>}
     */
    async vivify(db, schema, keys, expectedRows, columns) {
        // we need these columns in order to tell which rows are missing
        const keyColumns = _.keys(keys);
        const columnsNeeded = columns + ', ' + keyColumns.join(', ');
        const criteria = { deleted: false, ...keys };
        const existingRows = await super.find(db, schema, criteria, columnsNeeded);
        // find missing rows
        const missingRows = [];
        for (let expectedRow of expectedRows) {
            // search only by keys
            const search = _.pick(expectedRow, keyColumns);
            if (!_.find(existingRows, search)) {
                // make row dirty initially
                const newRow = { dirty: true, ...expectedRow };
                missingRows.push(newRow);
            }
        }
        const newRows = await this.insert(db, schema, missingRows);
        return _.concat(newRows.reverse(), existingRows);
    }
}

export {
    LiveData,
};
