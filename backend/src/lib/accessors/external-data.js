var _ = require('lodash');
var Promise = require('bluebird');
var HTTPError = require('errors/http-error');
var Data = require('accessors/data');
var StoredProcs = require('stored-procs/functions');

module.exports = _.create(Data, {
    columns: {
        id: Number,
        gn: Number,
        deleted: Boolean,
        ctime: String,
        mtime: String,
        details: Object,
        external: Array(Object),
        itime: String,
        etime: String,
    },
    criteria: {
        id: Number,
        deleted: Boolean,

        external_object: Object,
    },

    /**
     * Create table in schema
     *
     * (for reference purpose only)
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
                external jsonb[] NOT NULL DEFAULT '{}',
                itime timestamp,
                etime timestamp,
                PRIMARY KEY (id)
            );
        `;
        return db.execute(sql);
    },

    /**
     * Add conditions to SQL query based on criteria object
     *
     * @param  {Object} criteria
     * @param  {Object} query
     */
    apply: function(criteria, query) {
        var special = [
            'external_object',
        ];
        Data.apply.call(this, _.omit(criteria, special), query);
        var params = query.parameters;
        var conds = query.conditions;
        if (criteria.external_object !== undefined) {
            // use the same function as the database to generate the id strings
            var external = [ criteria.external_object ];
            var serverType = criteria.external_object.type || '';
            var objectNames = _.transform(criteria.external_object, (names, object, name) => {
                if (object.id || object.ids instanceof Array) {
                    names.push(name);
                }
            }, []);
            var idStrings = StoredProcs.externalIdStrings(external, serverType, objectNames);
            if (serverType && !/^\w+$/.test(serverType)) {
                throw new Error(`Invalid type: "${serverType}"`);
            }
            _.each(objectNames, (name) => {
                if (!/^\w+$/.test(name)) {
                    throw new Error(`Invalid property name: "${name}"`);
                }
            });
            conds.push(`"externalIdStrings"(external, '${serverType}', '{${objectNames}}'::text[]) && $${params.push(idStrings)}`);
        }
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
                if (row.external.length > 0) {
                    object.external = _.map(row.external, (link) => {
                        return _.pickBy(link, (value, name) => {
                            // don't send property with _ prefix
                            return (name.charAt(0) !== '_');
                        });
                    });
                }
            });
            return objects;
        });
    },

    /**
     * Attach a trigger to the table that increment the gn (generation number)
     * when a row is updated. Also add triggers that send notification messages.
     *
     * @param  {Database} db
     * @param  {String} schema
     *
     * @return {Promise<Boolean>}
     */
    createChangeTrigger: function(db, schema) {
        var table = this.getTableName(schema);
        var sql = `
            CREATE TRIGGER "indicateDataChangeOnUpdate"
            BEFORE UPDATE ON ${table}
            FOR EACH ROW
            EXECUTE PROCEDURE "indicateDataChangeEx"();
        `;
        return db.execute(sql).return(true);
    },

    /**
     * Add triggers that send notification messages, bundled with values of
     * the specified properties.
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<String>} propNames
     *
     * @return {Promise<Boolean>}
     */
    createNotificationTriggers: function(db, schema, propNames) {
        var table = this.getTableName(schema);
        var args = _.map(propNames, (propName) => {
            // use quotes just in case the name is mixed case
            return `"${propName}"`;
        }).join(', ');
        var sql = `
            CREATE CONSTRAINT TRIGGER "notifyDataChangeOnInsert"
            AFTER INSERT ON ${table} INITIALLY DEFERRED
            FOR EACH ROW
            EXECUTE PROCEDURE "notifyDataChangeEx"(${args});
            CREATE CONSTRAINT TRIGGER "notifyDataChangeOnUpdate"
            AFTER UPDATE ON ${table} INITIALLY DEFERRED
            FOR EACH ROW
            EXECUTE PROCEDURE "notifyDataChangeEx"(${args});
            CREATE CONSTRAINT TRIGGER "notifyDataChangeOnDelete"
            AFTER DELETE ON ${table} INITIALLY DEFERRED
            FOR EACH ROW
            EXECUTE PROCEDURE "notifyDataChangeEx"(${args});
        `;
        return db.execute(sql).return(true);
    },
});
