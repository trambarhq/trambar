import _ from 'lodash';
import Database from '../database.mjs';
import { Data } from './data.mjs';

class LiveData extends Data {
    constructor() {
        super();
        _.extend(this.columns, {
            atime: String,
            ltime: String,
            dirty: Boolean,
        });
        _.extend(this.criteria, {
            dirty: Boolean,
        });
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
        let table = this.getTableName(schema);
        let sql = `
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
        let table = this.getTableName(schema);
        let sql = `
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
        let table = this.getTableName(schema);
        let args = _.map(propNames, (propName) => {
            // use quotes just in case the name is mixed case
            return `"${propName}"`;
        }).join(', ');
        let sql = `
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
        let objects = await super.export(db, schema, rows, credentials, options);
        for (let [ index, object ] of objects.entries()) {
            let row = rows[index];
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
        let table = this.getTableName(schema);
        let parameters = [ id, interval ];
        let sql = `
            UPDATE ${table}
            SET ltime = NOW() + CAST($2 AS INTERVAL)
            WHERE id = $1 AND (ltime IS NULL OR ltime < NOW())
            RETURNING ${columns}
        `;
        let rows = await db.query(sql, parameters);
        if (rows[0]) {
            if (!this.locked) {
                this.locked = [];
            }
            this.locked.push({ schema, id });
        }
        return rows[0];
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
        let table = this.getTableName(schema);
        let parameters = [ id ];
        let assignments = [];
        let sql;
        if (props) {
            let index = parameters.length + 1;
            for (let name in this.columns) {
                if (name !== 'id') {
                    let value = props[name];
                    if (value !== undefined) {
                        let bound = '$' + index++;
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
        let rows = await db.query(sql, parameters);
        _.pullAllBy(this.locked, { schema, id });
        return rows[0] || null;
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
        let table = this.getTableName(schema);
        let parameters = [ ids ];
        let sql = `
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
        let now = new Date;
        let atime = now.toISOString();
        setTimeout(async () => {
            try {
                let db = await Database.open();
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
        let keyColumns = _.keys(keys);
        let columnsNeeded = columns + ', ' + keyColumns.join(', ');
        let criteria = _.extend({ deleted: false }, keys);
        let existingRows = await super.find(db, schema, criteria, columnsNeeded);
        // find missing rows
        let missingRows = [];
        for (let expectedRow of expectedRows) {
            // search only by keys
            let search = _.pick(expectedRow, keyColumns);
            if (!_.find(existingRows, search)) {
                // make row dirty initially
                let newRow = _.extend({ dirty: true }, expectedRow)
                missingRows.push(newRow);
            }
        }
        let newRows = await this.insert(db, schema, missingRows);
        return _.concat(newRows.reverse(), existingRows);
    }
}

export {
    LiveData,
};
