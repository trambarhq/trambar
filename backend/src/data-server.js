import _ from 'lodash';
import Express from 'express';
import CORS from 'cors';
import BodyParser from 'body-parser';
import Moment from 'moment';

import 'utils/lodash-extra';
import Database from 'database';
import HTTPError from 'errors/http-error';
import * as Shutdown from 'shutdown';
import * as ProjectUtils from 'objects/utils/project-utils';

// global accessors
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

// project-specific accessors
import Bookmark from 'accessors/bookmark';
import Listing from 'accessors/listing';
import Notification from 'accessors/notification';
import Reaction from 'accessors/reaction';
import Statistics from 'accessors/statistics';
import Story from 'accessors/story';
import Task from 'accessors/task';

const SESSION_LIFETIME_ADMIN = 1;
const SESSION_LIFETIME_CLIENT = 30;
const APP_AREA = (process.env.POSTGRES_USER === 'admin_role') ? 'admin' : 'client';

let server;

async function start() {
    let db = await Database.open(true);

    // wait for creation of global schema
    await db.need('global');

    // start up Express
    let app = Express();
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
                console.error(err);
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
    try {
        let schema = req.params.schema;
        let params = req.body;
        let db = await Database.open();
        let userID = await checkAuthorization(db, params.auth_token);
        let credentials = await fetchCredentials(db, userID, schema);
        let signature = await Project.getSignature(db, schema, credentials);
        sendResponse(res, { signature });
    } catch (err) {
        sendError(res, err);
    }
}

/**
 * Handle search for objects, returning just the ids and gns (generation numbers)
 *
 * @param  {Request} req
 * @param  {Response} res
 */
async function handleDiscovery(req, res) {
    try {
        let params = req.body || req.query;
        let schema = req.params.schema;
        let table = req.params.table;
        let db = await Database.open();
        let userID = await checkAuthorization(db, params.auth_token);
        let credentials = await fetchCredentials(db, userID, schema);
        let criteria = _.omit(params, 'auth_token', 'include_deleted');
        if (criteria.order) {
            // check clause for potential SQL injection
            let clauses = _.split(criteria.order, /\s,\s/);
            for (let clause of clauses) {
                let m = /^(\w+)\s+(asc|desc)/i.exec(clause);
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
        let accessor = getAccessor(schema, table);
        // in addition to id and gn, we need columns used by filter()
        let columns = _.union([ 'id', 'gn' ], _.keys(accessor.accessControlColumns));
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
        let viewableRows = await accessor.filter(db, schema, rows, credentials);
        let result = {
            ids: _.map(viewableRows, 'id'),
            gns: _.map(viewableRows, 'gn'),
        };
        sendResponse(res, result);
    } catch (err) {
        sendError(res, err);
    }
}

/**
 * Handle the actual retrieval of objects, by ids
 *
 * @param  {Request} req
 * @param  {Response} res
 */
async function handleRetrieval(req, res) {
    try {
        let params = req.body || req.query;
        let schema = req.params.schema;
        let table = req.params.table;
        let db = await Database.open();
        let userID = await checkAuthorization(db, params.auth_token)
        let credentials = await fetchCredentials(db, userID, schema);
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
        let options = {
            includeCreationTime: !!params.include_ctime,
            includeModificationTime: !!params.include_mtime,
        };
        // look up the rows by id
        let accessor = getAccessor(schema, table);
        let criteria = {
            id: ids,
            order: 'id DESC',
        };
        if (APP_AREA !== 'admin') {
            // only admin can retrieve deleted objects
            criteria.deleted = false;
        }
        let rows = await accessor.find(db, schema, criteria, '*');
        // remove objects that user has no access to
        let viewableRows = await accessor.filter(db, schema, rows, credentials);
        // export the row, trimming out sensitive data
        let result = await accessor.export(db, schema, viewableRows, credentials, options);
        sendResponse(res, result);
    } catch (err) {
        sendError(res, err);
    }
}

/**
 * Handle storage request
 *
 * @param  {Request} req
 * @param  {Response} res
 */
async function handleStorage(req, res) {
    try {
        let params = req.body;
        let schema = req.params.schema;
        let table = req.params.table;
        let objects = params.objects;
        // make sure objects are such
        if (!_.isArray(objects) || _.isEmpty(objects)) {
            throw new HTTPError(400);
        }
        if (!_.every(objects, _.isObjectLike)) {
            throw new HTTPError(400);
        }
        // make sure ids are valid
        let ids = _.filter(_.map(objects, 'id'));
        if (!_.every(ids, _.isNumber)) {
            throw new HTTPError(400);
        }

        // need exclusive connection for transaction
        let db = await Database.open(true);
        try {
            let userID = await checkAuthorization(db, params.auth_token);
            let credentials = await fetchCredentials(db, userID, schema);
            let options = {
                includeCreationTime: !!params.include_ctime,
                includeModificationTime: !!params.include_mtime,
            };
            // load the original objects if id list isn't empty
            let accessor = getAccessor(schema, table);
            let existingObjects = [];
            if (!_.isEmpty(ids)) {
                existingObjects = await accessor.find(db, schema, { id: ids }, '*');
            }
            // create an array that pairs the original with the new version
            let originals = _.map(objects, (object) => {
                return _.find(existingObjects, { id: object.id }) || null;
            });
            // ask the accessor to import the objects
            let rows = await accessor.import(db, schema, objects, originals, credentials, options);

            // start transaction
            await db.begin();
            try {
                let savedRows = await accessor.save(db, schema, rows);
                if (!_.every(savedRows, _.isObjectLike)) {
                    // an update failed
                    throw new HTTPError(404);
                }

                // make changes to rows in tables associated with this one
                await accessor.associate(db, schema, objects, originals, savedRows, credentials);

                // commit changes
                await db.commit();

                let result = await accessor.export(db, schema, savedRows, credentials, options);
                sendResponse(res, result);
            } catch (err) {
                // roll back changes
                await db.rollback();
                throw err;
            }
        } finally {
            db.close();
        }
    } catch (err) {
        sendError(res, err);
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
    let userID = await Session.check(db, token, APP_AREA);
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
    let userCriteria = {
        id: userID,
        deleted: false,
        disabled: false,
    };
    let user = await User.findOne(db, 'global', userCriteria, '*');
    if (!user) {
        // credentials are invalid if the user is missing or disabled
        throw new HTTPError(401);
    }

    let area = APP_AREA;
    let access = 'none';
    let unrestricted = false;

    // indicate that the user has admin access
    if (area === 'admin' && user.type === 'admin') {
        unrestricted = true;
    }

    // load project object when we're accessing its schema
    let project = null;
    if (schema !== 'global') {
        let projectCriteria = {
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

const globalAccessors = [
    Device,
    Picture,
    Project,
    Repo,
    Role,
    Server,
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
    Statistics,
    Story,
    Task,
];

/**
 * Return appropriate accessor for schema and table
 *
 * @param  {String} schema
 * @param  {String} table
 *
 * @return {Accessor}
 */
function getAccessor(schema, table) {
    let accessors = (schema === 'global') ? globalAccessors : projectAccessors;
    let accessor = _.find(accessors, { table });
    if (!accessor) {
        throw new HTTPError(404);
    }
    return accessor;
}

if (process.argv[1] === __filename) {
    start();
    Shutdown.on(stop);
}

export {
    start,
    stop,
};
