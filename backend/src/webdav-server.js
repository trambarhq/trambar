var _ = require('lodash');
var Promise = require('bluebird');
var JsDAV = require('jsDAV');
var JsDAVLocksBackendFS = require('jsDAV/lib/DAV/plugins/locks/fs');
var JsDAVPromise = require('jsdav-promise');
var File = JsDAVPromise.File;
var Collection = JsDAVPromise.Collection;

var Database = require('database');

var Account = require('accessors/account');
var Authentication = require('accessors/authentication');
var Authorization = require('accessors/authorization');
var Configuration = require('accessors/configuration');
var Preferences = require('accessors/preferences');
var Project = require('accessors/project');
var Role = require('accessors/role');
var User = require('accessors/user');

var Bookmark = require('accessors/bookmark');
var Commit = require('accessors/commit');
var Folder = require('accessors/folder');
var Issue = require('accessors/issue');
var Listing = require('accessors/listing');
var Reaction = require('accessors/reaction');
var Repo = require('accessors/repo');
var Robot = require('accessors/robot');
var Statistics = require('accessors/statistics');
var Story = require('accessors/story');
var Task = require('accessors/task');

var globalAccessors = [
    Account,
    Authentication,
    Authorization,
    Configuration,
    Preferences,
    Project,
    Role,
    User,
];
var projectAccessors = [
    Bookmark,
    Commit,
    Folder,
    Issue,
    Listing,
    Reaction,
    Repo,
    Robot,
    Statistics,
    Story,
    Task,
];
var server;

function start() {
    return Database.open(true).then((db) => {
        var RootFolder = Collection.extend(
        {
            initialize: function() {
                this.name = '';
                this.path = '/';
            },

            getChildAsync: function(name) {
                if (name === 'global') {
                    var globalFolder = SchemaFolder.new('global');
                    return Promise.resolve(globalFolder);
                } else {
                    return Project.findOne(db, 'global', { name, deleted: false }, 'name').then((project) => {
                        if (project) {
                            return SchemaFolder.new(project.name);
                        }
                    });
                }
            },

            getChildrenAsync: function() {
                return Project.find(db, 'global', { deleted: false }, 'name').filter((project) => {
                    return !!project.name;
                }).map((project) => {
                    return SchemaFolder.new(project.name);
                }).then((projectFolders) => {
                    var globalFolder = SchemaFolder.new('global');
                    return _.concat(globalFolder, projectFolders);
                });
            },
        });

        var SchemaFolder = Collection.extend(
        {
            initialize: function(schema) {
                this.name = schema;
                this.path = `/${schema}`;
                this.schema = schema;
                this.accessors = (schema === 'global') ? globalAccessors : projectAccessors;
            },

            getChildrenAsync: function() {
                return Promise.map(this.accessors, (accessor) => {
                    return TableFolder.new(this.schema, accessor.table);
                });
            },
        });

        var TableFolder = Collection.extend(
        {
            initialize: function(schema, table) {
                this.name = table;
                this.path = `/${schema}/${table}`;
                this.schema = schema;
                this.table = table;
                var accessors = (schema === 'global') ? globalAccessors : projectAccessors;
                this.accessor = _.find(accessors, { table });
            },

            createFileAsync: function(name, data, type) {
                var text = data.toString();
                var object = (text) ? JSON.parse(text) : {};
                _.set(object, 'details.fn', name);
                return this.accessor.findOne(db, this.schema, { fn: name, deleted: false }, `id`).then((row) => {
                    if (row) {
                        throw new JsDAVPromise.Conflict;
                    }
                    return this.accessor.insertOne(db, this.schema, object).then((row) => {
                        return true;
                    });
                });
            },

            getChildAsync: function(name) {
                return this.accessor.findOne(db, this.schema, { fn: name, deleted: false }, `id, details->>'fn' AS fn`).then((row) => {
                    if (row) {
                        return row;
                    }
                    var id = parseInt(name);
                    if (id !== id) {
                        // NaN
                        return null;
                    }
                    return this.accessor.findOne(db, this.schema, { id: id, fn: null, deleted: false }, `id, details->>'fn' AS fn`);
                }).then((row) => {
                    if (row) {
                        var filename = row.fn || row.id + '.json';
                        return RowFile.new(this.schema, this.table, row.id, filename);
                    } else {
                        return null;
                    }
                });
            },

            getChildrenAsync: function() {
                return this.accessor.find(db, this.schema, { deleted: false }, `id, details->>'fn' AS fn`).map((row) => {
                    var filename = row.fn || row.id + '.json';
                    return RowFile.new(this.schema, this.table, row.id, filename);
                });
            },
        });

        var RowFile = File.extend(
        {
            initialize: function(schema, table, id, filename) {
                this.name = filename;
                this.path = `/${schema}/${table}/${filename}`;
                this.id = id;
                this.schema = schema;
                this.table = table;
                var accessors = (schema === 'global') ? globalAccessors : projectAccessors;
                this.accessor = _.find(accessors, { table });
            },

            getAsync: function() {
                return this.accessor.findOne(db, this.schema, { id: this.id, deleted: false }, '*').then((row) => {
                    row = _.omit(row, 'ctime', 'mtime', 'gn', 'deleted');
                    row.details = _.omit(row.details, 'fn');
                    var text = JSON.stringify(row, undefined, 2);
                    return new Buffer(text);
                });
            },

            putAsync: function(data, type) {
                return Promise.try(() => {
                    var text = data.toString();
                    var row = JSON.parse(text);
                    if (row.id !== this.id) {
                        throw new Error('Cannot change id');
                    }
                    if (this.name !== this.id + '.json') {
                        _.set(row, 'details.fn', this.name);
                    }
                    return this.accessor.updateOne(db, this.schema, row).then((row) => {
                        return !!row;
                    });
                });
            },

            deleteAsync: function() {
                return this.accessor.removeOne(db, this.schema, { id: this.id }).then((row) => {
                    return true;
                }).catch((err) => {
                    console.error(err);
                });
            },

            getSizeAsync: function() {
                return this.getAsync().then((buffer) => {
                    return buffer.length;
                });
            },

            getContentTypeAsync: function() {
                return Promise.resolve('application/json');
            },

            getLastModifiedAsync: function() {
                return this.accessor.findOne(db, this.schema, { id: this.id, deleted: false }, 'mtime').then((row) => {
                    return row.mtime;
                });
            },

            setNameAsync: function(name) {
                return this.accessor.findOne(db, this.schema, { id: this.id, deleted: false }, 'id, details').then((row) => {
                    if (row) {
                        _.set(row, 'details.fn', name);
                        return this.accessor.updateOne(db, this.schema, row).then((row) => {
                            return true;
                        });
                    }
                });
            },
        });

        server = JsDAV.createServer({
            node: RootFolder.new(''),
            locksBackend: JsDAVLocksBackendFS.new('/var/tmp')
        }, 8000, '0.0.0.0');
    });
}

function stop() {
    return new Promise((resolve, reject) => {
        if (server) {
            server.close();
            server.on('close', () => {
                resolve();
            });
        } else {
            resolve();
        }
    });
}

exports.start = start;
exports.stop = stop;

if (process.argv[1] === __filename) {
    start();
}
