var _ = require('lodash');
var Promise = require('bluebird');
var Express = require('express');
var BodyParser = require('body-parser');
var Moment = require('moment');

var LodashExtra = require('utils/lodash-extra');
var Database = require('database');
var Shutdown = require('shutdown');
var HttpError = require('errors/http-error');
var ProjectSettings = require('objects/settings/project-settings');

// global accessors
var Authorization = require('accessors/authorization');
var Picture = require('accessors/picture');
var Project = require('accessors/project');
var Repo = require('accessors/repo');
var Role = require('accessors/role');
var Server = require('accessors/server');
var Subscription = require('accessors/subscription');
var System = require('accessors/system');
var User = require('accessors/user');

// project-specific accessors
var Bookmark = require('accessors/bookmark');
var Listing = require('accessors/listing');
var Notification = require('accessors/notification');
var Reaction = require('accessors/reaction');
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
    return Shutdown.close(server);
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
            return fetchCredentials(db, userId, schema);
        }).then((credentials) => {
            var criteria = _.omit(params, 'token', 'include_deleted');
            if (criteria.order) {
                // check clause for potential SQL injection
                var clauses = _.split(criteria.order, /\s,\s/);
                _.each(clauses, (clause) => {
                    var m = /^(\w+)\s+(asc|desc)/i.exec(clause);
                    if (!m) {
                        throw new HttpError(400);
                    }
                });
            } else {
                criteria.order = 'id DESC';
            }
            if (criteria.limit) {
                criteria.limit = parseInt(criteria.limit);
                if (criteria.limit > 5000) {
                    throw new HttpError(400);
                }
            } else {
                criteria.limit = 5000;
            }
            if (params.include_deleted) {
                if (area !== 'admin') {
                    // only admin can see deleted objects
                    throw new HttpError(400);
                }
            } else {
                criteria.deleted = false;
            }
            var accessor = getAccessor(schema, table);
            return accessor.find(db, schema, criteria, 'id, gn').catch((err) => {
                if (err.code === '42P01' && schema !== 'global') {
                    // maybe the project schema hasn't been created yet
                    return db.need(schema).then(() => {
                        // try again
                        return accessor.find(db, schema, criteria, 'id, gn');
                    });
                } else {
                    throw err;
                }
            }).then((rows) => {
                // remove objects that user has no access to
                return accessor.filter(db, schema, rows, credentials).then((rows) => {
                    // return only the ids and generation numbers
                    return {
                        ids: _.map(rows, 'id'),
                        gns: _.map(rows, 'gn'),
                    }
                });
            }).then((results) => {
                // see if data needed to be synchronize with an external source
                accessor.sync(db, schema, criteria);
                return results;
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
            return fetchCredentials(db, userId, schema);
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
            var criteria = {
                id: ids,
                order: 'id DESC',
            };
            if (area !== 'admin') {
                // only admin can retrieve deleted objects
                criteria.deleted = false;
            }
            return accessor.find(db, schema, criteria, '*').then((rows) => {
                // remove objects that user has no access to
                return accessor.filter(db, schema, rows, credentials).then((rows) => {
                    // export the row, trimming out sensitive data
                    return accessor.export(db, schema, rows, credentials, options).then((objects) => {
                        // add ctime and/or mtime if the client wants them
                        return objects;
                    });
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
    // need exclusive connection for transaction
    return Database.open(true).then((db) => {
        return checkAuthorization(db, params.token).then((userId) => {
            return fetchCredentials(db, userId, schema);
        }).then((credentials) => {
            var objects = params.objects;
            // make sure objects are such
            if (!_.isArray(objects) || _.isEmpty(objects)) {
                throw new HttpError(400);
            }
            if (!_.every(objects, _.isObjectLike)) {
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
                        if (!_.every(rows, _.isObjectLike)) {
                            // an update failed
                            throw new HttpError(404);
                        }
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
 * @param  {String} schema
 *
 * @return {Object}
 */
function fetchCredentials(db, userId, schema) {
    var userCriteria = {
        id: userId,
        deleted: false,
        disabled: false,
    };
    var projectCriteria = {
        name: schema,
        deleted: false,
    };
    if (schema === 'global') {
        projectCriteria = null;
    }
    var userP = User.findOne(db, 'global', userCriteria, '*');
    var projectP = Project.findOne(db, 'global', projectCriteria, '*');
    return Promise.join(userP, projectP, (user, project) => {
        if (!user) {
            // credentials are invalid if the user is missing or disabled
            throw new HttpError(401);
        }
        var access = 'none';
        var unrestricted = false;

        if (projectCriteria) {
            var access = ProjectSettings.getUserAccessLevel(project, user);
            if (!access) {
                // user has no access to project at all
                throw new HttpError(403);
            }
        }
        // indicate that the user has admin access
        if (area === 'admin' && user.type === 'admin') {
            unrestricted = true;
        }
        return { user, project, area, unrestricted, access }
    });
}

var globalAccessors = [
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
var projectAccessors = [
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

Shutdown.on(stop);
