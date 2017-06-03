var _ = require('lodash');
var Promise = require('bluebird');

var Data = require('accessors/data');

module.exports = _.create(Data, {
    schema: 'project',
    table: 'reaction',
    columns: {
        id: Number,
        gn: Number,
        deleted: Boolean,
        ctime: String,
        mtime: String,
        details: Object,
        type: String,
        story_id: Number,
        user_id: Number,
        target_user_id: Number,
        published: Boolean,
        ptime: String,
        public: Boolean,
    },
    criteria: {
        id: Number,
        deleted: Boolean,
        type: String,
        story_id: Number,
        user_id: Number,
        target_user_id: Number,
        published: Boolean,
        public: Boolean,
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
                type varchar(32),
                story_id int NOT NULL,
                user_id int,
                target_user_id int,
                published boolean NOT NULL DEFAULT false,
                ptime timestamp,
                public boolean NOT NULL DEFAULT false,
                PRIMARY KEY (id)
            );
        `;
        return db.execute(sql);
    },

    /**
     * Export database row to client-side code, omitting sensitive or
     * unnecessary information
     *
     * @param  {Database} db
     * @param  {Schema} schema
     * @param  {Object} row
     * @param  {Object} credentials
     *
     * @return {Promise<Object>}
     */
    export: function(db, schema, row, credentials) {
        return Promise.try(() => {
            var object = {
                id: row.id,
                gn: row.gn,
                details: row.details,
                type: row.type,
                story_id: row.story_id,
                user_id: row.user_id,
                ptime: row.ptime,
                public: row.public,
            };
            return object;
        });
    }
});
