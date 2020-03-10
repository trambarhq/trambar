import _ from 'lodash';
import JsDAV from '@pylonide/jsdav';
import JsDAVLocksBackendFS from '@pylonide/jsdav/lib/DAV/plugins/locks/fs.js';
import JsDAVPromise from 'jsdav-promise/es6.js'; const { File, Collection, Conflict } = JsDAVPromise;
import { Database } from './lib/database.mjs';
import { getAccessors } from './lib/schema-manager/accessors.mjs';
import { onShutdown, shutdownHTTPServer } from './lib/shutdown.mjs';

// accessors
import { Project } from './lib/accessors/project.mjs';

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
    this.accessors = getAccessors(schema);
  }

  async getChildrenAsync() {
    const children = [];
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
    this.accessor = _.find(getAccessors(schema), { table });
  }

  async createFileAsync(name, data, type) {
    const text = data.toString();
    const object = (text) ? JSON.parse(text) : {};
    const m = /^(\d+)\.json$/.exec(name);
    if (!m) {
      throw new Conflict;
    }
    const id = parseInt(m[1]);
    if (object.id) {
      if (object.id !== id) {
        throw new Conflict;
      }
    } else {
      object.id = id;
    }
    const row = await this.accessor.findOne(db, this.schema, { id, deleted: false }, `id`);
    if (row) {
      throw new Conflict;
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
      let filename = row.id + '.json';
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

class RowFile extends File {
  constructor(schema, table, id, filename) {
    super();
    this.name = filename;
    this.path = `/${schema}/${table}/${filename}`;
    this.id = id;
    this.schema = schema;
    this.table = table;
    this.accessor = _.find(getAccessors(schema), { table });
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
    locksBackend: JsDAVLocksBackendFS.new('/let/tmp')
  }, 8000, '0.0.0.0');
}

async function stop() {
  await shutdownHTTPServer(server);
  db.close();
  db = null;
}

if ('file://' + process.argv[1] === import.meta.url) {
  start();
  onShutdown(stop);
}

export {
  start,
  stop,
};
