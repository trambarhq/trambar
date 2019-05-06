import _ from 'lodash';

class Data {
    constructor() {
        this.schema = '?';
        this.table = '?';
        this.columns = {
            id: Number,
            gn: Number,
            deleted: Boolean,
            ctime: String,
            mtime: String,
            details: Object,
        };
        this.criteria = {
            id: Number,
            deleted: Boolean,
        };
        this.accessControlColumns = {
        };
        this.version = 1;
    }

    /**
     * Return fully-qualify name of table
     *
     * @param  {String} schema
     *
     * @return {String}
     */
    getTableName(schema) {
        // allow non-alphanumeric schema name during testing
        if (!process.env.DOCKER_MOCHA) {
            if (!/^[\w\-]+$/.test(schema)) {
                throw new Error(`Invalid name: "${schema}"`);
            }
        }
        if (this.schema !== 'both') {
            if (this.schema === 'global' && schema !== 'global') {
                throw new Error(`Referencing global table "${this.table}" in project-specific schema "${schema}"`);
            }
            if (this.schema === 'project' && schema === 'global') {
                throw new Error(`Referencing project-specific "${this.table}" table in global schema`);
            }
        }
        return `"${schema}"."${this.table}"`;
    }

    /**
     * Create table in schema
     *
     * (for reference purpose only)
     *
     * @param  {Database} db
     * @param  {String} schema
     *
     * @return {Promise}
     */
    async create(db, schema) {
        let table = this.getTableName(schema);
        let sql = `
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
        await db.execute(sql)
    }

    /**
     * Grant privileges to table to appropriate Postgres users
     *
     * @param  {Database} db
     * @param  {String} schema
     *
     * @return {Promise}
     */
    async grant(db, schema) {
        let table = this.getTableName(schema);
        let sql = `
            GRANT INSERT, SELECT, UPDATE ON ${table} TO admin_role;
            GRANT INSERT, SELECT, UPDATE ON ${table} TO client_role;
        `;
        await db.execute(sql);
    }

    /**
     * Attach triggers to the table.
     *
     * @param  {Database} db
     * @param  {String} schema
     *
     * @return {Promise}
     */
    async watch(db, schema) {
    }

    /**
     * Attach a trigger to the table that increment the gn (generation number)
     * when a row is updated. Also add triggers that send notification messages.
     *
     * @param  {Database} db
     * @param  {String} schema
     *
     * @return {Promise}
     */
    async createChangeTrigger(db, schema) {
        let table = this.getTableName(schema);
        let sql = `
            CREATE TRIGGER "indicateDataChangeOnUpdate"
            BEFORE UPDATE ON ${table}
            FOR EACH ROW
            EXECUTE PROCEDURE "indicateDataChange"();
        `;
        await db.execute(sql);
    }

    /**
     * Add triggers that send notification messages, bundled with values of
     * the specified properties.
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<String>} propNames
     *
     * @return {Promise}
     */
    async createNotificationTriggers(db, schema, propNames) {
        let table = this.getTableName(schema);
        let args = _.map(propNames, (propName) => {
            // use quotes just in case the name is mixed case
            return `"${propName}"`;
        }).join(', ');
        let sql = `
            CREATE CONSTRAINT TRIGGER "notifyDataChangeOnInsert"
            AFTER INSERT ON ${table} INITIALLY DEFERRED
            FOR EACH ROW
            EXECUTE PROCEDURE "notifyDataChange"(${args});
            CREATE CONSTRAINT TRIGGER "notifyDataChangeOnUpdate"
            AFTER UPDATE ON ${table} INITIALLY DEFERRED
            FOR EACH ROW
            EXECUTE PROCEDURE "notifyDataChange"(${args});
            CREATE CONSTRAINT TRIGGER "notifyDataChangeOnDelete"
            AFTER DELETE ON ${table} INITIALLY DEFERRED
            FOR EACH ROW
            EXECUTE PROCEDURE "notifyDataChange"(${args});
        `;
        await db.execute(sql);
    }

    /**
     * See if a database change event is relevant to a given user
     *
     * @param  {Object} event
     * @param  {User} user
     * @param  {Subscription} subscription
     *
     * @return {Boolean}
     */
    isRelevantTo(event, user, subscription) {
        if (this.schema === 'global') {
            return true;
        }
        if (subscription.schema === '*' || subscription.schema === event.schema) {
            return true;
        }
        return false;
    }

    /**
     * Throw if current user cannot make modifications
     *
     * @param  {Object} objectReceived
     * @param  {Object} objectBefore
     * @param  {Object} credentials
     */
    checkWritePermission(objectReceived, objectBefore, credentials) {
    }

    /**
     * Upgrade table in schema to given DB version (from one version prior)
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Number} version
     *
     * @return {Promise<Boolean>}
     */
    async upgrade(db, schema, version) {
        return false;
    }

    /**
     * Add conditions to SQL query based on criteria object
     *
     * @param  {Object} criteria
     * @param  {Object} query
     */
    apply(criteria, query) {
        let params = query.parameters;
        let conds = query.conditions;
        for (let [ name, type ] of _.entries(this.criteria)) {
            if (criteria.hasOwnProperty(name)) {
                if (name === 'exclude') {
                    if (criteria.exclude) {
                        conds.push(`NOT (id = ANY($${params.push(criteria.exclude)}))`);
                    }
                } else {
                    // assume that none of the column names requires double quotes
                    let value = criteria[name];
                    if (type === Array || type instanceof Array) {
                        if (value instanceof Array) {
                            // overlaps
                            conds.push(`${name} && $${params.push(value)}`);
                        } else {
                            // contains
                            conds.push(`${name} @> $${params.push(value)}`);
                        }
                    } else {
                        if (value instanceof Array) {
                            // equals any
                            conds.push(`${name} = ANY($${params.push(value)})`);
                        } else if (value === null) {
                            conds.push(`${name} IS NULL`);
                        } else {
                            // equals
                            conds.push(`${name} = $${params.push(value)}`);
                        }
                    }
                }
            }
        }
        if (typeof(criteria.limit) === 'number') {
            query.limit = criteria.limit;
        }
        if (typeof(criteria.order) === 'string') {
            let parts = _.split(criteria.order, /\s+/);
            let column = parts[0];
            let dir = _.toUpper(parts[1]);
            if (/^\w+$/.test(column)) {
                query.order = column;
                if (dir === 'ASC' || dir === 'DESC') {
                    query.order += ' ' + dir;
                }
            }
        }
    }

    /**
     * Look for rows matching criteria
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object|null} criteria
     * @param  {String} columns
     *
     * @return {Promise<Array>}
     */
    async find(db, schema, criteria, columns) {
        if (!criteria) {
            return [];
        }
        let table = this.getTableName(schema);
        let query = {
            conditions: [],
            parameters: [],
            columns: columns,
            table: table,
        };
        if (this.apply.length === 4) {
            // the four-argument form of the function works asynchronously
            await this.apply(db, schema, criteria, query);
        } else {
            this.apply(criteria, query);
        }
        let sql = `SELECT ${query.columns} FROM ${query.table}`;
        if (!_.isEmpty(query.conditions)) {
            sql += ` WHERE ${query.conditions.join(' AND ')}`;
        }
        if (query.order !== undefined) {
            sql += ` ORDER BY ${query.order}`;
        }
        if (query.limit !== undefined) {
            sql += ` LIMIT ${query.limit}`;
        }
        return db.query(sql, query.parameters);
    }

    /**
     * Look for one row
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object|null} criteria
     * @param  {String} columns
     *
     * @return {Promise<Object>}
     */
    async findOne(db, schema, criteria, columns) {
        if (!criteria) {
            return null;
        }
        criteria = _.clone(criteria);
        criteria.limit = 1;
        let rows = await this.find(db, schema, criteria, columns);
        return rows[0] || null;
    }

    /**
     * Update multiple rows
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<Object>} rows
     *
     * @return {Promise<Array>}
     */
    async update(db, schema, rows) {
        let results = [];
        for (let row of rows) {
            let result = await this.updateOne(db, schema, row);
            results.push(result);
        }
        return results;
    }

    /**
     * Update one row
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object|null} row
     *
     * @return {Promise<Object>}
     */
    async updateOne(db, schema, row) {
        if (!row) {
            return null;
        }
        let table = this.getTableName(schema);
        let assignments = [];
        let columns = _.keys(this.columns);
        let parameters = [];
        let id = 0;
        for (let name of columns) {
            if (row.hasOwnProperty(name)) {
                let value = row[name];
                if (value !== undefined) {
                    if (name !== 'id') {
                        if (value instanceof String) {
                            // a boxed string--just insert it into the query
                            assignments.push(`${name} = ${value.valueOf()}`);
                        } else if (value === null) {
                            assignments.push(`${name} = NULL`);
                        } else {
                            assignments.push(`${name} = $${parameters.push(value)}`);
                        }
                    } else {
                        id = value;
                    }
                }
            }
        }
        let sql = `
            UPDATE ${table}
            SET ${assignments.join(', ')}
            WHERE id = $${parameters.push(id)}
            RETURNING *
        `;
        let rows = await db.query(sql, parameters);
        return rows[0] || null;
    }

    /**
     * Update one row
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object|null} criteria
     * @param  {Object} values
     *
     * @return {Promise<Array<Object>>}
     */
    async updateMatching(db, schema, criteria, values) {
        if (!criteria) {
            return [];
        }
        let table = this.getTableName(schema);
        let columns = _.keys(this.columns);
        let assignments = [];
        let parameters = [];
        for (let name of columns) {
            if (values.hasOwnProperty(name)) {
                let value = values[name];
                if (value !== undefined) {
                    if (value instanceof String) {
                        // a boxed string--just insert it into the query
                        assignments.push(`${name} = ${value.valueOf()}`);
                    } else {
                        assignments.push(`${name} = $${parameters.push(value)}`);
                    }
                }
            }
        }
        let query = {
            conditions: [],
            parameters: parameters,
            columns: '*',
            table: table,
        };
        if (this.apply.length === 4) {
            // the four-argument form of the function works asynchronously
            await this.apply(db, schema, criteria, query);
        } else {
            this.apply(criteria, query);
        }
        let sql = `
            UPDATE ${query.table}
            SET ${assignments.join(', ')}
            WHERE ${query.conditions.join(' AND ')}
            RETURNING *
        `;
        return db.query(sql, query.parameters);
    }

    /**
     * Insert rows into table
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<Object>} rows
     *
     * @return {Promise<Array<Object>>}
     */
    async insert(db, schema, rows) {
        if (_.isEmpty(rows)) {
            return [];
        }
        let table = this.getTableName(schema);
        let valueSets = [];
        let parameters = [];
        let columns = _.keys(this.columns);
        let columnsPresent = [];
        let manualID = false;
        // see which columns are being set
        for (let row of rows) {
            for (let name of columns) {
                let value = row[name];
                if (value !== undefined) {
                    if (columnsPresent.indexOf(name) === -1) {
                        columnsPresent.push(name);
                        if (name === 'id') {
                            // inserting primary key
                            manualID = true;
                        }
                    }
                }
            }
        }
        for (let row of rows) {
            let values = [];
            for (let name of columnsPresent) {
                let value = row[name];
                if (value !== undefined) {
                    if (value instanceof String) {
                        // a boxed string--just insert it into the query
                        values.push(value.valueOf());
                    } else if (value === null) {
                        values.push('NULL');
                    } else {
                        values.push(`$${parameters.push(value)}`);
                    }
                } else {
                    values.push('DEFAULT');
                }
            }
            valueSets.push(`(${values.join(',')})`);
        }
        let sql1 = `
            INSERT INTO ${table} (${columnsPresent.join(', ')})
            VALUES ${valueSets.join(',')}
            RETURNING *
        `;
        let results = await db.query(sql1, parameters);
        if (manualID) {
            // update the sequence used for auto-increment primary key
            let sequence = `"${schema}"."${this.table}_id_seq"`;
            let sql2 = `
                SELECT setval('${sequence}', COALESCE((SELECT MAX(id) FROM ${table}), 0));
            `;
            await db.query(sql2);
        }
        return results;
    }

    /**
     * Insert one row into table
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object} row
     *
     * @return {Promise<Object>}
     */
    async insertOne(db, schema, row) {
        if (!row) {
            return null;
        }
        let rows = await this.insert(db, schema, [ row ]);
        return rows[0] || null;
    }

    /**
     * Insert or update rows depending on whether id is present
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<Object>} rows
     *
     * @return {Promise<Array<Object>>}
     */
    async save(db, schema, rows) {
        if (_.isEmpty(rows)) {
            return [];
        }
        let updates = _.filter(rows, (row) => {
            return row.id > 0;
        });
        let inserts = _.filter(rows, (row) => {
            return !(row.id > 0);
        });
        let updatedObjects = await this.update(db, schema, updates);
        let insertedObjects = await this.insert(db, schema, inserts);
        let updatedIndex = 0, insertedIndex = 0;
        return _.map(rows, (row) => {
            if (row.id > 0) {
                return updatedObjects[updatedIndex++];
            } else {
                return insertedObjects[insertedIndex++];
            }
        });
    }

    /**
     * Insert or update a row
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object|null} row
     *
     * @return {Promise<Object>}
     */
    async saveOne(db, schema, row) {
        if (!row) {
            return null;
        }
        if (row.id > 0) {
            return this.updateOne(db, schema, row);
        } else {
            return this.insertOne(db, schema, row);
        }
    }

    /**
     * Delete rows by their ids
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<Object>} rows
     *
     * @return {Promise<Array<Object>>}
     */
    async remove(db, schema, rows) {
        if (!_.isEmpty(rows)) {
            return [];
        }
        let table = this.getTableName(schema);
        let ids = _.map(rows, 'id');
        let parameters = [ ids ];
        let bound = '$1';
        let sql = `
            DELETE FROM ${table}
            WHERE id = ANY(${bound})
            RETURNING *
        `;
        return db.query(sql, parameters);
    }

    /**
     * Delete one row
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object} rows
     *
     * @return {Promise<Object>}
     */
    async removeOne(db, schema, row) {
        if (!row) {
            return null;
        }
        let rows = await this.remove(db, schema, [ row ]);
        return rows[0] || null;
    }

    /**
     * Remove matching rows
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object} criteria
     *
     * @return {Promise<Array<Object>>}
     */
    async removeMatching(db, schema, criteria) {
        if (!criteria) {
            return [];
        }
        let table = this.getTableName(schema);
        let query = {
            conditions: [],
            parameters: [],
            columns: '*',
            table: table,
        };
        if (this.apply.length === 4) {
            // the four-argument form of the function works asynchronously
            await this.apply(db, schema, criteria, query);
        } else {
            this.apply(criteria, query);
        }
        let sql = `
            DELETE FROM ${query.table}
            WHERE ${query.conditions.join(' AND ')}
            RETURNING *
        `;
        return db.query(sql, query.parameters);
    }

    /**
     * Filter out rows that user doesn't have access to
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<Object>} rows
     * @param  {Object} credentials
     *
     * @return {Promise<Array>}
     */
    async filter(db, schema, rows, credentials) {
        return rows;
    }

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
     * @return {Promise<Array>}
     */
    async export(db, schema, rows, credentials, options) {
        return _.map(rows, (row) => {
            let object = {
                id: row.id,
                gn: row.gn,
                details: row.details,
            };
            if (row.deleted) {
                object.deleted = row.deleted;
            }
            if (options.includeCreationTime) {
                object.ctime = row.ctime;
            }
            if (options.includeModificationTime) {
                object.mtime = row.mtime;
            }
            return object;
        });
    }

    /**
     * Import objects sent by client-side code, applying access control
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<Object>} objectsReceived
     * @param  {Array<Object>} objectsBefore
     * @param  {Object} credentials
     * @param  {Object} options
     *
     * @return {Promise<Array>}
     */
    async import(db, schema, objectsReceived, objectsBefore, credentials, options) {
        let rows = [];
        for (let [ index, objectReceived ] of objectsReceived.entries()) {
            let objectBefore = objectsBefore[index];
            this.checkWritePermission(objectReceived, objectBefore, credentials);
            let row = await this.importOne(db, schema, objectReceived, objectBefore, credentials, options);
            rows.push(row);
        }
        return rows;
    }

    /**
     * Import object sent by client-side code
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object} objectReceived
     * @param  {Object} objectBefore
     * @param  {Object} credentials
     * @param  {Object} options
     *
     * @return {Promise<Array>}
     */
    async importOne(db, schema, object, original, credentials, options) {
        // these properties cannot be modified from the client side
        return _.omit(object, 'gn', 'ctime', 'mtime');
    }

    /**
     * [description]
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<Object>} objects
     * @param  {Array<Object>} originals
     * @param  {Array<Object>} rows
     * @param  {Object} credentials
     *
     * @return {Promise}
     */
    async associate(db, schema, objects, originals, rows, credentials) {
    }

    /**
     * Delete rows that are marked deleted for long enough time (as indicated
     * by their mtime)
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {String} interval
     *
     * @return {Promise<Number>}
     */
    async clean(db, schema, interval) {
        let table = this.getTableName(schema);
        let sql1 = `
            SELECT id FROM ${table}
            WHERE deleted = true
            AND mtime + CAST($1 AS INTERVAL) < NOW()
        `;
        let rows = await db.query(sql1, [ interval ]);
        if (_.isEmpty(rows)) {
            return 0;
        }
        let sql2 = `DELETE FROM ${table} WHERE id = ANY($1)`;
        let result = await db.execute(sql2, [ _.map(rows, 'id') ]);
        return result.rowCount;
    }

    /**
     * Add text search to query
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object} search
     * @param  {Object} query
     *
     * @return {Promise}
     */
    async applyTextSearch(db, schema, search, query) {
        let ts = parseSearchQuery(search.text);
        if (!_.isEmpty(ts.tags)) {
            query.conditions.push(`cardinality(tags) <> 0`);
            query.conditions.push(`"lowerCase"(tags) @> $${query.parameters.push(ts.tags)}`);
        }
        if (!ts.query) {
            return;
        }
        // obtain languages for which we have indices
        let languageCodes = await this.getTextSearchLanguages(db, schema);
        if (_.isEmpty(languageCodes)) {
            query.conditions.push('false');
            return;
        }
        let lang = search.lang;
        let searchText = search.text;
        let queryText = `$${query.parameters.push(ts.query)}`;

        // search query in each language
        let tsQueries = _.map(languageCodes, (code) => {
            return `to_tsquery('search_${code}', ${queryText}) AS query_${code}`;
        });
        // text vector in each language
        let tsVectors = _.map(languageCodes, (code) => {
            let text = this.getSearchableText(code);
            let vector = `to_tsvector('search_${code}', ${text})`;
            // give results in the user's language a higher weight
            // A = 1.0, B = 0.4 by default
            let weight = (code === lang) ? 'A' : 'B';
            vector = `setweight(${vector}, '${weight}') AS vector_${code}`;
            return vector;
        });
        // conditions
        let tsConds = _.map(languageCodes, (code) => {
            return `vector_${code} @@ query_${code}`;
        });
        // search result rankings
        let tsRanks = _.map(languageCodes, (code) => {
            return `ts_rank_cd(vector_${code}, query_${code})`;
        });
        let tsRank = (tsRanks.length > 1) ? `GREATEST(${tsRanks.join(', ')})` : tsRanks[0];
        query.columns += `, ${tsRank} AS relevance`;
        query.table += `, ${tsVectors.join(', ')}`;
        query.table += `, ${tsQueries.join(', ')}`;
        query.conditions.push(`(${tsConds.join(' OR ')})`);
        query.order = `relevance DESC`;
    }

    /**
     * Return SQL expression that yield searchable text
     *
     * @param  {String} languageCode
     *
     * @return {String}
     */
    getSearchableText(languageCode) {
        return `"extractText"(details, '${languageCode}')`;
    }

    /**
     * Return languages for which there're text search indices
     *
     * @param  {Database} db
     * @param  {String} schema
     *
     * @return {Promise<Array<String>>}
     */
    async getTextSearchLanguages(db, schema) {
        let languages = _.get(searchLanguages, [ schema, this.table ]);
        if (!languages) {
            let prefix = `${this.table}_search_`;
            let sql = `
                SELECT indexname FROM pg_indexes
                WHERE indexname LIKE '${prefix}%'
            `;
            let rows = await db.query(sql);
            languages = _.map(rows, (row) => {
                let name = row['indexname'];
                return name.substr(prefix.length);
            });
            _.set(searchLanguages, [ schema, this.table ], languages);
        }
        return languages;
    }

    /**
     * Add indices for text search in specified languages
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<String>} codes
     *
     * @return {Promise}
     */
    async addTextSearchLanguages(db, schema, codes) {
        for (let code of codes) {
            // create language
            await this.createSearchConfigure(db, code);
            let text = this.getSearchableText(code);
            let vector = `to_tsvector('search_${code}', ${text})`;
            let sql = `
                CREATE INDEX CONCURRENTLY ${this.table}_search_${code}
                ON "${schema}"."${this.table}"
                USING gin((${vector}))
            `;
            try {
                await db.execute(sql);
                _.set(searchLanguages, [ schema, this.table ], null);
            } catch (err) {
                // "index already exists"
                if (err.code !== '42P07') {
                    throw err;
                }
            }
        }
    }

    /**
     * Create search configure for searching text of given language
     *
     * @param  {Database} db
     * @param  {String} code
     *
     * @return {Promise}
     */
    async createSearchConfigure(db, code) {
        if (!/^[a-z]{2}$/.test(code)) {
            throw new Error(`Invalid language code: ${code}`);
        }
        // see if configuration exists already
        let configName = `search_${code}`;
        let sql1 = `
            SELECT cfgname FROM pg_catalog.pg_ts_config
            WHERE cfgname = 'search_${code}';
        `;
        let rows = await db.query(sql1);
        if (!_.isEmpty(rows)) {
            return;
        }
        // create dictionaries for language first
        let dicts = await db.createDictionaries(code);
        try {
            let sql2 = `
                CREATE TEXT SEARCH CONFIGURATION search_${code} (COPY = pg_catalog.english);
                ALTER TEXT SEARCH CONFIGURATION search_${code}
                ALTER MAPPING FOR asciiword, asciihword, hword_asciipart, word, hword, hword_part
                WITH ${dicts.join(', ')};
            `;
            await db.execute(sql2);
        } catch (err) {
            if (err.code !== '23505') {
                throw err;
            }
        }
    }

    /**
     * Create a trigger that reconcile locally-made changes to details.resources
     * with data sent from remote client
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Array<String>}
     *
     * @return {Promise}
     */
    async createResourceCoalescenceTrigger(db, schema, args) {
        let table = this.getTableName(schema);
        // trigger name needs to be smaller than "indicateDataChange" so it runs first
        let sql = [
            `
                CREATE TRIGGER "coalesceResourcesOnInsert"
                BEFORE INSERT ON ${table}
                FOR EACH ROW
                EXECUTE PROCEDURE "coalesceResources"(${args.join(', ')});
            `,
            `
                CREATE TRIGGER "coalesceResourcesOnUpdate"
                BEFORE UPDATE ON ${table}
                FOR EACH ROW
                EXECUTE PROCEDURE "coalesceResources"(${args.join(', ')});
            `
        ];
        await db.execute(sql.join('\n'));
    }

    /**
     * Ensure that an object has a unique name when undeleting
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object} objectBefore
     * @param  {Object} objectReceived
     * @param  {String|undefined} propName
     *
     * @return {Promise}
     */
    async ensureUniqueName(db, schema, objectBefore, objectReceived, propName) {
        if (objectBefore) {
            if (objectBefore.deleted === true && objectReceived.deleted === false) {
                if (!propName) {
                    propName = 'name';
                }
                let criteria = {
                    deleted: false
                };
                criteria[propName] = objectBefore[propName];
                let row = await this.findOne(db, schema, criteria, 'id');
                if (row && row.id !== objectBefore.id) {
                    // change the name to avoid conflict
                    objectReceived[propName] = `old_${this.table}_${objectBefore[propName]}`;
                }
            }
        }
    }

    /**
     * Find matching rows, retrieving from earlier searches if possible
     *
     * @param  {Database} db
     * @param  {String} schema
     * @param  {Object} criteria
     * @param  {String} columns
     *
     * @return {Promise<Array<Object>>}
     */
    async findCached(db, schema, criteria, columns) {
        // remove old ones
        let time = new Date;
        _.remove(this.cachedSearches, (search) => {
            let elapsed = time - search.time;
            if (elapsed > 5 * 60 * 1000) {
                return true;
            }
        });
        let matchingSearch = _.find(this.cachedSearches, (search) => {
            if (search.schema === schema) {
                if (_.isEqual(search.criteria, criteria)) {
                    if (search.columns === search.columns) {
                        return true;
                    }
                }
            }
        });
        if (matchingSearch) {
            return matchingSearch.results;
        } else {
            let results = await this.find(db, schema, criteria, columns);
            let time = new Date;
            if (!this.cachedSearches) {
                this.cachedSearches = [];
            }
            this.cachedSearches.push({ schema, criteria, columns, time, results });
            return results;
        }
    }

    /**
     * Clear cached searching
     *
     * @param  {Function|undefined} cb
     */
    clearCache(cb) {
        this.cachedSearches = _.filter(this.cachedSearches, cb || false);
    }
};

let searchLanguages = {};

function parseSearchQuery(text) {
    let tags = [];
    let searchWords = [];
    let tokens = _.split(_.trim(text), /\s+/);
    for (let token of tokens) {
        if (TagScanner.isTag(token)) {
            tags.push(_.toLower(token));
        } else {
            let prefix = '';
            if (/^[-!]/.test(token)) {
                prefix = '!';
            }
            let suffix = '';
            if (/\*$/.test(token)) {
                suffix = ':*';
            }
            let searchWord = removePunctuations(token);
            if (searchWord) {
                searchWords.push(prefix + searchWord + suffix);
            }
        }
    }
    let query = searchWords.join(' & ');
    return { tags, query };
}

const punctRE = /[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]/g;

function removePunctuations(s) {
    return s.replace(punctRE, '');
}

export {
    Data,
};
