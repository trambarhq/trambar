var _ = require('lodash');
var Promise = require('bluebird');

var LiveData = require('accessors/live-data');

module.exports = _.create(LiveData, {
    schema: 'project',
    table: 'listing',
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
        type: String,
        target_user_id: Number,
        role_ids: Array(Number),
        story_ids: Array(Number),
        candidate_ids: Array(Number),
    },
    criteria: {
        id: Number,
        deleted: Boolean,
        dirty: Boolean,
        type: String,
        target_user_id: Number,
        role_ids: Array(Number),
        story_ids: Array(Number),
        candidate_ids: Array(Number),
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
                type varchar(32) NOT NULL,
                target_user_id int NOT NULL,
                role_ids int[],
                story_ids int[] NOT NULL DEFAULT '{}'::int[],
                candidate_ids int[] NOT NULL DEFAULT '{}'::int[],
                PRIMARY KEY (id)
            );
        `;
        return db.execute(sql);
    },
});
