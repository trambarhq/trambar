var _ = require('lodash');
var Promise = require('bluebird');

var Data = require('accessors/data');

module.exports = _.create(Data, {
    schema: 'project',
    table: 'commit',
    columns: {
        id: Number,
        gn: Number,
        deleted: Boolean,
        ctime: String,
        mtime: String,
        details: Object,
        commit_id: String,
        affected_folder_ids: Array(Number),
        repo_id: Number,
        user_id: Number,
    },
    criteria: {
        id: Number,
        deleted: Boolean,
        commit_id: String,
        affected_folder_ids: Array(Number),
        repo_id: Number,
        user_id: Number,
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
                commit_id varchar(64),
                repo_id int NOT NULL,
                user_id int NOT NULL,
                PRIMARY KEY (id)
            );
        `;
        return db.execute(sql);
    },
});
