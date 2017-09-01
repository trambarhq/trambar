var _ = require('lodash');
var Promise = require('bluebird');
var Express = require('express');
var BodyParser = require('body-parser');
var Passport = require('passport')
var Crypto = Promise.promisifyAll(require('crypto'));
var FS = Promise.promisifyAll(require('fs'));
var Moment = require('moment');
var HtpasswdAuth = require('htpasswd-auth');
var HttpError = require('errors/http-error');

var Database = require('database');
var Authentication = require('accessors/authentication');
var Authorization = require('accessors/authorization');
var Server = require('accessors/server');
var User = require('accessors/user');

const plugins = {
    dropbox: 'passport-dropbox-oauth2',
    facebook: 'passport-facebook',
    github: 'passport-github',
    gitlab: 'passport-gitlab2',
    google: 'passport-google-oauth2',
};

var server;

function start() {
    var app = Express();
    app.set('json spaces', 2);
    app.use(BodyParser.json());
    app.use(Passport.initialize());
    app.post('/auth/session', handleAuthenticationStart);
    app.get('/auth/session/:token', handleAuthorizationRetrieval);
    app.post('/auth/htpasswd', handleHttpasswdRequest);
    app.get('/auth/:provider', handleOAuthRequest);
    app.get('/auth/:provider/:callback', handleOAuthRequest, handleOAuthRequestCompletion);
    server = app.listen(80);
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
    if (!err) {
        return;
    }
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
 * Create a new authentication object
 *
 * @param  {Request} req
 * @param  {Response} res
 */
function handleAuthenticationStart(req, res) {
    var area = req.body.area;
    Database.open().then((db) => {
        // generate a random token for tracking the authentication
        // process; if successful, this token will be upgraded to
        // an authorization token
        return Crypto.randomBytesAsync(24).then((buffer) => {
            if (!(area === 'client' || area === 'admin')) {
                throw new HttpError(400);
            }
            var authentication = {
                area,
                token: buffer.toString('hex'),
            };
            return Authentication.saveOne(db, 'global', authentication);
        }).then((authentication) => {
            // send list of available strategies to client, along with the
            // authentication token
            var criteria = {
                deleted: false,
            };
            return Server.find(db, 'global', criteria, '*').filter((server) => {
                if (canProvideAccess(server, area)) {
                    return true;
                }
            }).then((servers) => {
                var token = authentication.token;
                var providers = _.map(servers, (server) => {
                    var name = server.details.name;
                    return {
                        name: getServerName(server),
                        type: server.type,
                        url: `/auth/${server.type}?sid=${server.id}&token=${token}`,
                    };
                });
                return { token, providers };
            });
        });
    }).then((results) => {
        sendResponse(res, results);
    }).catch((err) => {
        console.error(err);
        sendError(res, err);
    });
}

function handleHttpasswdRequest(req, res) {
    var token = req.body.token;
    var username = _.trim(_.lowerCase(req.body.username));
    var password = _.trim(req.body.password);
    Database.open().then((db) => {
        return Authentication.findOne(db, 'global', { token }, '*').then((authentication) => {
            if (!authentication) {
                throw new HttpError(400);
            }
            if (!username || !password) {
                throw new HttpError(400);
            }
            var htpasswdPath = process.env.HTPASSWD_PATH;
            return FS.readFileAsync(htpasswdPath, 'utf-8').then((data) => {
                return HtpasswdAuth.authenticate(username, password, data);
            }).catch((err) => {
                return false;
            }).then((successful) => {
                if (successful !== true) {
                    return Promise.delay(Math.random() * 1000).return(null);
                }
                var criteria = {
                    username,
                    deleted: false,
                };
                return User.findOne(db, 'global', criteria, 'id, type').then((user) => {
                    if (!user) {
                        // create the admin user if it's not there
                        var name = _.capitalize(username);
                        if (name === 'Root') {
                            name = 'Administrator';
                        }
                        var user = {
                            type: 'admin',
                            username,
                            details: { name }
                        };
                        return User.insertOne(db, 'global', user);
                    }
                    return user;
                });
            }).then((user) => {
                return authorizeUser(db, user, authentication, 'htpasswd').then((authorization) => {
                    return {
                        token: authorization.token,
                        user_id: authorization.user_id,
                    };
                });
            });
        });
    }).then((results) => {
        sendResponse(res, results);
    }).catch((err) => {
        sendError(res, err);
    });
}

/**
 * Return an authentication object, used by the client to determine if login
 * was successful
 *
 * @param  {Request} req
 * @param  {Response} res
 */
function handleAuthorizationRetrieval(req, res) {
    var token = req.params.token;
    Database.open().then((db) => {
        return Authorization.findOne(db, 'global', { token }, 'token, user_id').then((authorization) => {
            if (!authorization) {
                throw new HttpError(404);
            }
            return {
                token: authorization.token,
                user_id: authorization.user_id,
            };
        });
    }).then((results) => {
        sendResponse(res, results);
    }).catch((err) => {
        sendError(res, err);
    });
}

/**
 * Redirect to OAuth provider
 *
 * @param  {Request}   req
 * @param  {Response}  res
 * @param  {Function} done
 */
function handleOAuthRequest(req, res, done) {
    var host = req.headers['host'];
    var protocol = req.headers['x-connection-protocol'];
    var provider = req.params.provider;
    var serverId = parseInt(req.query.sid);
    var token = req.query.token;
    Database.open().then((db) => {
        return Authentication.findOne(db, 'global', { token }, '*').then((authentication) => {
            if (!authentication) {
                throw new HttpError(400);
            }
        }).then(() => {
            var criteria = {
                id: serverId,
                deleted: false,
            };
            return Server.findOne(db, 'global', criteria, '*').then((server) => {
                if (!server || server.type !== provider) {
                    throw new HttpError(400);
                }
                var Strategy = require(plugins[server.type]);
                var providerSpecific;
                var options = {
                    session: false,
                };
                var credentials = _.extend(server.settings.oauth, {
                    callbackURL: `${protocol}://${host}/auth/${provider}/callback?sid=${serverId}&token=${token}`,
                    passReqToCallback: true,
                });
                switch (provider) {
                    case 'facebook':
                        credentials.profileFields = ['id', 'email', 'gender', 'link', 'locale', 'name', 'timezone', 'verified'];
                        break;
                }
                var strategy = new Strategy(credentials, processOAuthProfile);
                Passport.use(strategy);
                var authenticate = Passport.authenticate(provider, options);
                authenticate(req, res, done);
            });
        });
    }).catch((err) => {
        // display error
        sendError(res, err);
    });
}

function handleOAuthRequestCompletion(req, res) {
    var html = `<script> close() </script>`;
    res.send(html);
}

/**
 * Process profile retrieved from OAuth provider
 *
 * @param  {Request}  req
 * @param  {Object}   accessToken
 * @param  {Object}   refreshToken
 * @param  {Object}   profile
 * @param  {Function} cb
 */
function processOAuthProfile(req, accessToken, refreshToken, profile, cb) {
    var provider = req.params.provider;
    var serverId = parseInt(req.query.sid);
    var token = req.query.token;
    Database.open().then((db) => {
        return Authentication.findOne(db, 'global', { token }, '*').then((authentication) => {
            if (!authentication) {
                throw new HttpError(400);
            }
            // look for a user with the external id
            var externalId = parseInt(profile.id);
            var criteria = {
                external_id: externalId,
                server_id: serverId,
                deleted: false,
            };
            return User.findOne(db, 'global', criteria, 'id, type').then((user) => {
                if (!user) {
                    // look for a user that isn't bound to an external account yet
                    var criteria = {
                        external_id: null,
                        deleted: false,
                    };
                    return User.find(db, 'global', criteria, '*').then((user) => {
                        var emails = _.map(profile.emails, 'value');
                        // TODO: match based on e-mail or account name
                    });
                }
                return user;
            }).then((user) => {
                // save the info from provider for potential future use
                var details = {
                    profile: profile._json,
                    access_token: accessToken,
                    refresh_token: refreshToken,
                };
                return authorizeUser(db, user, authentication, provider, serverId, details);
            });
        });
    }).then((authorization) => {
        cb(null, authorization);
    }).catch((err) => {
        cb(err);
    });
}

/**
 * Create a new Authorization record for user, checking for existence and
 * if he can access the area in question
 *
 * @param  {Database} db
 * @param  {User} user
 * @param  {Authenication} authentication
 * @param  {String} authType
 * @param  {Number} serverId
 * @param  {Object} details
 *
 * @return {Authorization}
 */
function authorizeUser(db, user, authentication, authType, serverId, details) {
    if (!user) {
        throw new HttpError(401);
    }
    if (authentication.area === 'admin' && user.type !== 'admin') {
        throw new HttpError(403);
    }
    // update Authentication record
    authentication.type = authType;
    authentication.user_id = user.id;
    authentication.server_id = serverId;
    _.assign(authentication.details, details);
    return Authentication.updateOne(db, 'global', authentication).then((authentication) => {
        // create Authorization record
        var lifetime = (authentication.area === 'client') ? 30 : 1;
        var expirationDate = Moment().add(lifetime, 'day').format('YYYY-MM-DD');
        var authorization = {
            token: authentication.token,
            user_id: authentication.user_id,
            expiration_date: expirationDate,
            area: authentication.area,
        };
        return Authorization.insertOne(db, 'global', authorization);
    });
}

/**
 * Return name of server
 *
 * @param  {Server} server
 *
 * @return {String}
 */
function getServerName(server) {
    var name = server.details.name;
    if (!name) {
        switch (server.type) {
            case 'Dropbox': return 'dropbox';
            case 'facebook': return 'Facebook';
            case 'gitlab': return 'GitLab';
            case 'github': return 'GitHub';
            case 'google': return 'Google';
        }
    }
    return name;
}

/**
 * Return true if server can provide access to an area
 *
 * @param  {Server} server
 * @param  {String} area
 *
 * @return {Boolean}
 */
function canProvideAccess(server, area) {
    if (server.settings.oauth) {
        if (server.settings.oauth.clientID && server.settings.oauth.clientSecret) {
            if (area === 'admin') {
                switch (server.type) {
                    case 'gitlab':
                        return true;
                }
            } else if (area === 'client') {
                switch (server.type) {
                    default:
                        return true;
                }
            }
        }
    }
    return false;
}

exports.start = start;
exports.stop = stop;

if (process.argv[1] === __filename) {
    start();
}
