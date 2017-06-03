var _ = require('lodash');
var Promise = require('bluebird');

var Data = require('accessors/data');

module.exports = _.create(Data, {
    schema: 'project',
    table: 'story',
    columns: {
        id: Number,
        gn: Number,
        deleted: Boolean,
        ctime: String,
        mtime: String,
        details: Object,
        type: String,       // post, commit, merge, deployment, issue, task-start, task-end, survey
        related_object_id: Number,
        user_ids: Array(Number),
        role_ids: Array(Number),
        published: Boolean,
        ptime: String,
        public: Boolean,
    },
    criteria: {
        id: Number,
        deleted: Boolean,
        type: String,
        related_object_id: Number,
        user_ids: Array(Number),
        role_ids: Array(Number),
        published: Boolean,
        public: Boolean,
        time_range: String,
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
                related_object_id int,
                user_ids int[] NOT NULL DEFAULT '{}'::int[],
                role_ids int[] NOT NULL DEFAULT '{}'::int[],
                published boolean NOT NULL DEFAULT false,
                ptime timestamp,
                public boolean NOT NULL DEFAULT false,
                PRIMARY KEY (id)
            );
        `;
        return db.execute(sql);
    },

    apply: function(criteria, query) {
        var special = [ 'time_range' ];
        Data.apply.call(this, _.omit(criteria, special), query);

        var params = query.parameters;
        var conds = query.conditions;
        if (criteria.time_range) {
            params.push(criteria.time_range);
            conds.push(`ptime <@ $${params.length}::tsrange`);
        }
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
                user_ids: row.user_ids,
                role_ids: row.role_ids,
                ptime: row.ptime,
                public: row.public,
            };
            if (row.related_object_id) {
                switch (row.type) {
                    case 'commit':
                        object.commit_id = row.related_object_id;
                        break;
                    case 'issue':
                        object.issue_id = row.related_object_id;
                        break;
                }
            }
            return object;
        });
    }
});
