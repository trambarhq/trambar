var _ = require('lodash');
var Data = require('accessors/data');

module.exports = _.create(Data, {
    schema: 'global',
    table: 'push_endpoint',
    columns: {
        id: Number,
        gn: Number,
        deleted: Boolean,
        ctime: String,
        mtime: String,
        details: Object,
        handle_token: String,
        device_registration_id: String,
    },
    criteria: {
        id: Number,
        deleted: Boolean,
        device_registration_id: String,
        handle_token: String,
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
                handle_token varchar(64) NOT NULL,
                device_registration_id varchar(1024) NOT NULL,
                PRIMARY KEY (id)
            );
        `;
        return db.execute(sql);
    },
});
