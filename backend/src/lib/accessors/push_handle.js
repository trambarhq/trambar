var _ = require('lodash');
var Data = require('accessors/data');

module.exports = _.create(Data, {
    schema: 'global',
    table: 'push_handle',
    columns: {
        id: Number,
        gn: Number,
        deleted: Boolean,
        ctime: String,
        mtime: String,
        details: Object,
        user_id: Number,
        token: String,
        details: Object,
    },
    criteria: {
        id: Number,
        deleted: Boolean,
        user_id: Number,
        token: String,
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
        var table = `"global"."${this.table}"`;
        var sql = `
            CREATE TABLE ${table} (
                id serial,
                gn int NOT NULL DEFAULT 1,
                deleted boolean NOT NULL DEFAULT false,
                ctime timestamp NOT NULL DEFAULT NOW(),
                mtime timestamp NOT NULL DEFAULT NOW(),
                details jsonb NOT NULL DEFAULT '{}',
                user_id int NOT NULL,
                token varchar(64) NOT NULL,
                PRIMARY KEY (id)
            );
        `;
        return db.execute(sql);
    },
});
