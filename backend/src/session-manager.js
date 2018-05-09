var _ = require('lodash');
var Promise = require('bluebird');
var Express = require('express');
var CORS = require('cors');
var BodyParser = require('body-parser');
var Passport = require('passport')
var Crypto = Promise.promisifyAll(require('crypto'));
var FS = Promise.promisifyAll(require('fs'));
var Moment = require('moment');
var Request = require('request');
var HtpasswdAuth = require('htpasswd-auth');
var Async = require('async-do-while');
var HTTPError = require('errors/http-error');
var Database = require('database');
var Shutdown = require('shutdown');
var ExternalDataUtils = require('objects/utils/external-data-utils');
var UserTypes = require('objects/types/user-types');
var UserSettings = require('objects/settings/user-settings');

var GitlabUserImporter = require('gitlab-adapter/user-importer');

// accessors
var Device = require('accessors/device');
var Project = require('accessors/project');
var Server = require('accessors/server');
var Session = require('accessors/session');
var System = require('accessors/system');
var User = require('accessors/user');

module.exports = {
    start,
    stop,
};

const SESSION_LIFETIME_AUTHENTICATION = 120; // minutes
const SESSION_LIFETIME_DEVICE_ACTIVATION = 60;
const SESSION_LIFETIME_ADMIN = 60 * 24 * 1;
const SESSION_LIFETIME_CLIENT = 60 * 24 * 30;

var server;
var cleanUpInterval;

function start() {
    var app = Express();
    app.set('json spaces', 2);
    app.use(CORS());
    app.use(BodyParser.json());
    app.use(Passport.initialize());

    app.route('/srv/session/?')
        .post(handleSessionStart)
        .get(handleSessionRetrieval)
        .delete(handleSessionTermination);
    app.route('/srv/session/:name(terms|privacy)/?')
        .get(handleLegalDocumentRequest);
    app.route('/srv/session/htpasswd/?')
        .post(handleHTPasswdRequest);
    app.route('/srv/session/:provider/:callback?/?')
        .get(handleOAuthTestRequest)
        .get(handleOAuthActivationRequest)
        .get(handleOAuthRequest);
    server = app.listen(80);

    cleanUpInterval = setInterval(deleteExpiredSessions, 60 * 60 * 1000);
}

function stop() {
    clearInterval(cleanUpInterval);
    return Shutdown.close(server);
};

/**
 * Send HTML to browser
 *
 * @param  {Response} res
 * @param  {String} html
 */
function sendHTML(res, html) {
    res.type('html').send(html);
}

/**
 * Send error to browser as HTML
 *
 * @param  {Response} res
 * @param  {Error} err
 */
function sendErrorHTML(res, err) {
    err = sanitizeError(err);
    var html = `
        <h1>${err.statusCode} ${err.name}</h1>
        <p>${err.message}</p>
    `;
    res.status(err.statusCode).type('html').send(html);
}

/**
 * Send JSON object to browser
 *
 * @param  {Response} res
 * @param  {Object} object
 */
function sendJSON(res, object) {
    res.json(object);
}

/**
 * Send error to browser as JSON
 *
 * @param  {Response} res
 * @param  {Error} err
 */
function sendErrorJSON(res, err) {
    if (!err.statusCode || err.statusCode >= 500) {
        console.error(err);
    }
    err = sanitizeError(err);
    res.status(err.statusCode).json(_.omit(err, 'statusCode'));
}

/**
 * Replace unexpected error with generic one on production to avoid leaking
 * sensitive information
 *
 * @param  {Error} err
 *
 * @return {Error}
 */
function sanitizeError(err) {
    if (!err.statusCode) {
        // not an expected error
        console.error(err);
        var message = err.message;
        if (process.env.NODE_ENV === 'production') {
            message = 'The application has encountered an unexpected fault';
        }
        err = new HTTPError(500, { message });
    }
    return err;
}

/**
 * Create a new session object
 *
 * @param  {Request} req
 * @param  {Response} res
 */
function handleSessionStart(req, res) {
    var area = _.toLower(req.body.area);
    var handle = _.toLower(req.body.handle);
    return findSystem().then((system) => {
        if (!(area === 'client' || area === 'admin')) {
            throw new HTTPError(400);
        }
        if (!handle) {
            return createRandomToken(8).then((handle) => {
                // create session object
                var etime = getFutureTime(SESSION_LIFETIME_AUTHENTICATION);
                return saveSession({ area, handle, etime });
            }).then((session) => {
                return findOAuthServers(area).then((servers) => {
                    return {
                        session: _.pick(session, 'handle', 'etime'),
                        system: _.pick(system, 'details'),
                        servers: _.map(servers, (server) => {
                            return _.pick(server, 'id', 'type', 'details')
                        })
                    };
                });
            })
        } else {
            return findSession(handle).then((orgSession) => {
                if (orgSession.area !== area) {
                    throw new HTTPError(403);
                }
                return createRandomToken(8).then((handle) => {
                    return createRandomToken(16).then((token) => {
                        var etime = getFutureTime(SESSION_LIFETIME_DEVICE_ACTIVATION);
                        var session = {
                            area,
                            handle,
                            token,
                            etime,
                            user_id: orgSession.user_id
                        };
                        return saveSession(session).then((session) => {
                            return {
                                session: _.pick(session, 'handle', 'etime')
                            };
                        });
                    });
                });
            });
        }
    }).then((info) => {
        sendJSON(res, info);
    }).catch((err) => {
        sendErrorJSON(res, err);
    });
}

/**
 * Handle authentication by password stored in a htpasswd file
 *
 * @param  {Request} req
 * @param  {Response} res
 */
function handleHTPasswdRequest(req, res) {
    var handle = _.toLower(req.body.handle);
    var username = _.trim(_.toLower(req.body.username));
    var password = _.trim(req.body.password);
    return findSession(handle).then((session) => {
        return findHtpasswdRecord(username, password).then(() => {
            return findUserByName(username).then((user) => {
                return authorizeUser(session, user, {}, true).then((session) => {
                    return {
                        session: _.pick(session, 'token', 'user_id', 'etime')
                    };
                });
            });
        })
    }).then((info) => {
        sendJSON(res, info);
    }).catch((err) => {
        sendErrorJSON(res, err);
    });
}

/**
 * Return an authentication object, used by the client to determine if login
 * was successful
 *
 * @param  {Request} req
 * @param  {Response} res
 */
function handleSessionRetrieval(req, res) {
    var handle = _.toLower(req.query.handle);
    return findSession(handle).then((session) => {
        if (session.activated) {
            throw new HTTPError(410);
        }
        if (session.token) {
            session.activated = true;
            session.etime = getFutureTime(SESSION_LIFETIME_CLIENT);
            return saveSession(session).then((session) => {
                return {
                    session: _.pick(session, 'token', 'user_id', 'etime')
                };
            });
        } else {
            var error = session.details.error;
            if (error) {
                throw new HTTPError(error);
            }
        }
    }).then((info) => {
        sendJSON(res, info);
    }).catch((err) => {
        sendErrorJSON(res, err);
    });
}

/**
 * Mark session object as deleted
 *
 * @param  {Request} req
 * @param  {Response} res
 */
function handleSessionTermination(req, res) {
    var handle = _.toLower(req.body.handle);
    return removeSession(handle).then((session) => {
        return removeDevices(session.handle).then(() => {
            return {};
        });
    }).then((info) => {
        sendJSON(res, info);
    }).catch((err) => {
        sendErrorJSON(res, err);
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
    var query = extractQueryVariables(req.query);
    var serverId = parseInt(query.sid);
    var handle = _.toLower(query.handle);
    return findSession(handle).then((session) => {
        return findSystem().then((system) => {
            return findServer(serverId).then((server) => {
                var params = { sid: serverId, handle };
                return authenticateThruPassport(req, res, system, server, params).then((account) => {
                    return findMatchingUser(server, account).then((user) => {
                        // save the info from provider for potential future use
                        var details = {
                            profile: account.profile._json,
                            access_token: account.accessToken,
                            refresh_token: account.refreshToken,
                        };
                        return authorizeUser(session, user, details);
                    });
                }).catch((err) => {
                    // save the error
                    session.details.error = _.pick(err, 'statusCode', 'code', 'message', 'reason', 'stack');
                    return saveSession(session);
                });
            });
        });
    }).then(() => {
        var html = `<script> close() </script>`;
        sendHTML(res, html);
    }).catch((err) => {
        sendErrorHTML(res, err);
    });
}

/**
 * Acquire access token from an OAuth provider
 *
 * @param  {Request}   req
 * @param  {Response}  res
 * @param  {Function}  done
 */
function handleOAuthTestRequest(req, res, done) {
    var query = extractQueryVariables(req.query);
    if (!query.test) {
        return done();
    }
    var serverId = parseInt(query.sid);
    return findSystem().then((system) => {
        return findServer(serverId).then((server) => {
            var params = { test: 1, sid: serverId, handle: 'TEST' };
            return authenticateThruPassport(req, res, system, server, params);
        });
    }).then(() => {
        var html = `<h1>OK</h1>`;
        sendHTML(res, html);
    }).catch((err) => {
        sendErrorHTML(res, err);
    });
}

/**
 * Acquire access token from an OAuth provider
 *
 * @param  {Request}   req
 * @param  {Response}  res
 * @param  {Function}  done
 */
function handleOAuthActivationRequest(req, res, done) {
    var query = extractQueryVariables(req.query);
    if (!query.activation) {
        return done();
    }
    var serverId = parseInt(query.sid);
    var handle = _.toLower(query.handle);
    return findSession(handle).then((session) => {
        // make sure we have admin access
        if (session.area !== 'admin') {
            throw new HTTPError(403);
        }
        return findSystem().then((system) => {
            return findServer(serverId).then((server) => {
                var params = { activation: 1, sid: serverId, handle };
                return authenticateThruPassport(req, res, system, server, params).then((account) => {
                    var profile = account.profile._json;
                    var isAdmin = false;
                    if (server.type === 'gitlab') {
                        isAdmin = profile.is_admin;
                    }
                    if (!isAdmin) {
                        var username = account.profile.username;
                        throw new HTTPError(403, {
                            reason: 'insufficient-access-right',
                            message: `The account "${username}" does not have administrative access`,
                        });
                    }
                    // save the access and refresh tokens
                    server.settings.api = {
                        access_token: account.accessToken,
                        refresh_token: account.refreshToken,
                    };
                    return saveServer(server);
                });
            });
        });
    }).then(() => {
        var html = `<h1>OK</h1>`;
        sendHTML(res, html);
    }).catch((err) => {
        sendErrorHTML(res, err);
    });
}

/**
 * Handle requests for legal documents
 *
 * @param  {Request}   req
 * @param  {Response}  res
 */
function handleLegalDocumentRequest(req, res) {
    return Database.open().then((db) => {
        return System.findOne(db, 'global', { deleted: false }, 'details').then((system) => {
            var name = req.params.name;
            var path = `${__dirname}/templates/${name}.ejs`;
            var company = _.get(system, 'details.company_name', 'Our company');
            FS.readFileAsync(path, 'utf-8').then((text) => {
                var fn = _.template(text);
                var html = fn({ company });
                res.type('html').send(html);
            });
        });
    });
}

/**
 * Add authorization token to session, making sure user can  access the area
 * in question first
 *
 * @param  {Session} session
 * @param  {User} user
 * @param  {Object} details
 * @param  {Boolean} activate
 *
 * @return {Promise<Session>}
 */
function authorizeUser(session, user, details, activate) {
    return createRandomToken(16).then((token) => {
        if (session.area === 'admin' && user.type !== 'admin') {
            throw new HTTPError(403, {
                reason: 'restricted-area',
                username: user.username,
            });
        }
        if (user.disabled) {
            throw new HTTPError(403, {
                reason: 'account-disabled',
                username: user.username,
            });
        }
        if (session.user_id && session.user_id !== user.id) {
            // the session is already associated with a different user, what the...
            throw new HTTPError(400);
        }
        if (session.token) {
            throw new HTTPError(400);
        }
        session.user_id = user.id;
        session.token = token;
        if (session.area === 'client') {
            session.etime = getFutureTime(SESSION_LIFETIME_CLIENT);
        } else if (session.area === 'admin') {
            session.etime = getFutureTime(SESSION_LIFETIME_ADMIN);
        }
        if (activate) {
            session.activated = true;
        }
        session.details = _.assign(_.omit(session.details, 'error'), details);
        return saveSession(session);
    });
}

/**
 * Authenticate user through one of the Passport plugins
 *
 * @param  {Request} req
 * @param  {Response} res
 * @param  {System} system
 * @param  {Server} server
 * @param  {Object} params
 *
 * @return {Promise<Object>}
 */
function authenticateThruPassport(req, res, system, server, params) {
    return new Promise((resolve, reject) => {
        var provider = req.params.provider;
        // query variables are send as the state parameter
        var query = _.reduce(params, (query, value, name) => {
            if (query) {
                query += '&';
            }
            query += name + '=' + value;
            return query;
        }, '');
        var address = _.get(system, 'settings.address');
        if (!address) {
            throw new HTTPError(400, { message: 'Missing site address' });
        }
        var settings = addServerSpecificSettings(server, {
            clientID: server.settings.oauth.client_id,
            clientSecret: server.settings.oauth.client_secret,
            baseURL: server.settings.oauth.base_url,
            callbackURL: `${address}/srv/session/${provider}/callback/`,
        });
        var options = addServerSpecificOptions(server, params, {
            session: false,
            state: query,
        });
        // create strategy object, resolving promise when we have the profile
        var Strategy = findPassportPlugin(server);
        var strategy = new Strategy(settings, (accessToken, refreshToken, profile, done) => {
            // just resolve the promise--no need to call done() since we're not
            // using Passport as an Express middleware
            resolve({ accessToken, refreshToken, profile });
        });
        // trigger Passport middleware manually
        Passport.use(strategy);
        var authType = server.type;
        var auth = Passport.authenticate(strategy.name, options, (err, user, info) => {
            // if this callback is called, then authentication has failed, since
            // the callback passed to Strategy() resolves the promise and does
            // not invoke done()
            var message, reason;
            if (info && info.message) {
                message = info.message;
            } else if (err && err.message) {
                if (err.oauthError) {
                    message = err.oauthError.message;
                } else {
                    message = err.message;
                }
            }
            reject(new HTTPError(403, { message, reason: 'access-denied' }));
        });
        auth(req, res);
    });
}

/**
 * Create or update session object
 *
 * @param  {Object} session
 *
 * @return {Promise<Session>}
 */
function saveSession(session) {
    return Database.open().then((db) => {
        return Session.saveOne(db, 'global', session);
    });
}

/**
 * Mark session as deleted
 *
 * @param  {Object} session
 *
 * @return {Promise<Session>}
 */
function removeSession(handle) {
    return Database.open().then((db) => {
        return Session.findOne(db, 'global', { handle }, 'id').then((session) => {
            if (!session) {
                throw new HTTPError(404);
            }
            session.deleted = true;
            return Session.updateOne(db, 'global', session);
        });
    });
}

/**
 * Find a session object
 *
 * @param  {String} handle
 *
 * @return {Promise<Session>}
 */
function findSession(handle) {
    return Database.open().then((db) => {
        var criteria = {
            handle,
            expired: false,
            deleted: false,
        };
        return Session.findOne(db, 'global', criteria, '*').then((session) => {
            if (!session) {
                throw new HTTPError(404);
            }
            return session;
        });
    });
}

/**
 * Find a system object
 *
 * @return {Promise<System>}
 */
function findSystem() {
    return Database.open().then((db) => {
        var criteria = { deleted: false };
        return System.findOne(db, 'global', criteria, '*');
    });
}

/**
 * Find a server object
 *
 * @param  {Number} serverId
 *
 * @return {Promise<Server>}
 */
function findServer(serverId) {
    return Database.open().then((db) => {
        var criteria = { id: serverId, deleted: false };
        return Server.findOne(db, 'global', criteria, '*').then((server) => {
            if (!server) {
                throw new HTTPError(400);
            }
            return server;
        });
    });
}

/**
 * Find servers that provide OAuth authentication
 *
 * @param  {String} area
 *
 * @return {Promise<Array<Server>>}
 */
function findOAuthServers(area) {
    return Database.open().then((db) => {
        var criteria = {
            deleted: false,
            disabled: false,
        };
        return Server.find(db, 'global', criteria, '*').filter((server) => {
            return canProvideAccess(server, area);
        });
    });
}

/**
 * Create or update a server object
 *
 * @param  {Server} server
 *
 * @return {Promise<Server>}
 */
function saveServer(server) {
    return Database.open().then((db) => {
        return Server.saveOne(db, 'global', server);
    });
}

/**
 * Find a user object
 *
 * @param  {Number} userId
 *
 * @return {Promise<User>}
 */
function findUser(userId) {
    return Database.open().then((db) => {
        var criteria = { id: userId, deleted: false };
        return User.findOne(db, 'global', criteria, '*').then((user) => {
            if (!user) {
                throw new HTTPError(401);
            }
            return user;
        });
    });
}

/**
 * Find a user object by username
 *
 * @param  {String} username
 *
 * @return {Promise<User>}
 */
function findUserByName(username) {
    return Database.open().then((db) => {
        var criteria = { username, deleted: false };
        return User.findOne(db, 'global', criteria, '*').then((user) => {
            if (!user) {
                // create the admin user if it's not there
                var name = _.capitalize(username);
                if (name === 'Root') {
                    name = 'Administrator';
                }
                var user = {
                    username,
                    type: 'admin',
                    details: { name },
                    settings: UserSettings.default,
                };
                return User.insertOne(db, 'global', user);
            }
            return user;
        });
    });
}

/**
 * Remove devices connected with specified session handle(s)
 *
 * @param  {String|Array<String>} handles
 *
 * @return {Array<Device>}
 */
function removeDevices(handles) {
    return Database.open().then((db) => {
        var criteria = {
            session_handle: handles,
            deleted: false,
        };
        return Device.updateMatching(db, 'global', criteria, { deleted: true });
    });
}

/**
 * Find or create a user that's linked with the external account
 *
 * @param  {Server} server
 * @param  {Object} account
 *
 * @return {Promise<User>}
 */
function findMatchingUser(server, account) {
    // look for a user with the external id
    return Database.open().then((db) => {
        var profile = account.profile;
        var criteria = {
            external_object: ExternalDataUtils.createLink(server, {
                user: { id: getProfileId(profile) },
            }),
            deleted: false,
        };
        return User.findOne(db, 'global', criteria, '*').then((user) => {
            if (user) {
                return user;
            }
            // find a user with the email address
            return Promise.reduce(_.map(profile.emails, 'value'), (matching, email) => {
                if (matching) {
                    return matching;
                }
                if (!email) {
                    return null;
                }
                var criteria = {
                    email: email,
                    deleted: false,
                    order: 'id'
                };
                return User.findOne(db, 'global', criteria, '*');
            }, null);
        }).then((user) => {
            if (user) {
                return user;
            }
            if (server.type === 'gitlab' && profile.username === 'root') {
                var criteria = {
                    username: profile.username,
                    deleted: false,
                };
                return User.findOne(db, 'global', criteria, '*');
            } else {
                return null;
            }
        }).then((user) => {
            if (user) {
                // update profile in background
                retrieveProfileImage(profile).then((image) => {
                    var userAfter = copyUserProperties(user, server, image, profile);
                    if(_.isEqual(userAfter, user)) {
                        return user;
                    }
                    return User.updateOne(db, 'global', userAfter);
                });
                return user;
            } else {
                if (!acceptNewUser(server)) {
                    throw new HTTPError(403, {
                        reason: 'existing-users-only',
                    });
                }
                return retrieveProfileImage(profile).then((image) => {
                    var userAfter = copyUserProperties(null, server, image, profile);
                    if (userAfter.disabled) {
                        // don't create disabled user
                        throw new HTTPError(403, {
                            reason: 'existing-users-only',
                        });
                    }
                    return User.insertUnique(db, 'global', userAfter);
                });
            }
        });
    });
}

/**
 * Find matching entry in htpasswd file (throw otherwise)
 *
 * @param  {String} username
 * @param  {String} password
 *
 * @return {Promise}
 */
function findHtpasswdRecord(username, password) {
    var htpasswdPath = process.env.HTPASSWD_PATH;
    return FS.readFileAsync(htpasswdPath, 'utf-8').then((data) => {
        return HtpasswdAuth.authenticate(username, password, data);
    }).then((successful) => {
        if (successful !== true) {
            return Promise.delay(Math.random() * 1000).then(() => {
                throw new HTTPError(401);
            });
        }
    }).catch((err) => {
        if (err.code === 'ENOENT') {
            // password file isn't there
            throw new HTTPError(403, {
                reason: 'missing-password-file'
            });
        } else {
            throw err;
        }
    });
}

/**
 * Return a Passport plugin
 *
 * @param  {Server} server
 *
 * @return {Function}
 */
function findPassportPlugin(server) {
    var plugins = {
        dropbox: 'passport-dropbox-oauth2',
        facebook: 'passport-facebook',
        github: 'passport-github',
        gitlab: 'passport-gitlab2',
        google: 'passport-google-oauth2',
        windows: 'passport-windowslive',
    };
    var module = require(plugins[server.type]);
    if (!(module instanceof Function)) {
        if (module.Strategy) {
            module = module.Strategy;
        }
    }
    return module;
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
        if (server.settings.oauth.client_id && server.settings.oauth.client_secret) {
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

/**
 * Return true if server accepts new users
 *
 * @param  {Server} server
 *
 * @return {Boolean}
 */
function acceptNewUser(server) {
    var type = _.get(server, 'settings.user.type');
    var mapping = _.get(server, 'settings.user.mapping');
    return !!type || _.some(mapping);
}

/**
 * Get user id from OAuth profile
 *
 * @param  {Object} profile
 *
 * @return {Number|String}
 */
function getProfileId(profile) {
    // return the id from the raw object if it's there so we have the
    // correct JS type
    return profile._json.id || profile.id;
}

/**
 * Copy information from Passport profile object into user object
 *
 * @param  {User|null} user
 * @param  {Server} server
 * @param  {Object} image
 * @param  {Object} profile
 *
 * @return {User|null}
 */
function copyUserProperties(user, server, image, profile) {
    var json = profile._json;
    if (server.type === 'gitlab') {
        // use GitlabAdapter's importer
        return GitlabUserImporter.copyUserProperties(user, server, image, json);
    } else {
        var email = _.first(_.map(profile.emails, 'value'));
        var username = profile.username || proposeUsername(profile);
        var userType = _.get(server, 'settings.user.type');
        var overwriteUserType = 'never';
        var userAfter;
        if (user) {
            userAfter = _.cloneDeep(user);

            // overwrite user type if new type has more privileges
            if (UserTypes.indexOf(userType) > UserTypes.indexOf(user.type)) {
                overwriteUserType = 'always';
            }
        } else {
            userAfter = {
                role_ids: _.get(server, 'settings.user.role_ids', []),
                settings: UserSettings.default,
            };
        }

        ExternalDataUtils.addLink(userAfter, server, {
            user: {
                id: getProfileId(profile),
                username: profile.username,
            }
        });
        ExternalDataUtils.importProperty(userAfter, server, 'type', {
            value: userType,
            overwrite: overwriteUserType,
        });
        ExternalDataUtils.importProperty(userAfter, server, 'username', {
            value: username,
            overwrite: 'match-previous:username',
        });
        ExternalDataUtils.importProperty(userAfter, server, 'details.name', {
            value: profile.displayName,
            overwrite: 'match-previous:name',
        });
        ExternalDataUtils.importProperty(userAfter, server, 'details.email', {
            value: email,
            overwrite: 'match-previous:email',
        });
        ExternalDataUtils.importProperty(userAfter, server, 'details.gender', {
            value: json.gender,
            overwrite: 'match-previous:gender',
        });
        ExternalDataUtils.importResource(userAfter, server, {
            type: 'image',
            value: image,
            replace: 'match-previous'
        });
        if (server.type === 'github') {
            ExternalDataUtils.importProperty(userAfter, server, 'details.github_url', {
                value: profile.profileUrl,
                overwrite: 'match-previous:github_url',
            });
        }
        if (!userAfter.type) {
            userAfter.type = 'regular';
            userAfter.disabled = true;
        }
        return userAfter;
    }
}

/**
 * Propose a username based on user's profile information
 *
 * @param  {Object} profile
 *
 * @return {String}
 */
function proposeUsername(profile) {
    if (profile.username) {
        return profile.username;
    }
    var email = _.get(profile.emails, '0.value');
    if (email) {
        return _.replace(email, /@.*/, '');
    }
    var lname = toSimpleLatin(profile.name.familyName);
    var fname = toSimpleLatin(profile.name.givenName);
    if (lname && fname) {
        return fname.charAt(0) + lname;
    } else if (fname || lname) {
        return fname || lname;
    }
    return 'user';
}

/**
 * Convert string to ASCII lowercase
 *
 * @param  {String} s
 *
 * @return {String}
 */
function toSimpleLatin(s) {
    if (s) {
        return s.normalize('NFD').toLowerCase().replace(/[^a-z]/g, '');
    }
}

/**
 * Ask Media Server to import an external user's avatar
 *
 * @param  {Object} profile
 *
 * @return {Promise<Object>}
 */
function retrieveProfileImage(profile) {
    var url = profile.avatarURL;
    if (!url) {
        url = _.get(profile.photos, '0.value') || _.get(profile.avatarURL);
    }
    if (!url) {
        url = profile.avatarUrl;
    }
    if (!url) {
        return Promise.resolve(null);
    }
    var options = {
        json: true,
        url: 'http://media_server/srv/internal/import',
        body: {
            external_url: url
        },
    };
    return new Promise((resolve, reject) => {
        Request.post(options, (err, resp, body) => {
            if (!err) {
                resolve(body);
            } else {
                console.log('Unable to retrieve profile image: ' + url);
                resolve(null);
            }
        });
    });
}

/**
 * Create a random token with given number of bytes
 *
 * @param  {Number} bytes
 *
 * @return {Promise<String>}
 */
function createRandomToken(bytes) {
    return Crypto.randomBytesAsync(bytes).then((buffer) => {
        return buffer.toString('hex');
    });
}

/**
 * Return an boxed string contain the PostgreSQL expression for time
 * that's the given number of minutes ahead of now
 *
 * @param  {Number} minutes
 *
 * @return {Object}
 */
function getFutureTime(minutes) {
    return new String(`NOW() + '${minutes} minute'`);
}

/**
 * Add server-specific OAuth settings (passed to constructor)
 *
 * @param  {Server} server
 * @param  {Object} settings
 *
 * @return {Object}
 */
function addServerSpecificSettings(server, settings) {
    switch (server.type) {
        case 'dropbox':
            settings.apiVersion = '2';
            break;
    }
    return settings;
}

/**
 * Add server-specific OAuth options
 *
 * @param  {Server} server
 * @param  {Object} params
 * @param  {Object} options
 *
 * @return {Object}
 */
function addServerSpecificOptions(server, params, options) {
    switch (server.type) {
        case 'facebook':
            options.profileFields = [ 'id', 'email', 'gender', 'link', 'displayName', 'name', 'picture', 'verified' ];
            break;
        case 'gitlab':
            if (params.activation) {
                options.scope = [ 'api' ];
            }
            break;
        case 'google':
            options.scope = [ 'profile' ];
            break;
        case 'windows':
            options.scope = [ 'wl.signin', 'wl.basic', 'wl.emails' ];
            break;
    }
    return options;
}

function extractQueryVariables(query) {
    if (query.state) {
        return parseQueryString(query.state);
    } else {
        return query;
    }
}

/**
 * Parse a query string
 *
 * @param  {String} queryString
 *
 * @return {Object}
 */
function parseQueryString(queryString) {
    var values = {};
    var pairs = _.split(queryString, '&');
    _.each(pairs, (pair) => {
        var parts = _.split(pair, '=');
        var name = decodeURIComponent(parts[0]);
        var value = decodeURIComponent(parts[1] || '');
        value = _.replace(value, /\+/g, ' ');
        values[name] = value;
    });
    return values;
}

/**
 * Remove old unused session objects
 *
 * @return {Promise<Array>}
 */
function deleteExpiredSessions() {
    return Database.open().then((db) => {
        var criteria = {
            authorization_id: null,
            expired: true,
        };
        return Session.updateMatching(db, 'global', criteria, { deleted: true }).then((sessions) => {
            var handles = _.map(sessions, 'handle');
            return removeDevices(handles).return(sessions);
        });
    });
}

if (process.argv[1] === __filename) {
    start();
}

Shutdown.on(stop);
