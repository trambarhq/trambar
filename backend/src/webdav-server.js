import _ from 'lodash';
import Promise from 'bluebird';
import JsDAV from 'jsDAV';
import JsDAVLocksBackendFS from 'jsDAV/lib/DAV/plugins/locks/fs';
import { File, Collection, Conflict } from 'jsdav-promise/es6';

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

let globalAccessors = [
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

if (process.argv[1] === __filename) {
    start();
    Shutdown.on(stop);
}

export {
    start,
    stop,
};
