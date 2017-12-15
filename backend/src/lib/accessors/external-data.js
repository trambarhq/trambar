var _ = require('lodash');
var Promise = require('bluebird');
var HttpError = require('errors/http-error');
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
                        return _.mapValues(link, (value, name) => {
                            if (typeof(value) === 'object') {
                                // export only the ids
                                if (value.hasOwnProperty('id')) {
                                    return { id: value.id };
                                } else if (value.hasOwnProperty('ids')) {
                                    return { ids: value.ids };
                                }
                            } else {
                                return value;
                            }
                        });
                    });
                }
            });
            return objects;
        });
    },

});
