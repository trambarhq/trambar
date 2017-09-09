var _ = require('lodash');
var Promise = require('bluebird');
var Express = require('express');
var BodyParser = require('body-parser');
var Moment = require('moment');

var LodashExtra = require('utils/lodash-extra');
var Database = require('database');
var HttpError = require('errors/http-error');

// global accessors
var Authorization = require('accessors/authorization');
var Picture = require('accessors/picture');
var Project = require('accessors/project');
var Repo = require('accessors/repo');
var Role = require('accessors/role');
var Server = require('accessors/server');
var System = require('accessors/system');
var User = require('accessors/user');

// project-specific accessors
var Bookmark = require('accessors/bookmark');
var Listing = require('accessors/listing');
var Reaction = require('accessors/reaction');
var Robot = require('accessors/robot');
var Statistics = require('accessors/statistics');
var Story = require('accessors/story');
var Task = require('accessors/task');

var area = (process.env.POSTGRES_USER === 'admin_role') ? 'admin' : 'client';
var server;

function start() {
    return Database.open(true).then((db) => {
        return db.need('global').then(() => {
            var app = Express();
            app.use(BodyParser.json());
            app.set('json spaces', 2);
            app.route('/data/discovery/:schema/:table/').post(handleDiscovery).get(handleDiscovery);
            app.route('/data/retrieval/:schema/:table/:id?').post(handleRetrieval).get(handleRetrieval);
            app.route('/data/storage/:schema/:table/').post(handleStorage);
            return new Promise((resolve, reject) => {
                server = app.listen(80, () => {
                    resolve();
                });
                server.once('error', (evt) => {
                    reject(new Error(evt.message));
                });
            });
        }).finally(() => {
            return db.close();
        });
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
    var statusCode = err.statusCode;
    var message = err.message;
    if (!statusCode) {
        // not an expected error
        console.error(err);
        statusCode = 500;
        if (process.env.NODE_ENV === 'production') {
            message = 'Internal server error';
        }
    }
    res.status(statusCode).json({ message });
}

/**
 * Handle search for objects, returning just the ids and gns (generation numbers)
 *
 * @param  {Request} req
 * @param  {Response} res
 */
function handleDiscovery(req, res) {
    var params = req.body || req.query;
    var schema = req.params.schema;
    var table = req.params.table;
    return Database.open().then((db) => {
        return checkAuthorization(db, params.token).then((userId) => {
            var criteria = _.omit(params, 'token');
            if (criteria.order) {
                // check clause for potential SQL injection
                var clauses = _.split(criteria.order, /\s,\s/);
                _.each(clauses, (clause) => {
                    var m = /^(\w+)\s+(asc|desc)/i.exec(clause);
                    if (!m) {
                        throw new HttpError(400);
                    }
                });
            }
            if (criteria.limit) {
                criteria.limit = parseInt(criteria.limit);
                if (criteria.limit > 5000) {
                    throw new HttpError(400);
                }
            } else {
                criteria.limit = 5000;
            }
            if (criteria.deleted !== true) {
                criteria.deleted = false;
            }
            var accessor = getAccessor(schema, table);
            return accessor.find(db, schema, criteria, 'id, gn');
        }).then((rows) => {
            return {
                ids: _.map(rows, 'id'),
                gns: _.map(rows, 'gn'),
            }
        }).finally(() => {
            return db.close();
        });
    }).then((result) => {
        sendResponse(res, result);
    }).catch((err) => {
        sendError(res, err);
    });
}

/**
 * Handle the actual retrieval of objects, by ids
 *
 * @param  {Request} req
 * @param  {Response} res
 */
function handleRetrieval(req, res) {
    var params = req.body || req.query;
    var schema = req.params.schema;
    var table = req.params.table;
    return Database.open().then((db) => {
        return checkAuthorization(db, params.token).then((userId) => {
            return fetchCredentials(db, userId);
        }).then((credentials) => {
            var ids;
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
                throw new HttpError(400);
            }
            if (ids.length > 5000) {
                throw new HttpError(400);
            }

            var options = {
                include_ctime: params.include_ctime,
                include_mtime: params.include_mtime,
            };

            // look up the rows by id
            var accessor = getAccessor(schema, table);
            return accessor.find(db, schema, { id: ids }, '*').then((rows) => {
                // export the row, checking if user has access to objects and
                // trimming out sensitive data
                return accessor.export(db, schema, rows, credentials, options).then((objects) => {
                    // add ctime and/or mtime if the client wants them
                    return objects;
                });
            });
        }).finally(() => {
            return db.close();
        });
    }).then((result) => {
        sendResponse(res, result);
    }).catch((err) => {
        sendError(res, err);
    });
}

/**
 * Handle storage request
 *
 * @param  {Request} req
 * @param  {Response} res
 */
function handleStorage(req, res) {
    var params = req.body;
    var schema = req.params.schema;
    var table = req.params.table;
    return Database.open().then((db) => {
        return checkAuthorization(db, params.token).then((userId) => {
            return fetchCredentials(db, userId);
        }).then((credentials) => {
            var objects = params.objects;
            // make sure objects are such
            if (!_.isArray(objects) || _.isEmpty(objects)) {
                throw new HttpError(400);
            }
            if (!_.every(objects, _.isObject)) {
                throw new HttpError(400);
            }

            var options = {
                include_ctime: params.include_ctime,
                include_mtime: params.include_mtime,
            };

            // load the original objects if id list isn't empty
            var accessor = getAccessor(schema, table);
            var ids = _.filter(_.map(objects, 'id'));
            var originalsPromise;
            if (!_.isEmpty(ids)) {
                originalsPromise = accessor.find(db, schema, { id: ids }, '*');
            }
            return Promise.resolve(originalsPromise).then((originals) => {
                // create an array that pairs the original with the new version
                return _.map(objects, (object) => {
                    return _.find(originals, { id: object.id }) || null;
                });
            }).then((originals) => {
                return accessor.import(db, schema, objects, originals, credentials, options).then((rows) => {
                    return db.begin().then(() => {
                        return accessor.save(db, schema, rows);
                    }).then((rows) => {
                        return accessor.associate(db, schema, objects, originals, rows, credentials).return(rows);
                    }).then((rows) => {
                        return db.commit().then(() => {
                            return rows;
                        });
                    }).catch((err) => {
                        return db.rollback().then(() => {
                            throw err;
                        })
                    });
                });
            }).then((rows) => {
                return accessor.export(db, schema, rows, credentials, options);
            });
        }).finally(() => {
            return db.close();
        });
    }).then((result) => {
        sendResponse(res, result);
    }).catch((err) => {
        sendError(res, err);
    });
}

/**
 * Check authorization token, throwing if it's invalid or expired
 *
 * @param  {Database} db
 * @param  {String} token
 *
 * @return {Promise<Number>}
 */
function checkAuthorization(db, token) {
    return Authorization.check(db, token, area).then((userId) => {
        if (!userId) {
            throw new HttpError(401);
        }
        var days = (area === 'client') ? 30 : 1;
        return Authorization.extend(db, token, days).return(userId);
    });
}

/**
 * Load information related to user that can be used to determine access level
 *
 * @param  {Database} db
 * @param  {Number} userId
 *
 * @return {Object}
 */
function fetchCredentials(db, userId) {
    var credentials = {};
    return User.findOne(db, 'global', { id: userId, deleted: false }, '*').then((user) => {
        if (!user) {
            throw new HttpError(403);
        }
        credentials.user = user;
        credentials.area = area;

        // indicate that the user has admin access
        if (area === 'admin' && user.type === 'admin') {
            credentials.unrestricted = true;
        }
    }).then(() => {
        return credentials;
    });
}

var globalAccessors = [
    Picture,
    Project,
    Repo,
    Role,
    Server,
    System,
    Task,
    User,
];
var projectAccessors = [
    Bookmark,
    Listing,
    Reaction,
    Robot,
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
    var accessors = (schema === 'global') ? globalAccessors : projectAccessors;
    var accessor = _.find(accessors, { table });
    if (!accessor) {
        throw new HttpError(404);
    }
    return accessor;
}

exports.start = start;
exports.stop = stop;

if (process.argv[1] === __filename) {
    start();
}
