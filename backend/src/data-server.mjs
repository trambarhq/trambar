import _ from 'lodash';
import Express from 'express';
import CORS from 'cors';
import BodyParser from 'body-parser';
import Moment from 'moment';

import './lib/common/utils/lodash-extra.mjs';
import Database from './lib/database.mjs';
import HTTPError from './lib/common/errors/http-error.mjs';
import * as TaskLog from './lib/task-log.mjs';
import * as Shutdown from './lib/shutdown.mjs';
import * as ProjectUtils from './lib/common/objects/utils/project-utils.mjs';
import * as Accessors from './lib/data-server/accessors.mjs';

import Project from './lib/accessors/project.mjs';
import Session from './lib/accessors/session.mjs';
import User from './lib/accessors/user.mjs';

const SESSION_LIFETIME_ADMIN = 1;
const SESSION_LIFETIME_CLIENT = 30;
const APP_AREA = (process.env.POSTGRES_USER === 'admin_role') ? 'admin' : 'client';

let server;

async function start() {
  const db = await Database.open(true);

  // wait for creation of global schema
  await db.need('global');

  // start up Express
  const app = Express();
  app.use(BodyParser.json());
  app.use(CORS());
  app.set('json spaces', 2);
  app.route('/srv/data/signature/:schema/')
    .post(handleSignature)
    .get(handleSignature);
  app.route('/srv/data/discovery/:schema/:table/')
    .post(handleDiscovery)
    .get(handleDiscovery);
  app.route('/srv/data/retrieval/:schema/:table/:id?')
    .post(handleRetrieval
    ).get(handleRetrieval);
  app.route('/srv/data/storage/:schema/:table/').post(handleStorage);
  try {
    await new Promise((resolve, reject) => {
      server = app.listen(80, () => {
        resolve();
      });
      server.once('error', (evt) => {
        reject(new Error(evt.message));
      });
    });
  } finally {
    await db.close();
  }
}

async function stop() {
  await Shutdown.close(server);
};

/**
 * Send response to browser as JSON object
 *
 * @param  {Response} res
 * @param  {Object} result
 */
function sendResponse(res, result) {
  res.json(result);
}

/**
 * Send error to browser as JSON object
 *
 * @param  {Response} res
 * @param  {Object} err
 */
function sendError(res, err) {
  let statusCode = err.statusCode;
  let message = err.message;
  if (!statusCode) {
    switch (err.code) {
      case '23505': // unique constraint violation
        statusCode = 409;
        message = 'An object with that name already exists';
        break;
      default:
        // not an expected error
        statusCode = 500;
        if (process.env.NODE_ENV === 'production') {
          message = 'Internal server error';
        }
        break;
    }
  }
  res.status(statusCode).json({ message });
}

/**
 * Handle schema signature retrieval
 *
 * @param  {Request} req
 * @param  {Response} res
 */
async function handleSignature(req, res) {
  const schema = req.params.schema;
  const params = req.body;
  const taskLog = TaskLog.start('signature-retrieve', { schema });
  try {
    const db = await Database.open();
    const userID = await checkAuthorization(db, params.auth_token);
    const credentials = await fetchCredentials(db, userID, schema);
    const signature = await Project.getSignature(db, schema, credentials);
    sendResponse(res, { signature });
    taskLog.set('signature', signature);
    await taskLog.finish();
  } catch (err) {
    sendError(res, err);
    await taskLog.abort(err);
  }
}

/**
 * Handle search for objects, returning just the ids and gns (generation numbers)
 *
 * @param  {Request} req
 * @param  {Response} res
 */
async function handleDiscovery(req, res) {
  const params = req.body || req.query;
  const schema = req.params.schema;
  const table = req.params.table;
  const taskLog = TaskLog.start('object-discover', { schema, table });
  try {
    const db = await Database.open();
    const userID = await checkAuthorization(db, params.auth_token);
    const credentials = await fetchCredentials(db, userID, schema);
    const criteria = _.omit(params, 'auth_token', 'include_deleted');
    if (criteria.order) {
      // check clause for potential SQL injection
      const clauses = _.split(criteria.order, /\s,\s/);
      for (let clause of clauses) {
        const m = /^(\w+)\s+(asc|desc)/i.exec(clause);
        if (!m) {
          throw new HTTPError(400);
        }
      }
    } else {
      criteria.order = 'id DESC';
    }
    if (criteria.limit) {
      criteria.limit = parseInt(criteria.limit);
      if (criteria.limit > 5000) {
        throw new HTTPError(400);
      }
    } else {
      criteria.limit = 5000;
    }
    if (params.include_deleted) {
      if (APP_AREA !== 'admin') {
        // only admin can see deleted objects
        throw new HTTPError(400);
      }
    } else {
      criteria.deleted = false;
    }
    const accessor = getAccessor(schema, table);
    // in addition to id and gn, we need columns used by filter()
    const columns = _.union([ 'id', 'gn' ], _.keys(accessor.accessControlColumns));
    let rows;
    try {
      rows = await accessor.find(db, schema, criteria, columns.join(', '));
    } catch (err) {
      if (err.code === '42P01' && schema !== 'global') {
        // maybe the project schema hasn't been created yet
        await db.need(schema);
        // try again
        rows = await accessor.find(db, schema, criteria, 'id, gn');
      } else {
        throw err;
      }
    }
    // remove objects that user has no access to
    const viewableRows = await accessor.filter(db, schema, rows, credentials);
    const result = {
      ids: _.map(viewableRows, 'id'),
      gns: _.map(viewableRows, 'gn'),
    };
    sendResponse(res, result);
    taskLog.set('count', _.size(viewableRows));
    await taskLog.finish();
  } catch (err) {
    sendError(res, err);
    await taskLog.abort(err);
  }
}

/**
 * Handle the actual retrieval of objects, by ids
 *
 * @param  {Request} req
 * @param  {Response} res
 */
async function handleRetrieval(req, res) {
  const params = req.body || req.query;
  const schema = req.params.schema;
  const table = req.params.table;
  const taskLog = TaskLog.start('object-retrieve', { schema, table });
  try {
    const db = await Database.open();
    const userID = await checkAuthorization(db, params.auth_token)
    const credentials = await fetchCredentials(db, userID, schema);
    let ids;
    if (req.params.id !== undefined) {
      // retrieval through GET (testing purpose)
      ids = [ parseInt(req.params.id) ];
    } else {
      ids = params.ids;
      if (typeof(ids) === 'string') {
        ids = _.map(_.split(ids, ','), (id) => {
          return parseInt(id);
        });
      }
    }
    if (!(ids instanceof Array)) {
      throw new HTTPError(400);
    }
    if (ids.length > 5000) {
      throw new HTTPError(400);
    }
    const options = {
      includeCreationTime: !!params.include_ctime,
      includeModificationTime: !!params.include_mtime,
    };
    // look up the rows by id
    const accessor = getAccessor(schema, table);
    const criteria = {
      id: ids,
      order: 'id DESC',
    };
    if (APP_AREA !== 'admin') {
      // only admin can retrieve deleted objects
      criteria.deleted = false;
    }
    const rows = await accessor.find(db, schema, criteria, '*');
    // remove objects that user has no access to
    const viewableRows = await accessor.filter(db, schema, rows, credentials);
    // export the row, trimming out sensitive data
    const result = await accessor.export(db, schema, viewableRows, credentials, options);
    sendResponse(res, result);
    taskLog.set('count', _.size(result));
    await taskLog.finish();
  } catch (err) {
    sendError(res, err);
    await taskLog.abort(err);
  }
}

/**
 * Handle storage request
 *
 * @param  {Request} req
 * @param  {Response} res
 */
async function handleStorage(req, res) {
  const params = req.body;
  const schema = req.params.schema;
  const table = req.params.table;
  const taskLog = TaskLog.start('object-store', { schema, table });
  try {
    const objects = params.objects;
    // make sure objects are such
    if (!_.isArray(objects) || _.isEmpty(objects)) {
      throw new HTTPError(400);
    }
    if (!_.every(objects, _.isObjectLike)) {
      throw new HTTPError(400);
    }
    // make sure ids are valid
    const ids = _.filter(_.map(objects, 'id'));
    if (!_.every(ids, _.isNumber)) {
      throw new HTTPError(400);
    }

    // need exclusive connection for transaction
    const db = await Database.open(true);
    try {
      const userID = await checkAuthorization(db, params.auth_token);
      const credentials = await fetchCredentials(db, userID, schema);
      const options = {
        includeCreationTime: !!params.include_ctime,
        includeModificationTime: !!params.include_mtime,
      };
      // load the original objects if id list isn't empty
      const accessor = getAccessor(schema, table);
      let existingObjects = [];
      if (!_.isEmpty(ids)) {
        existingObjects = await accessor.find(db, schema, { id: ids }, '*');
      }
      // create an array that pairs the original with the new version
      const originals = _.map(objects, (object) => {
        return _.find(existingObjects, { id: object.id }) || null;
      });
      // ask the accessor to import the objects
      const rows = await accessor.import(db, schema, objects, originals, credentials, options);

      // start transaction
      await db.begin();
      try {
        const savedRows = await accessor.save(db, schema, rows);
        if (!_.every(savedRows, _.isObjectLike)) {
          // an update failed
          throw new HTTPError(404);
        }

        // make changes to rows in tables associated with this one
        await accessor.associate(db, schema, objects, originals, savedRows, credentials);

        // commit changes
        await db.commit();

        const result = await accessor.export(db, schema, savedRows, credentials, options);
        sendResponse(res, result);
        taskLog.set('count', _.size(rows));
      } catch (err) {
        // roll back changes
        await db.rollback();
        throw err;
      }
    } finally {
      db.close();
    }
    await taskLog.finish();
  } catch (err) {
    sendError(res, err);
    await taskLog.abort(err);
  }
}

/**
 * Check authorization token, throwing if it's invalid or expired
 *
 * @param  {Database} db
 * @param  {String} token
 *
 * @return {Promise<Number>}
 */
async function checkAuthorization(db, token) {
  const userID = await Session.check(db, token, APP_AREA);
  if (!userID) {
    throw new HTTPError(401);
  }
  let days;
  if (APP_AREA === 'client') {
    days = SESSION_LIFETIME_CLIENT;
  } else if (APP_AREA === 'admin') {
    days = SESSION_LIFETIME_ADMIN;
  }
  Session.extend(db, token, days)
  return userID;
}

/**
 * Load information related to user that can be used to determine access level
 *
 * @param  {Database} db
 * @param  {Number} userID
 * @param  {String} schema
 *
 * @return {Object}
 */
async function fetchCredentials(db, userID, schema) {
  const userCriteria = {
    id: userID,
    deleted: false,
    disabled: false,
  };
  const user = await User.findOne(db, 'global', userCriteria, '*');
  if (!user) {
    // credentials are invalid if the user is missing or disabled
    throw new HTTPError(401);
  }

  const area = APP_AREA;
  let access = 'none';
  let unrestricted = false;

  // indicate that the user has admin access
  if (area === 'admin' && user.type === 'admin') {
    unrestricted = true;
  }

  // load project object when we're accessing its schema
  let project = null;
  if (schema !== 'global') {
    const projectCriteria = {
      name: schema,
      deleted: false,
    };
    project = await Project.findOne(db, 'global', projectCriteria, '*');

    // see if user has any access to project
    access = ProjectUtils.getUserAccessLevel(project, user);
    if (!access) {
      throw new HTTPError(403);
    }
  }
  return { user, project, area, unrestricted, access };
}

/**
 * Return appropriate accessor for schema and table
 *
 * @param  {String} schema
 * @param  {String} table
 *
 * @return {Accessor}
 */
function getAccessor(schema, table) {
  const accessors = Accessors.get(schema);
  const accessor = _.find(accessors, { table });
  if (!accessor) {
    throw new HTTPError(404);
  }
  return accessor;
}

if ('file://' + process.argv[1] === import.meta.url) {
  start();
  Shutdown.addListener(stop);
}

export {
  start,
  stop,
};
