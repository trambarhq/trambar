import _ from 'lodash';
import Promise from 'bluebird';
import HTTPError from 'errors/http-error';
import ExternalData from 'accessors/external-data';
import Task from 'accessors/task';
import * as ExternalDataUtils from 'objects/utils/external-data-utils';

const Repo = _.create(ExternalData, {
    schema: 'global',
    table: 'repo',
    columns: {
        id: Number,
        gn: Number,
        deleted: Boolean,
        ctime: String,
        mtime: String,
        details: Object,
        type: String,
        name: String,
        user_ids: Array(Number),
        external: Array(Object),
        exchange: Array(Object),
        itime: String,
        etime: String,
    },
    criteria: {
        id: Number,
        deleted: Boolean,
        type: String,
        name: String,
        user_ids: Array(Number),

        server_id: Number,
        external_object: Object,
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
                type varchar(64) NOT NULL,
                name varchar(128) NOT NULL,
                user_ids int[] NOT NULL DEFAULT '{}'::int[],
                external jsonb[] NOT NULL DEFAULT '{}',
                exchange jsonb[] NOT NULL DEFAULT '{}',
                itime timestamp,
                etime timestamp,
                PRIMARY KEY (id)
            );
        `;
        return db.execute(sql);
    },

    /**
     * Grant privileges to table to appropriate Postgres users
     *
     * @param  {Database} db
     * @param  {String} schema
     *
     * @return {Promise<Boolean>}
     */
    grant: function(db, schema) {
        var table = this.getTableName(schema);
        var sql = `
            GRANT INSERT, SELECT, UPDATE ON ${table} TO admin_role;
            GRANT SELECT ON ${table} TO client_role;
        `;
        return db.execute(sql).return(true);
    },

    /**
     * Attach triggers to the table.
     *
     * @param  {Database} db
     * @param  {String} schema
     *
     * @return {Promise<Boolean>}
     */
    watch: function(db, schema) {
        return this.createChangeTrigger(db, schema).then(() => {
            var propNames = [ 'deleted', 'external', 'mtime', 'itime', 'etime' ];
            return this.createNotificationTriggers(db, schema, propNames).then(() => {
                // completion of tasks will automatically update details->resources
                return Task.createUpdateTrigger(db, schema, 'updateReaction', 'updateResource', [ this.table ]);
            });
        });
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
        return ExternalData.export.call(this, db, schema, rows, credentials, options).then((objects) => {
            _.each(objects, (object, index) => {
                var row = rows[index];
                object.type = row.type;
                object.name = row.name;
                object.user_ids = row.user_ids;
            });
            return objects;
        });
    },

    /**
     * Throw an exception if modifications aren't permitted
     *
     * @param  {Object} repoReceived
     * @param  {Object} repoBefore
     * @param  {Object} credentials
     */
    checkWritePermission: function(repoReceived, repoBefore, credentials) {
        if (credentials.unrestricted) {
            return;
        }
        throw new HTTPError(403);
    },

    /**
     * Mark repos as deleted if they're associated with the provided server id
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object} associations
     *
     * @return {Promise}
     */
    deleteAssociated: function(db, schema, associations) {
        var promises = _.mapValues(associations, (objects, type) => {
            if (_.isEmpty(objects)) {
                return;
            }
            if (type === 'server') {
                return Promise.each(objects, (server) => {
                    var criteria = {
                        external_object: ExternalDataUtils.createLink(server),
                        deleted: false,
                    };
                    return this.updateMatching(db, schema, criteria, { deleted: true });
                });
            }
        });
        return Promise.props(promises);
    },

    /**
     * Clear deleted flag of repos associated with to specified servers
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object} associations
     *
     * @return {Promise}
     */
    restoreAssociated: function(db, schema, associations) {
        var promises = _.mapValues(associations, (objects, type) => {
            if (_.isEmpty(objects)) {
                return;
            }
            if (type === 'server') {
                return Promise.each(objects, (server) => {
                    var criteria = {
                        external_object: ExternalDataUtils.createLink(server),
                        deleted: true,
                    };
                    return this.updateMatching(db, schema, criteria, { deleted: false });
                });
            }
        });
        return Promise.props(promises);
    },
});

export {
    Repo as default,
    Repo
};
