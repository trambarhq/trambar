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

var globalAccessors = [
    Account,
    Authentication,
    Authorization,
    Configuration,
    Project,
    User,
];
var projectAccessors = [
    Bookmark,
    Commit,
    Folder,
    Issue,
    Listing,
    Preferences,
    Reaction,
    Repo,
    Robot,
    Statistics,
    Story,
];

Database.open(true).then((db) => {
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
            return Project.find(db, 'global', { deleted: false }, 'name').map((project) => {
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

        getChildAsync: function(name) {
            var id = parseInt(name);
            return this.accessor.findOne(db, this.schema, { id: id, deleted: false }, 'id').then((row) => {
                if (row) {
                    return RowFile.new(this.schema, this.table, row.id);
                }
            });
        },

        getChildrenAsync: function() {
            return this.accessor.find(db, this.schema, { deleted: false }, 'id').map((row) => {
                return RowFile.new(this.schema, this.table, row.id);
            });
        },
    });

    var RowFile = File.extend(
    {
        initialize: function(schema, table, id) {
            this.name = id + '.json';
            this.path = `/${schema}/${table}/${id}.json`;
            this.id = id;
            this.schema = schema;
            this.table = table;
            var accessors = (schema === 'global') ? globalAccessors : projectAccessors;
            this.accessor = _.find(accessors, { table });
        },

        getAsync: function() {
            return this.accessor.findOne(db, this.schema, { id: this.id, deleted: false }, '*').then((row) => {
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
                return this.accessor.saveOne(db, this.schema, row).then((row) => {
                    return !!row;
                });
            });
        },

        deleteAsync: function() {
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
    });

    JsDAV.debugMode = true;
    JsDAV.createServer({
        node: RootFolder.new(''),
        locksBackend: JsDAVLocksBackendFS.new('/var/tmp')
    }, 8000, '0.0.0.0');
});
