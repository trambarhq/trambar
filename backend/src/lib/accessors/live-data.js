var _ = require('lodash');
var Promise = require('bluebird');

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
     * Lock a row for updates
     *
     * @param  {Database} db
     * @param  {Number} id
     * @param  {String} interval
     *
     * @return {Promise<Boolean>}
     */
    lock: function(db, id, interval) {
        var parameters = [ interval, id ];
        var sql = `
            UPDATE ${table}
            SET ltime = NOW() + INTERVAL $1
            WHERE id = $2 AND (ltime IS NULL OR ltime < NOW())
        `;
        return db.execute(sql).then((result) => {
            return result.rowCount > 0;
        });
    },

    /**
     * Update a row then unlock it
     *
     * @param  {Database} db
     * @param  {Number} id
     * @param  {Object} props
     *
     * @return {Promise<Boolean}
     */
    unlock: function(db, id, props) {
        var assignments = [];
        var parameters = [];
        var index = 1;
        _.each(_.keys(this.columns), (name, i) => {
            if (name !== 'id') {
                var value = object[name];
                var bound = '$' + (i + 1);
                parameters.push(value);
                assignments.push(`${name} = ${bound}`);
            }
        });
        var sql = `
            UPDATE ${table}
            SET ${assignments.join(',')}, ltime = NULL
            WHERE id = $2 AND ltime >= NOW()
        `;
        return db.execute(sql).then((result) => {
            return result.rowCount > 0;
        });
    },
});
