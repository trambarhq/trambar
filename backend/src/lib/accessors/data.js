var _ = require('lodash');
var Promise = require('bluebird');
var HttpError = require('errors/http-error');

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
            if (!/^[\w\-]+$/.test(schema)) {
                throw new Error('Invalid name: ' + schema);
            }
        }
        if (this.schema !== 'both') {
            if (this.schema === 'global' && schema !== 'global') {
                throw new Error('Referencing global table in project-specific schema: ' + this.table);
            }
            if (this.schema === 'project' && schema === 'global') {
                throw new Error('Referencing project-specific table in global schema: ' + this.table);
            }
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

    /**
     * Add conditions to SQL query based on criteria object
     *
     * @param  {Object} criteria
     * @param  {Object} query
     */
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
            var parts = _.split(/\s+/, criteria.order);
            var column = parts[0];
            var dir = _.toLower(parts[1]);
            if (this.columns.hasOwnProperty(column)) {
                query.order = column;
                if (dir === 'asc' || dir === 'desc') {
                    query.order += ' ' + dir;
                }
            }
            query.order = criteria.order;
        }
    },

    /**
     * Look for rows matching criteria
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object} criteria
     * @param  {String} columns
     *
     * @return {Promise<Array>}
     */
    find: function(db, schema, criteria, columns) {
        var table = this.getTableName(schema);
        var query = {
            conditions: [],
            parameters: [],
            order: 'id DESC',
            columns: columns,
            table: table,
            limit: 50000
        };
        var promise = this.apply(criteria, query);
        if (promise && promise.then instanceof Function) {
            // apply() returns a promise--wait for it to resolve
            promise.then(() => {
                return this.run(db, query);
            });
        } else {
            // run query immediately
            return this.run(db, query);
        }
    },

    /**
     * Run a query
     *
     * @param  {Database} db
     * @param  {Object} query
     *
     * @return {Promise<Array>}
     */
    run: function(db, query) {
        var sql = `
            SELECT ${query.columns}
            FROM ${query.table}
            WHERE ${query.conditions.join(' AND ') || true}
            ORDER BY ${query.order}
            LIMIT ${query.limit}
        `;
        return db.query(sql, query.parameters);
    },

    /**
     * Look for one row
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object} criteria
     * @param  {String} columns
     *
     * @return {Promise<Object>}
     */
    findOne: function(db, schema, criteria, columns) {
        return this.find(db, schema, criteria, columns).get(0).then((row) => {
            return row || null;
        });
    },

    /**
     * Update multiple rows
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<Object>} rows
     *
     * @return {Promise<Array>}
     */
    update: function(db, schema, rows) {
        return Promise.mapSeries(rows, (row) => {
            return this.updateOne(db, schema, row);
        });
    },

    /**
     * Update one row
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object} row
     *
     * @return {Promise<Object>}
     */
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
     * @param  {Object} options
     *
     * @return {Promise<Array>}
     */
    export: function(db, schema, rows, credentials, options) {
        var objects = _.map(rows, (row) => {
            var object = {
                id: row.id,
                gn: row.gn,
                details: row.details,
            };
            if (row.deleted) {
                object.deleted = row.deleted;
            }
            if (options.include_ctime) {
                object.ctime = row.ctime;
            }
            if (options.include_mtime) {
                object.mtime = row.mtime;
            }
            return object;
        });
        return Promise.resolve(objects);
    },

    /**
     * Import objects sent by client-side code, applying access control
     *
     * @param  {Database} db
     * @param  {Schema} schema
     * @param  {Array<Object>} objects
     * @param  {Array<Object>} originals
     * @param  {Object} credentials
     * @param  {Object} options
     *
     * @return {Promise<Array>}
     */
    import: function(db, schema, objects, originals, credentials, options) {
        return Promise.map(objects, (object) => {
            // these properties cannot be modified from the client side
            if (object.hasOwnProperty('gn') || object.hasOwnProperty('ctime') || object.hasOwnProperty('mtime')) {
                return _.omit(object, 'gn', 'ctime', 'mtime');
            }
            return object;
        });
        return Promise.resolve(objects);
    },

    /**
     * [description]
     *
     * @param  {Database} db
     * @param  {Schema} schema
     * @param  {Array<Object>} objects
     * @param  {Array<Object>} originals
     * @param  {Array<Object>} rows
     * @param  {Object} credentials
     *
     * @return {Promise}
     */
    associate: function(db, schema, objects, originals, rows, credentials) {
        return Promise.resolve();
    },
};
