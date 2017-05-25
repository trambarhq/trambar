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
        if (!/^\w+$/.test(schema)) {
            throw new Error('Invalid name: ' + schema);
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
        var privileges = 'INSERT, SELECT, UPDATE, DELETE';
        var sql = `
            GRANT ${privileges} ON ${table} TO internal_role;
            GRANT ${privileges} ON ${table} TO webfacing_role;
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
                        conds.push(`${name} && ${bound}`)
                    } else {
                        // contains
                        conds.push(`${name} @> ${bound}`)
                    }
                } else {
                    if (value instanceof Array) {
                        // equals any
                        conds.push(`${name} = ANY(${bound})`)
                    } else {
                        // equals
                        conds.push(`${name} = ${bound}`)
                    }

                }
            }
        });

        if (criteria.limit) {
            riteria.limit = criteria.limit;
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

    update: function(db, schema, objects) {
        return Promise.mapSeries(objects, (object) => {
            return this.updateOne(db, schema, object);
        });
    },

    updateOne: function(db, schema, object) {
        var table = this.getTableName(schema);
        var assignments = [];
        var columns = _.keys(this.columns);
        var parameters = [];
        var index = 1;
        var id = 0;
        _.each(columns, (name, i) => {
            var value = object[name];
            if (name !== 'id') {
                var bound = '$' + index++;
                parameters.push(value);
                assignments.push(`${name} = ${bound}`);
            } else {
                id = value;
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

    insert: function(db, schema, objects) {
        var table = this.getTableName(schema);
        var valueSets = [];
        var parameters = [];
        var index = 1;
        _.each(objects, (object) => {
            var values = [];
            _.forIn(columnsNoId, (name) => {
                if (object.hasOwnProperty(name) && name !== 'id') {
                    var value = object[name];
                    var bound = '$' + index++;
                    parameters.push(value);
                    values.push(bound);
                }
            });
            valueSets.push(`(${values.join(',')})`);
        });
        var sql = `
            INSERT INTO ${table}
            VALUES ${valueSets.join(',')}
            RETURNING *
        `;
        return db.query(sql, parameters);
    },

    insertOne: function(db, schema, object) {
        return this.insert(db, schema, [ object ]).get(0).then((row) => {
            return row || null;
        });
    },

    save: function(db, schema, objects) {
        var updates = _.filter(objects, (object) => {
            return object.id > 0;
        });
        var inserts = _.filter(objects, (object) => {
            return !(object.id > 0);
        });
        return this.update(db, schema, updates).then((updatedObjects) => {
            return this.insert(db, schema, inserts).then((insertedObjects) => {
                return _.concat(updatedObjects, insertedObjects);
            });
        });
    },

    saveOne: function(db, schema, object) {
        if (object.id > 0) {
            return this.updateOne(db, schema, object);
        } else {
            return this.insertOne(db, schema, object);
        }
    },

    remove: function(db, schema, objects) {
        var table = this.getTableName(schema);
        var ids = _.map(objects, 'id');
        var parameters = [ ids ];
        var bound = '$1';
        var sql = `
            DELETE FROM ${table}
            WHERE id = ANY(${bound});
            RETURNING *
        `;
        return db.query(sql, parameters);
    },

    removeOne: function(db, object) {
        return this.remove(db, [ object ]).get(0).then((row) => {
            return row || null;
        });
    },

    export: function(db, schema, objects, credentials) {
        return objects;
    },

    import: function(db, schema, objects, originals, credentials) {
        return objects;
    },
};
