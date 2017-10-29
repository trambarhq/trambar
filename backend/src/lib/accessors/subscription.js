var _ = require('lodash');
var Promise = require('bluebird');
var Data = require('accessors/data');
var HttpError = require('errors/http-error');

module.exports = _.create(Data, {
    schema: 'global',
    table: 'subscription',
    columns: {
        id: Number,
        gn: Number,
        deleted: Boolean,
        ctime: String,
        mtime: String,
        details: Object,
        user_id: Number,
        area: String,
        address: String,
        token: String,
        schema: String,
        locale: String,
    },
    criteria: {
        id: Number,
        deleted: Boolean,
        address: String,
        user_id: Number,
        area: String,
        token: String,
        schema: String,
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
                user_id int NOT NULL,
                area varchar(32) NOT NULL,
                address varchar(256) NOT NULL,
                token varchar(64) NOT NULL,
                schema varchar(256) NOT NULL,
                locale varchar(16) NOT NULL,
                PRIMARY KEY (id)
            );
            CREATE INDEX ON ${table} (token);
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
            GRANT INSERT, SELECT, UPDATE, DELETE ON ${table} TO admin_role;
            GRANT INSERT, SELECT, UPDATE, DELETE ON ${table} TO client_role;
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
        return this.createChangeTrigger(db, schema);
    },

    /**
     * Import objects sent by client-side code, applying access control
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<Object>} objects
     * @param  {Array<Object>} originals
     * @param  {Object} credentials
     * @param  {Object} options
     *
     * @return {Promise<Array>}
     */
    import: function(db, schema, objects, originals, credentials, options) {
        return Data.import.call(this, db, schema, objects, originals, credentials, options).then((objects) => {
            return Promise.each(objects, (object) => {
                if (object.hasOwnProperty('area')) {
                    if (object.area !== credentials.area) {
                        console.log(`${object.area} !== ${credentials.area}`)
                        throw new HttpError(400);
                    }
                }
                if (object.schema === '*') {
                    if (credentials.area !== 'admin') {
                        throw new HttpError(400);
                    }
                } else if (object.schema !== 'global') {
                    // don't allow user to subscribe to a project that he has
                    // no access to
                    var Project = require('accessors/project');
                    var criteria = {
                        name: object.schema,
                        deleted: false,
                    };
                    return Project.findOne(db, schema, criteria, '*').then((project) => {
                        if (!Project.checkAccess(project, credentials.user, 'read')) {
                            console.log(schema, project, credentials.user);
                            throw new HttpError(400);
                        }
                    });
                }
            }).return(objects);
        });
    },
});
