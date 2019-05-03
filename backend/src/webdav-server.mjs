import _ from 'lodash';
import JsDAV from 'jsDAV';
import JsDAVLocksBackendFS from 'jsDAV/lib/DAV/plugins/locks/fs.js';
import JsDAVPromise from 'jsdav-promise/es6.js';

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
import Spreadsheet from './lib/accessors/spreadsheet.mjs';
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
const projectAccessors = [
    Bookmark,
    Listing,
    Notification,
    Reaction,
    Spreadsheet,
    Statistics,
    Story,
    Task,
];
let server;
let db;

class RootFolder extends JsDAVPromise.Collection {
    constructor() {
        super();
        this.name = '';
        this.path = '/';
    }

    async getChildAsync(name) {
        if (name === 'global') {
            return new SchemaFolder('global');
        } else {
            const project = await Project.findOne(db, 'global', { name, deleted: false }, 'name');
            if (project) {
                return new SchemaFolder(project.name);
            }
        }
    }

    async getChildrenAsync() {
        const projects = await Project.find(db, 'global', { deleted: false }, 'name');
        const children = [];
        for (let project of projects) {
            if (project.name) {
                children.push(new SchemaFolder(project.name));
            }
        }
        children.push(new SchemaFolder('global'));
        return children;
    }
}

class SchemaFolder extends JsDAVPromise.Collection {
    constructor(schema) {
        super();
        this.name = schema;
        this.path = `/${schema}`;
        this.schema = schema;
        this.accessors = (schema === 'global') ? globalAccessors : projectAccessors;
    }

    async getChildrenAsync() {
        const children = [];
        for (let accessor of this.accessors) {
            children.push(new TableFolder(this.schema, accessor.table));
        }
        return children;
    }
}

class TableFolder extends JsDAVPromise.Collection {
    constructor(schema, table) {
        super();
        this.name = table;
        this.path = `/${schema}/${table}`;
        this.schema = schema;
        this.table = table;
        const accessors = (schema === 'global') ? globalAccessors : projectAccessors;
        this.accessor = _.find(accessors, { table });
    }

    async createFileAsync(name, data, type) {
        const text = data.toString();
        const object = (text) ? JSON.parse(text) : {};
        const m = /^(\d+)\.json$/.exec(name);
        if (!m) {
            throw new JsDAVPromise.Conflict;
        }
        const id = parseInt(m[1]);
        if (object.id) {
            if (object.id !== id) {
                throw new JsDAVPromise.Conflict;
            }
        } else {
            object.id = id;
        }
        const row = await this.accessor.findOne(db, this.schema, { id, deleted: false }, `id`);
        if (row) {
            throw new JsDAVPromise.Conflict;
        }
        await this.accessor.insertOne(db, this.schema, object);
        return true;
    }

    async getChildAsync(name) {
        const id = parseInt(name);
        if (id !== id) {
            // NaN
            return null;
        }
        const row = await this.accessor.findOne(db, this.schema, { id, deleted: false }, `id`);
        if (row) {
            const filename = row.id + '.json';
            return new RowFile(this.schema, this.table, row.id, filename);
        } else {
            return null;
        }
    }

    async getChildrenAsync() {
        const children = [];
        const rows = await this.accessor.find(db, this.schema, { deleted: false }, `id`);
        for (let row of rows) {
            const filename = row.id + '.json';
            children.push(new RowFile(this.schema, this.table, row.id, filename));
        }
        return children;
    }
}

class RowFile extends JsDAVPromise.File {
    constructor(schema, table, id, filename) {
        super();
        this.name = filename;
        this.path = `/${schema}/${table}/${filename}`;
        this.id = id;
        this.schema = schema;
        this.table = table;
        const accessors = (schema === 'global') ? globalAccessors : projectAccessors;
        this.accessor = _.find(accessors, { table });
    }

    async getAsync() {
        const row = await this.accessor.findOne(db, this.schema, { id: this.id, deleted: false }, '*');
        const props = _.omit(row, 'ctime', 'mtime', 'gn', 'deleted');
        const text = JSON.stringify(props, undefined, 2);
        return new Buffer(text);
    }

    async putAsync(data, type) {
        const text = data.toString();
        const props = JSON.parse(text);
        if (props.id !== this.id) {
            throw new Error('Cannot change id');
        }
        const row = await this.accessor.updateOne(db, this.schema, props);
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
        const buffer = await this.getAsync();
        return buffer.length;
    }

    async getContentTypeAsync() {
        return 'application/json';
    }

    async getLastModifiedAsync() {
        const row = await this.accessor.findOne(db, this.schema, { id: this.id, deleted: false }, 'mtime');
        return row.mtime;
    }
}

async function start() {
    db = await Database.open(true);
    server = JsDAV.createServer({
        node: new RootFolder,
        locksBackend: JsDAVLocksBackendFS.new('/var/tmp')
    }, 8000, '0.0.0.0');
}

async function stop() {
    await Shutdown.close(server);
    db.close();
    db = null;
}

if ('file://' + process.argv[1] === import.meta.url) {
    start();
    Shutdown.on(stop);
}

export {
    start,
    stop,
};
