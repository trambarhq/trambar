var _ = require('lodash');
var Promise = require('bluebird');
var Express = require('express');
var BodyParser = require('body-parser');
var Moment = require('moment');
var Crypto = Promise.promisifyAll(require('crypto'));

var Database = require('database');
var HttpError = require('errors/http-error');

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

var app = Express();
var server = app.listen(80);

app.use(BodyParser.json());
app.set('json spaces', 2);

app.route('/api/authorization/')
    .post(handleAuthorization);

app.route('/api/discovery/:schema/:table/')
    .get(handleDiscovery)
    .post(handleDiscovery);

app.route('/api/retrieval/:schema/:table/:id?')
    .get(handleRetrieval)
    .post(handleRetrieval);

app.route('/api/storage/:schema/:table/:id?')
    .post(handleStorage);

function sendResponse(res, result) {
    res.json(result);
}

function sendError(res, err) {
    var statusCode = err.statusCode || 500;
    console.error(err);
    res.status(statusCode).json({ message: err.message });
}

function handleAuthorization(req, res) {
    var params = req.body || req.query;
    var schema = req.params.schema;
    var table = req.params.table;
    return Database.open(schema).then((db) => {
        return authenticateUser(db, params).then((user) => {
            return authorizeUser(db, user);
        }).then((auth) => {
            return {
                user_id: auth.user_id,
                token: auth.token
            };
        }).finally(() => {
            return db.close();
        })
    }).then((result) => {
        sendResponse(res, result);
    }).catch((err) => {
        sendError(res, err);
    });
}

function handleDiscovery(req, res) {
    var params = req.body || req.query;
    var schema = req.params.schema;
    var table = req.params.table;
    return Database.open(schema).then((db) => {
        return checkAuthorization(db, params.token).then((auth) => {
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

function handleRetrieval(req, res) {
    var params = req.body || req.query;
    var schema = req.params.schema;
    var table = req.params.table;
    return Database.open(schema).then((db) => {
        return checkAuthorization(db, params.token).then((auth) => {
            return fetchCredentials(db, schema, auth.user_id);
        }).then((credentials) => {
            var ids;
            if (req.params.id !== undefined) {
                ids = [ parseInt(req.params.id) ];
            } else {
                ids = params.ids;
                if (typeof(ids) === 'string') {
                    ids = _.map(_.split(ids, ','), (id) => {
                        return parseInt(id);
                    });
                }
            }
            if (ids.length > 5000) {
                throw new HttpError(400);
            }
            // look up the rows by id
            var accessor = getAccessor(schema, table);
            return accessor.find(db, schema, { id: ids }, '*').then((rows) => {
                // export the row, checking if user has access to objects and
                // trimming out sensitive data
                return accessor.export(db, schema, rows, credentials);
            });
        }).finally(() => {
            return db.close();
        });
    }).then((result) => {
        console.log(result)
        sendResponse(res, result);
    }).catch((err) => {
        sendError(res, err);
    });
}

function handleStorage(req, res) {
    var body = req.body;
    var schema = req.params.schema;
    var table = req.params.table;
    return Database.open(schema).then((db) => {
        return checkAuthorization(db, params.token).then((auth) => {
            return fetchCredentials(db, auth.user_id);
        }).then((credentials) => {
            // check the id if there's one in the URL
            if (req.params.id !== undefined) {
                var id = parseInt(req.params.id);
                if (typeof(body) !== 'object' || body instanceof Array) {
                    throw new HttpError(500);
                }
                if (body.id !== undefined && body.id !== id) {
                    throw new HttpError(500);
                }
                body.id = id;
            }
            // handle single object as well as array of objects
            var objects = body;
            if (!(objects instanceof Array)) {
                objects = [ objects ];
            }
            // make sure objects are such
            if (!_.every(objects, _.isObject)) {
                throw new HttpError(500);
            }

            // load the original objects if id list isn't empty
            var accessor = getAccessor(schema, table);
            var ids = _.filter(_.map(objects, 'id'));
            var originalsPromise;
            if (!_.isEmpty(ids)) {
                originalsPromise = accessor.find(db, schema, { id: ids });
            }
            return Promise.resolve(originalsPromise || []).then((originals) => {
                // create an array that pairs the original with the new version
                return _.map(objects, (object) => {
                    return _.find(originals, { id: object.id }) || null;
                });
            }).then((originals) => {
                return accessor.import(db, schema, objects, originals, credentials);
            }).then((rows) => {
                return db.begin().then(() => {
                    return accessor.save(db, schema, rows).then(function(rows) {
                        return accessor.export(db, schema, rows, credentials);
                    });
                }).then((objects) => {
                    return db.commit().then(() => {
                        return objects;
                    });
                }).catch((err) => {
                    return db.rollback().then(() => {
                        throw err;
                    })
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

function authenticateUser(db, params) {
    var criteria = {};
    if (params.password && params.username) {
        criteria.type = 'password';
        criteria.username = params.username;
        criteria.password = params.password;
    };
    return Authentication.findOne(db, 'global', criteria, 'user_id').then((auth) => {
        if (!auth) {
            throw new HttpError(401);
        }
        return User.findOne(db, 'global', { id: auth.user_id, deleted: false }, '*').then((user) => {
            if (!user) {
                throw new HttpError(403);
            }
            return user;
        });
    });
}

function authorizeUser(db, user) {
    return Authorization.findOne(db, 'global', { expired: true }, '*').then((auth) => {
        return Crypto.randomBytesAsync(24).then((buffer) => {
            if (!auth) {
                auth = {};
            }
            auth.user_id = user.id;
            auth.token = buffer.toString('hex');
            auth.expiration_date = Moment().startOf('day').add(30, 'days').toISOString();
            return Authorization.saveOne(db, 'global', auth);
        });
    });
}

function checkAuthorization(db, token) {
    return Authorization.findOne(db, 'global', { token }, '*').then((auth) => {
        if (!auth) {
            throw new HttpError(401);
        }
        var now = Moment().toISOString();
        if (auth.expiration_date < now) {
            throw new HttpError(401)
        }
        return auth;
    });
}

function fetchCredentials(db, userId) {
    var credentials = {};
    return User.findOne(db, 'global', { user_id: userId, deleted: false }, '*').then((user) => {
        if (!user) {
            throw new HttpError(403);
        }
        credentials.user = user;
    }).then(() => {
        return credentials;
    });
}

var globalAccessors = [
    Account,
    Configuration,
    Preferences,
    Project,
    User,
];
var projectAccessors = [
    Bookmark,
    Commit,
    Folder,
    Issue,
    Listing,
    Reaction,
    Repo,
    Robot,
    Statistics,
    Story,
];

function getAccessor(schema, table) {
    var accessors = (schema === 'global') ? globalAccessors : projectAccessors;
    var accessor = _.find(accessors, { table });
    if (!accessor) {
        throw new HttpError(404);
    }
    return accessor;
}
