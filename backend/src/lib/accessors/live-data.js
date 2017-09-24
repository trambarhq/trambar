var _ = require('lodash');
var Promise = require('bluebird');
var Database = require('database');
var Data = require('accessors/data');

module.exports = _.create(Data, {
    schema: 'global',
    table: 'live_data',
    columns: {
        id: Number,
        gn: Number,
        deleted: Boolean,
        ctime: String,
        mtime: String,
        details: Object,
        atime: String,
        ltime: String,
        dirty: Boolean,
    },
    criteria: {
        id: Number,
        deleted: Boolean,
        dirty: Boolean,
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
                atime timestamp,
                ltime timestamp,
                dirty boolean NOT NULL DEFAULT false,
                PRIMARY KEY (id)
            );
        `;
        return db.execute(sql);
    },

    /**
     * Attach modified triggers that accounts for atime, utime, and dirty
     *
     * @param  {Database} db
     * @param  {String} schema
     *
     * @return {Promise<Boolean>}
     */
    watch: function(db, schema) {
        var table = this.getTableName(schema);
        var sql = [
            `
                CREATE TRIGGER "indicateLiveDataChangeOnUpdate"
                BEFORE UPDATE ON ${table}
                FOR EACH ROW
                EXECUTE PROCEDURE "indicateLiveDataChange"();
            `,
            `
                CREATE CONSTRAINT TRIGGER "notifyLiveDataChangeOnInsert"
                AFTER INSERT ON ${table} INITIALLY DEFERRED
                FOR EACH ROW
                EXECUTE PROCEDURE "notifyLiveDataChange"();
            `,
            `
                CREATE CONSTRAINT TRIGGER "notifyLiveDataChangeOnUpdate"
                AFTER UPDATE ON ${table} INITIALLY DEFERRED
                FOR EACH ROW
                EXECUTE PROCEDURE "notifyLiveDataChange"();
            `,
            `
                CREATE CONSTRAINT TRIGGER "notifyLiveDataChangeOnDelete"
                AFTER DELETE ON ${table} INITIALLY DEFERRED
                FOR EACH ROW
                EXECUTE PROCEDURE "notifyLiveDataChange"();
            `,
        ];
        return db.execute(sql.join('\n')).return(true);
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
                if (row.dirty) {
                    object.dirty = true;
                }
                // update access time so regeneration can be expedited
                this.touch(db, schema, row);
            });
            return objects;
        });
    },

    import: null,

    /**
     * Lock a row for updates
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Number} id
     * @param  {String} interval
     * @param  {String} columns
     *
     * @return {Promise<Object>}
     */
    lock: function(db, schema, id, interval, columns) {
        var table = this.getTableName(schema);
        var parameters = [ id, interval ];
        var sql = `
            UPDATE ${table}
            SET ltime = NOW() + CAST($2 AS INTERVAL)
            WHERE id = $1 AND (ltime IS NULL OR ltime < NOW())
            RETURNING ${columns}
        `;
        return db.query(sql, parameters).get(0).then((row) => {
            if (!row) {
                throw new Error('Unable to establish lock on row');
            }
            return row;
        });
    },

    /**
     * Update a row then unlock it
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Number} id
     * @param  {Object} props
     * @param  {String} columns
     *
     * @return {Promise<Object>}
     */
    unlock: function(db, schema, id, props, columns) {
        var table = this.getTableName(schema);
        var assignments = [];
        var parameters = [ id ];
        var index = parameters.length + 1;
        _.each(_.keys(this.columns), (name, i) => {
            if (name !== 'id') {
                var value = props[name];
                if (value !== undefined) {
                    var bound = '$' + index++;
                    parameters.push(value);
                    assignments.push(`${name} = ${bound}`);
                }
            }
        });
        var sql = `
            UPDATE ${table}
            SET ${assignments.join(',')}, ltime = NULL, dirty = false
            WHERE id = $1 AND ltime >= NOW()
            RETURNING ${columns}
        `;
        return db.query(sql, parameters).get(0).then((row) => {
            if (!row) {
                throw new Error('Unable to update row')
            }
            return row;
        });
    },

    /**
     * Mark rows as dirty
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<Number>} ids
     *
     * @return {Promise}
     */
    invalidate: function(db, schema, ids) {
        var table = this.getTableName(schema);
        var parameters = [ ids ];
        var sql = `
            UPDATE ${table} SET dirty = true
            WHERE id = ANY($1) RETURNING id, dirty
        `;
        return db.execute(sql, parameters).return();
    },

    /**
     * Update a row's access time
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object} row
     */
    touch: function(db, schema, row) {
        var now = new Date;
        setTimeout(() => {
            Database.open().then((db) => {
                this.updateOne(db, schema, {
                    id: row.id,
                    atime: now.toISOString(),
                });
            });
        }, 20);
    },

    /**
     * Look up rows from the database,
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object} keys
     * @param  {Array<Object>} expectedRows
     * @param  {String} columns
     *
     * @return {Array<Object>}
     */
    vivify: function(db, schema, keys, expectedRows, columns) {
        // we need these columns in order to tell which rows are missing
        var keyColumns = _.keys(keys);
        var columnsNeeded = columns + ', ' + keyColumns.join(', ');
        return Data.find.call(this, db, schema, keys, columnsNeeded).then((existingRows) => {
            // find missing rows
            var missingRows = [];
            _.each(expectedRows, (expectedRow) => {
                // search only by keys
                var search = _.pick(expectedRow, keyColumns);
                if (!_.find(existingRows, search)) {
                    // make row dirty initially
                    var newRow = _.extend({ dirty: true }, expectedRow)
                    missingRows.push(newRow);
                }
            });
            // add the ones that are missing
            return Data.insert.call(this, db, schema, missingRows).then((newRows) => {
                return _.concat(newRows.reverse(), existingRows);
            });
        });
    },
});
