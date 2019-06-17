import _ from 'lodash';
import JsDAV from 'jsDAV';
import JsDAVLocksBackendFS from 'jsDAV/lib/DAV/plugins/locks/fs.js';
import JsDAVPromise from 'jsdav-promise/es6.js'; const { File, Collection, Conflict } = JsDAVPromise;

import Database from './lib/database.mjs';
import * as Shutdown from './lib/shutdown.mjs';

// accessors
import Commit from './lib/accessors/commit.mjs';
import Device from './lib/accessors/device.mjs';
import Picture from './lib/accessors/picture.mjs';
import Project from './lib/accessors/project.mjs';
import Repo from './lib/accessors/repo.mjs';
import Role from './lib/accessors/role.mjs';
import Server from './lib/accessors/server.mjs';
import Session from './lib/accessors/session.mjs';
import Subscription from './lib/accessors/subscription.mjs';
import System from './lib/accessors/system.mjs';
import User from './lib/accessors/user.mjs';

import Bookmark from './lib/accessors/bookmark.mjs';
import Listing from './lib/accessors/listing.mjs';
import Reaction from './lib/accessors/reaction.mjs';
import Statistics from './lib/accessors/statistics.mjs';
import Story from './lib/accessors/story.mjs';

import Notification from './lib/accessors/notification.mjs';
import Task from './lib/accessors/task.mjs';

const globalAccessors = [
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
let projectAccessors = [
    Bookmark,
    Listing,
    Notification,
    Reaction,
    Statistics,
    Story,
    Task,
];
let server;
let db;

class RootFolder extends Collection {
    constructor() {
        super();
        this.name = '';
        this.path = '/';
    }

    async getChildAsync(name) {
        if (name === 'global') {
            return new SchemaFolder('global');
        } else {
            let project = await Project.findOne(db, 'global', { name, deleted: false }, 'name');
            if (project) {
                return new SchemaFolder(project.name);
            }
        }
    }

    async getChildrenAsync() {
        let projects = await Project.find(db, 'global', { deleted: false }, 'name');
        let children = [];
        for (let project of projects) {
            if (project.name) {
                children.push(new SchemaFolder(project.name));
            }
        }
        children.push(new SchemaFolder('global'));
        return children;
    }
}

class SchemaFolder extends Collection {
    constructor(schema) {
        super();
        this.name = schema;
        this.path = `/${schema}`;
        this.schema = schema;
        this.accessors = (schema === 'global') ? globalAccessors : projectAccessors;
    }

    async getChildrenAsync() {
        let children = [];
        for (let accessor of this.accessors) {
            children.push(new TableFolder(this.schema, accessor.table));
        }
        return children;
    }
}

class TableFolder extends Collection {
    constructor(schema, table) {
        super();
        this.name = table;
        this.path = `/${schema}/${table}`;
        this.schema = schema;
        this.table = table;
        let accessors = (schema === 'global') ? globalAccessors : projectAccessors;
        this.accessor = _.find(accessors, { table });
    }

    async createFileAsync(name, data, type) {
        let text = data.toString();
        let object = (text) ? JSON.parse(text) : {};
        let m = /^(\d+)\.json$/.exec(name);
        if (!m) {
            throw new Conflict;
        }
        let id = parseInt(m[1]);
        if (object.id) {
            if (object.id !== id) {
                throw new Conflict;
            }
        } else {
            object.id = id;
        }
        let row = await this.accessor.findOne(db, this.schema, { id, deleted: false }, `id`);
        if (row) {
            throw new Conflict;
        }
        await this.accessor.insertOne(db, this.schema, object);
        return true;
    }

    async getChildAsync(name) {
        let id = parseInt(name);
        if (id !== id) {
            // NaN
            return null;
        }
        let row = await this.accessor.findOne(db, this.schema, { id, deleted: false }, `id`);
        if (row) {
            let filename = row.id + '.json';
            return new RowFile(this.schema, this.table, row.id, filename);
        } else {
            return null;
        }
    }

    async getChildrenAsync() {
        let children = [];
        let rows = await this.accessor.find(db, this.schema, { deleted: false }, `id`);
        for (let row of rows) {
            let filename = row.id + '.json';
            children.push(new RowFile(this.schema, this.table, row.id, filename));
        }
        return children;
    }
}

class RowFile extends File {
    constructor(schema, table, id, filename) {
        super();
        this.name = filename;
        this.path = `/${schema}/${table}/${filename}`;
        this.id = id;
        this.schema = schema;
        this.table = table;
        let accessors = (schema === 'global') ? globalAccessors : projectAccessors;
        this.accessor = _.find(accessors, { table });
    }

    async getAsync() {
        let row = await this.accessor.findOne(db, this.schema, { id: this.id, deleted: false }, '*');
        let props = _.omit(row, 'ctime', 'mtime', 'gn', 'deleted');
        let text = JSON.stringify(props, undefined, 2);
        return new Buffer(text);
    }

    async putAsync(data, type) {
        let text = data.toString();
        let props = JSON.parse(text);
        if (props.id !== this.id) {
            throw new Error('Cannot change id');
        }
        let row = await this.accessor.updateOne(db, this.schema, props);
        return !!row;
    }

    async deleteAsync() {
        try {
            await this.accessor.updateOne(db, this.schema, { id: this.id, deleted: true });
            return true;
        } catch (err) {
            return false;
        }
    }

    async getSizeAsync() {
        let buffer = await this.getAsync();
        return buffer.length;
    }

    async getContentTypeAsync() {
        return 'application/json';
    }

    async getLastModifiedAsync() {
        let row = await this.accessor.findOne(db, this.schema, { id: this.id, deleted: false }, 'mtime');
        return row.mtime;
    }
}

async function start() {
    db = await Database.open(true);
    server = JsDAV.createServer({
        node: new RootFolder,
        locksBackend: JsDAVLocksBackendFS.new('/let/tmp')
    }, 8000, '0.0.0.0');
}

async function stop() {
    await Shutdown.close(server);
    db.close();
    db = null;
}

if ('file://' + process.argv[1] === import.meta.url) {
    start();
    Shutdown.addListener(stop);
}

export {
    start,
    stop,
};
