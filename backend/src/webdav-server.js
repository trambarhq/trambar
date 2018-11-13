import _ from 'lodash';
import Promise from 'bluebird';
import JsDAV from 'jsDAV';
import JsDAVLocksBackendFS from 'jsDAV/lib/DAV/plugins/locks/fs';
import { File, Collection, Conflict } from 'jsdav-promise';

import Database from 'database';
import * as Shutdown from 'shutdown';

// accessors
import Commit from 'accessors/commit';
import Device from 'accessors/device';
import Picture from 'accessors/picture';
import Project from 'accessors/project';
import Repo from 'accessors/repo';
import Role from 'accessors/role';
import Server from 'accessors/server';
import Session from 'accessors/session';
import Subscription from 'accessors/subscription';
import System from 'accessors/system';
import User from 'accessors/user';

import Bookmark from 'accessors/bookmark';
import Listing from 'accessors/listing';
import Reaction from 'accessors/reaction';
import Statistics from 'accessors/statistics';
import Story from 'accessors/story';

import Notification from 'accessors/notification';
import Task from 'accessors/task';

var globalAccessors = [
    Commit,
    Device,
    Notification,
    Picture,
    Project,
    Repo,
    Role,
    Server,
    Session,
    Subscription,
    System,
    Task,
    User,
];
var projectAccessors = [
    Bookmark,
    Listing,
    Notification,
    Reaction,
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
                var m = /^(\d+)\.json$/.exec(name);
                if (!m) {
                    return Promise.reject(new Conflict);
                }
                var id = parseInt(m[1]);
                if (object.id) {
                    if (object.id !== id) {
                        return Promise.reject(new Conflict);
                    }
                } else {
                    object.id = id;
                }
                return this.accessor.findOne(db, this.schema, { id, deleted: false }, `id`).then((row) => {
                    if (row) {
                        return Promise.reject(new Conflict);
                    }
                    return this.accessor.insertOne(db, this.schema, object).then((row) => {
                        return true;
                    });
                });
            },

            getChildAsync: function(name) {
                var id = parseInt(name);
                if (id !== id) {
                    // NaN
                    return Promise.resolve(null);
                }
                return this.accessor.findOne(db, this.schema, { id, deleted: false }, `id`).then((row) => {
                    if (row) {
                        var filename = row.id + '.json';
                        return RowFile.new(this.schema, this.table, row.id, filename);
                    } else {
                        return null;
                    }
                });
            },

            getChildrenAsync: function() {
                return this.accessor.find(db, this.schema, { deleted: false }, `id`).map((row) => {
                    var filename = row.id + '.json';
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
                    return this.accessor.updateOne(db, this.schema, row).then((row) => {
                        return !!row;
                    });
                });
            },

            deleteAsync: function() {
                return this.accessor.updateOne(db, this.schema, { id: this.id, deleted: true }).then((row) => {
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
        });

        server = JsDAV.createServer({
            node: RootFolder.new(''),
            locksBackend: JsDAVLocksBackendFS.new('/var/tmp')
        }, 8000, '0.0.0.0');
    });
}

function stop() {
    return Shutdown.close(server);
}

if (process.argv[1] === __filename) {
    start();
    Shutdown.on(stop);
}

export {
    start,
    stop,
};
