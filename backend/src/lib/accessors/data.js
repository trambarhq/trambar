var _ = require('lodash');
var Promise = require('bluebird');

module.exports = {
    schema: 'global',
    table: 'data',
    columns: {
        id: Number,
        gn: Number,
        deleted: Boolean,
        ctime: String,
        mtime: String,
        details: Object,
    },
    criteria: {
        id: Number,
        deleted: Boolean,
    },
    version: 1,

    /**
     * Return fully-qualify name of table
     *
     * @param  {String} schema
     *
     * @return {String}
     */
    getTableName: function(schema) {
        // allow non-alphanumeric schema name during testing
        if (!process.env.DOCKER_MOCHA) {
            if (!/^\w+$/.test(schema)) {
                throw new Error('Invalid name: ' + schema);
            }
        }
        if (this.schema === 'global' && schema !== 'global') {
            throw new Error('Referencing global table in project-specific schema: ' + this.table);
        }
        if (this.schema === 'project' && schema === 'global') {
            throw new Error('Referencing project-specific table in global schema: ' + this.table);
        }
        return `"${schema}"."${this.table}"`;
    },

    /**
     * Create table in schema
     *
     * @param  {Database} db
     * @param  {String} schema
     *
     * @return {Promise<Boolean>}
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
                PRIMARY KEY (id)
            );
        `;
        return db.execute(sql).return(true);
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
     * Attach a trigger to the table that increment the gn (generation number)
     * when a row is updated. Also add triggers that send notification messages.
     *
     * @param  {Database} db
     * @param  {String} schema
     *
     * @return {Promise<Boolean>}
     */
    watch: function(db, schema) {
        var table = this.getTableName(schema);
        var sql = [
            `
                CREATE TRIGGER "indicateDataChangeOnUpdate"
                BEFORE UPDATE ON ${table}
                FOR EACH ROW
                EXECUTE PROCEDURE "indicateDataChange"();
            `,
            `
                CREATE CONSTRAINT TRIGGER "notifyDataChangeOnInsert"
                AFTER INSERT ON ${table} INITIALLY DEFERRED
                FOR EACH ROW
                EXECUTE PROCEDURE "notifyDataChange"();
            `,
            `
                CREATE CONSTRAINT TRIGGER "notifyDataChangeOnUpdate"
                AFTER UPDATE ON ${table} INITIALLY DEFERRED
                FOR EACH ROW
                EXECUTE PROCEDURE "notifyDataChange"();
            `,
            `
                CREATE CONSTRAINT TRIGGER "notifyDataChangeOnDelete"
                AFTER DELETE ON ${table} INITIALLY DEFERRED
                FOR EACH ROW
                EXECUTE PROCEDURE "notifyDataChange"();
            `,
        ];
        return db.execute(sql.join('\n')).return(true);
    },

    /**
     * Upgrade table in schema to given DB version (from one version prior)
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Number} version
     *
     * @return {Promise<Boolean>}
     */
    upgrade: function(db, schema, version) {
        return Promise.resolve(false);
    },

    apply: function(criteria, query) {
        var params = query.parameters;
        var conds = query.conditions;
        _.forIn(this.criteria, (type, name) => {
            var index = params.length + 1;
            if (criteria.hasOwnProperty(name)) {
                // assume that none of the column names requires double quotes
                var value = criteria[name];
                var bound = '$' + index++;
                params.push(value);
                if (type === Array || type instanceof Array) {
                    if (value instanceof Array) {
                        // overlaps
                        conds.push(`${name} && ${bound}`);
                    } else {
                        // contains
                        conds.push(`${name} @> ${bound}`);
                    }
                } else {
                    if (value instanceof Array) {
                        // equals any
                        conds.push(`${name} = ANY(${bound})`);
                    } else if (value === null) {
                        params.pop();
                        index--;
                        conds.push(`${name} IS NULL`);
                    } else {
                        // equals
                        conds.push(`${name} = ${bound}`);
                    }

                }
            }
        });

        if (criteria.fn !== undefined) {
            if (criteria.fn === null) {
                conds.push(`details->>'fn' IS NULL`);
            } else {
                params.push(criteria.fn);
                conds.push(`details->>'fn' = ${'$' + params.length}`);
            }
        }
        if (criteria.limit) {
            criteria.limit = criteria.limit;
        }
        if (criteria.order) {
            query.order = criteria.order;
        }
    },

    find: function(db, schema, criteria, columns) {
        var table = this.getTableName(schema);
        var query = {
            conditions: [],
            parameters: [],
            order: 'id DESC',
            limit: 50000
        };
        this.apply(criteria, query);
        var sql = `
            SELECT ${columns}
            FROM ${table}
            WHERE ${query.conditions.join(' AND ') || true}
            LIMIT ${query.limit}
        `;
        return db.query(sql, query.parameters);
    },

    findOne: function(db, schema, criteria, columns) {
        return this.find(db, schema, criteria, columns).get(0).then((row) => {
            return row || null;
        });
    },

    update: function(db, schema, rows) {
        return Promise.mapSeries(rows, (row) => {
            return this.updateOne(db, schema, row);
        });
    },

    updateOne: function(db, schema, row) {
        var table = this.getTableName(schema);
        var assignments = [];
        var columns = _.keys(this.columns);
        var parameters = [];
        var index = 1;
        var id = 0;
        _.each(columns, (name) => {
            if (row.hasOwnProperty(name)) {
                var value = row[name];
                if (name !== 'id') {
                    var bound = '$' + index++;
                    parameters.push(value);
                    assignments.push(`${name} = ${bound}`);
                } else {
                    id = value;
                }
            }
        });
        parameters.push(id);
        var sql = `
            UPDATE ${table}
            SET ${assignments.join(', ')}
            WHERE id = $${index}
            RETURNING *
        `;
        return db.query(sql, parameters).get(0).then((row) => {
            return row || null;
        });
    },

    insert: function(db, schema, rows) {
        if (_.isEmpty(rows)) {
            return Promise.resolve([]);
        }
        var table = this.getTableName(schema);
        var valueSets = [];
        var parameters = [];
        var columns = _.keys(this.columns);
        var columnsPresent = [];
        var index = 1;
        var manualId = false;
        // see which columns are being set
        _.each(rows, (row) => {
            _.each(columns, (name) => {
                if (row.hasOwnProperty(name)) {
                    if (columnsPresent.indexOf(name) === -1) {
                        columnsPresent.push(name);
                        if (name === 'id') {
                            manualId = true;
                        }
                    }
                }
            });
        });
        _.each(rows, (row) => {
            var values = [];
            _.each(columnsPresent, (name) => {
                if (row.hasOwnProperty(name)) {
                    var value = row[name];
                    var bound = '$' + index++;
                    parameters.push(value);
                    values.push(bound);
                } else {
                    values.push('DEFAULT');
                }
            });
            valueSets.push(`(${values.join(',')})`);
        });
        var sql = `
            INSERT INTO ${table} (${columnsPresent.join(', ')})
            VALUES ${valueSets.join(',')}
            RETURNING *
        `;
        return db.query(sql, parameters).then((rows) => {
            if (manualId) {
                var sequence = `"${schema}"."${this.table}_id_seq"`;
                var sql = `
                    SELECT setval('${sequence}', COALESCE((SELECT MAX(id) FROM ${table}), 0));
                `;
                return db.query(sql).return(rows);
            } else {
                return rows;
            }
        });
    },

    insertOne: function(db, schema, row) {
        return this.insert(db, schema, [ row ]).get(0).then((row) => {
            return row || null;
        });
    },

    save: function(db, schema, rows) {
        var updates = _.filter(rows, (row) => {
            return row.id > 0;
        });
        var inserts = _.filter(rows, (row) => {
            return !(row.id > 0);
        });
        return this.update(db, schema, updates).then((updatedObjects) => {
            return this.insert(db, schema, inserts).then((insertedObjects) => {
                return _.concat(updatedObjects, insertedObjects);
            });
        });
    },

    saveOne: function(db, schema, row) {
        if (row.id > 0) {
            return this.updateOne(db, schema, row);
        } else {
            return this.insertOne(db, schema, row);
        }
    },

    remove: function(db, schema, rows) {
        var table = this.getTableName(schema);
        var ids = _.map(rows, 'id');
        var parameters = [ ids ];
        var bound = '$1';
        var sql = `
            DELETE FROM ${table}
            WHERE id = ANY(${bound})
            RETURNING *
        `;
        return db.query(sql, parameters);
    },

    removeOne: function(db, schema, row) {
        return this.remove(db, schema, [ row ]).get(0).then((row) => {
            return row || null;
        });
    },

    /**
     * Export database row to client-side code, omitting sensitive or
     * unnecessary information
     *
     * @param  {Database} db
     * @param  {Schema} schema
     * @param  {Array<Object>} rows
     * @param  {Object} credentials
     *
     * @return {Promise<Array>}
     */
    export: function(db, schema, rows, credentials) {
        return Promise.map(rows, (row) => {
            return _.omit(row, 'ctime', 'mtime', 'deleted');
        });
    },

    /**
     * Import objects sent by client-side code, applying access control
     *
     * @param  {Database} db
     * @param  {Schema} schema
     * @param  {Array<Object>} objects
     * @param  {Array<Object>} originals
     * @param  {Object} credentials
     *
     * @return {Promise<Array>}
     */
    import: function(db, schema, objects, originals, credentials) {
        return Promise.resolve(objects);
    },

    /**
     * [description]
     *
     * @param  {Database} db
     * @param  {Schema} schema
     * @param  {Array<Object>} rows
     * @param  {Array<Object>} originals
     * @param  {Object} credentials
     *
     * @return {Promise<Array>}
     */
    associate: function(db, schema, rows, originals, credentials) {
        return Promise.resolve(rows);
    },
};
