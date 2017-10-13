var _ = require('lodash');
var Promise = require('bluebird');
var Express = require('express');
var BodyParser = require('body-parser');
var Passport = require('passport')
var Crypto = Promise.promisifyAll(require('crypto'));
var FS = Promise.promisifyAll(require('fs'));
var Moment = require('moment');
var Request = require('request');
var HtpasswdAuth = require('htpasswd-auth');
var HttpError = require('errors/http-error');
var Database = require('database');
var Async = require('async-do-while');

var Authentication = require('accessors/authentication');
var Authorization = require('accessors/authorization');
var Project = require('accessors/project');
var Server = require('accessors/server');
var System = require('accessors/system');
var User = require('accessors/user');

var server;

function start() {
    var app = Express();
    app.set('json spaces', 2);
    app.use(BodyParser.json());
    app.use(Passport.initialize());
    app.post('/auth/session', handleSessionStart);
    app.get('/auth/session/:token', handleSessionRetrieval);
    app.post('/auth/session/:token/end', handleSessionTermination);
    app.post('/auth/htpasswd', handleHttpasswdRequest);
    app.get('/auth/:provider', handleOAuthActivationRequest, handleOAuthRequest);
    app.get('/auth/:provider/:callback', handleOAuthActivationRequest, handleOAuthRequest);
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
 * Send response to browser as JSON object or HTML text
 *
 * @param  {Response} res
 * @param  {Object|String} result
 */
function sendResponse(res, result) {
    if (typeof(result) === 'string') {
        res.type('html').send(result);
    } else {
        res.json(result);
    }
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
function handleSessionStart(req, res) {
    var host = req.headers['host'];
    var protocol = req.headers['x-connection-protocol'];
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
            return Server.find(db, 'global', criteria, '*').then((servers) => {
                var providers = _.filter(_.map(servers, (server) => {
                    if (canProvideAccess(server, area)) {
                        var url = `${protocol}://${host}/auth/${server.type}?sid=${server.id}&token=${authentication.token}`;
                        return {
                            type: server.type,
                            details: server.details,
                            url,
                        };
                    }
                }));
                return System.findOne(db, 'global', criteria, '*').then((system) => {
                    if (!system) {
                        // in case the system object hasn't been created yet
                        system = { details: {} };
                    }
                    return {
                        system: _.pick(system, 'details'),
                        authentication: _.pick(authentication, 'token'),
                        providers,
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
 * Handle authentication by password stored in a htpasswd file
 *
 * @param  {Request} req
 * @param  {Response} res
 */
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
                var userColumns = 'id, type, approved, requested_project_ids';
                return User.findOne(db, 'global', criteria, userColumns).then((user) => {
                    if (!user) {
                        // create the admin user if it's not there
                        var name = _.capitalize(username);
                        if (name === 'Root') {
                            name = 'Administrator';
                        }
                        var user = {
                            type: 'admin',
                            username,
                            details: { name },
                            hidden: true,
                        };
                        return User.insertOne(db, 'global', user);
                    }
                    return user;
                });
            }).then((user) => {
                return authorizeUser(db, user, authentication, 'htpasswd').then((authorization) => {
                    return {
                        authorization: {
                            token: authorization.token,
                            user_id: authorization.user_id,
                        }
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
function handleSessionRetrieval(req, res) {
    var token = req.params.token;
    Database.open().then((db) => {
        var criteria = { token, deleted: false };
        return Authorization.findOne(db, 'global', criteria, 'token, user_id').then((authorization) => {
            if (!authorization) {
                return Authentication.findOne(db, 'global', criteria, 'id').then((authentication) => {
                    if (!authentication) {
                        throw new HttpError(404);
                    }
                    // no authorization yet
                    return {};
                });
            }
            // see which projects the user has access to
            var userId = authorization.user_id;
            var userColumns = 'id, type, approved, requested_project_ids';
            return User.findOne(db, 'global', { id: userId }, userColumns).then((user) => {
                return {
                    authorization: {
                        token: authorization.token,
                        user_id: authorization.user_id,
                    }
                };
            });
        });
    }).then((results) => {
        sendResponse(res, results);
    }).catch((err) => {
        sendError(res, err);
    });
}

/**
 * Mark authorization object as deleted
 *
 * @param  {Request} req
 * @param  {Response} res
 */
function handleSessionTermination(req, res) {
    var token = req.params.token;
    Database.open().then((db) => {
        var criteria = { token, deleted: false };
        return Authorization.findOne(db, 'global', criteria, 'id').then((authorization) => {
            if (!authorization) {
                throw new HttpError(404);
            }
            authorization.deleted = true;
            return Authorization.updateOne(db, 'global', authorization).return(true);
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
    var serverId = parseInt(req.query.sid);
    var token = req.query.token;
    Database.open().then((db) => {
        return Authentication.findOne(db, 'global', { token }, '*').then((authentication) => {
            if (!authentication) {
                throw new HttpError(400);
            }
            var criteria = {
                id: serverId,
                deleted: false,
            };
            return Server.findOne(db, 'global', criteria, '*').then((server) => {
                if (!server) {
                    throw new HttpError(400);
                }
                var params = { sid: serverId, token };
                return authenticateThruPassport(req, res, server, params).then((account) => {
                    return findMatchingUser(db, server, account).then((user) => {
                        // save the info from provider for potential future use
                        var details = {
                            profile: account.profile._json,
                            access_token: account.accessToken,
                            refresh_token: account.refreshToken,
                        };
                        return authorizeUser(db, user, authentication, server.type, server.id, details);
                    });
                });
            });
        });
    }).then(() => {
        var html = `<script> close() </script>`;
        sendResponse(res, html);
    }).catch((err) => {
        // display error
        sendError(res, err);
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
    if (!req.query.activation) {
        done();
        return;
    }

    var serverId = parseInt(req.query.sid);
    var token = req.query.token;
    Database.open().then((db) => {
        // make sure we have admin access
        return Authorization.check(db, token, 'admin').then((userId) => {
            var criteria = {
                id: serverId,
                deleted: false,
            };
            return Server.findOne(db, 'global', criteria, '*').then((server) => {
                if (!server) {
                    throw new HttpError(400);
                }
                var params = { activation: 1, sid: serverId, token };
                var scope;
                if (server.type === 'gitlab') {
                    scope = [ 'api' ];
                }
                return authenticateThruPassport(req, res, server, params, scope).then((account) => {
                    var profile = account.profile._json;
                    var isAdmin = false;
                    if (server.type === 'gitlab') {
                        isAdmin = profile.is_admin;
                    }
                    if (!isAdmin) {
                        var name = account.profile.displayName;
                        throw new HttpError(403, {
                            reason: `The account "${name}" does not have administrative access`,
                        });
                    }
                    // save the access and refresh tokens
                    var settings = _.clone(server.settings);
                    settings.api = {
                        access_token: account.accessToken,
                        refresh_token: account.refreshToken,
                    };
                    return Server.updateOne(db, 'global', { id: server.id, settings });
                });
            });
        });
    }).then(() => {
        var html = `
            <h1>Success</h1>
            <script> setTimeout(close, 500) </script>
        `;
        sendResponse(res, html);
    }).catch((err) => {
        // TODO: display error as HTML
        sendError(res, err);
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
 * @return {Promise<Authorization>}
 */
function authorizeUser(db, user, authentication, authType, serverId, details) {
    if (!user) {
        return Promise.resolve(new HttpError(401));
    }
    if (authentication.area === 'admin' && user.type !== 'admin') {
        return Promise.resolve(new HttpError(403));
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

var plugins = {
    dropbox: 'passport-dropbox-oauth2',
    facebook: 'passport-facebook',
    github: 'passport-github',
    gitlab: 'passport-gitlab2',
    google: 'passport-google-oauth2',
};

function authenticateThruPassport(req, res, server, params, scope) {
    return new Promise((resolve, reject) => {
        // obtain info needed for callback URL from Request object
        var host = req.headers['host'];
        var protocol = req.headers['x-connection-protocol'];
        var provider = req.params.provider;
        // add params as query variables in callback URL
        var query = _.reduce(params, (query, value, name) => {
            if (query) {
                query += '&';
            }
            query += name + '=' + value;
            return query;
        }, '');
        var url = `${protocol}://${host}/auth/${provider}/callback?${query}`;
        // add callback URL to server's OAuth credentials
        var credentials = _.extend({}, server.settings.oauth, { callbackURL: url });
        var options = { session: false, scope };
        if (provider === 'facebook') {
            // ask Facebook to return these fields
            credentials.profileFields = [
                'id',
                'email',
                'gender',
                'link',
                'displayName',
                'name',
                'picture',
                'verified'
            ];
        }
        // create strategy object, resolving promise when we have the profile
        var Strategy = require(plugins[server.type]);
        var strategy = new Strategy(credentials, (accessToken, refreshToken, profile, done) => {
            // just resolve the promise--no need to call done() since we're not
            // using Passport as an Express middleware
            resolve({ accessToken, refreshToken, profile });
        });
        // trigger Passport middleware manually
        Passport.use(strategy);
        var auth = Passport.authenticate(server.type, options, (err, user, info) => {
            // if this callback is called, then authentication has failed, since
            // the callback passed to Strategy() resolves the promise and does
            // not invoke done()
            reject(err);
        });
        auth(req, res);
    });
}

/**
 * Find or create a user that's linked with the external account
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Object} account
 *
 * @return {Promise<User>}
 */
function findMatchingUser(db, server, account) {
    // look for a user with the external id
    var criteria = {
        external_id: parseInt(account.profile.id),
        server_id: server.id,
        deleted: false,
    };
    return User.findOne(db, 'global', criteria, 'id, type').then((user) => {
        if (user) {
            return user;
        }
        // look for a user that isn't bound to an external account yet
        var criteria = {
            external_id: null,
            deleted: false,
        };
        return User.find(db, 'global', criteria, '*').then((users) => {
            // match e-mail address
            var emails = _.map(account.profile.emails, 'value');
            var matching = _.find(users, (user) => {
                // if server match the provider specified or if "any"
                // provider was selected
                if (user.server_id === server.id && user.server_id === 0) {
                    return _.includes(emails, user.details.email);
                }
            });
            if (matching) {
                matching.server_id = server.id;
                matching.external_id = externalId;
                return User.updateOne(db, 'global', matching);
            } else {
                // create the user
                return createNewUser(db, server, account);
            }
        });
    });
}

/**
 * Create a user connected to external account
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Object} account
 *
 * @return {Promise<User>}
 */
function createNewUser(db, server, account) {
    var profile = account.profile;
    var preferredUsername = proposeUsername(profile);
    // TODO: add server settings
    var acceptingUser = true;
    var autoApprove = false;
    var userType = 'guest';
    if (!acceptingUser) {
        throw new HttpError(403);
    }
    return retrieveProfileImage(profile).then((image) => {
        var user = {
            external_id: parseInt(account.profile.id),
            server_id: server.id,
            username: preferredUsername,
            type: userType,
            details: extractUserDetails(server.type, profile._json),
            approved: autoApprove,
        };
        if (image) {
            image[`from_${server.type}`] = true;
            image.type = 'image';
            user.details.resources = [ image ];
        }
        var attempts = 1;
        var newUser;
        Async.do(() => {
            return User.insertOne(db, 'global', user).then((user) => {
                newUser = user;
            }).catch((err) => {
                // unique violation
                if (err.code === '23505') {
                    attempts++;
                    user.username = preferredUserName + attempts;
                } else {
                    throw err;
                }
            });
        });
        Async.while(() => { return !newUser });
        Async.return(() => { return newUser });
        return Async.end();
    });
}

/**
 * Extract user details from provider-specific profile
 *
 * @param  {String} type
 * @param  {Object} profile
 *
 * @return {Object}
 */
function extractUserDetails(type, profile) {
    var details = {};
    if (type === 'gitlab') {
        var nameParts = _.split(profile.name, /\s+/);
        details.first_name = (nameParts.length >= 2) ? _.first(nameParts) : undefined;
        details.last_name = (nameParts.length >= 2) ? _.last(nameParts) : undefined;
        details.name = profile.name;
        details.gitlab_url = profile.web_url;
        details.skype_username = profile.skype || undefined;
        details.twitter_username = profile.twitter || undefined;
        details.linkedin_username = profile.linkedin_name || undefined;
        details.email = profile.email;
    } else if (type === 'facebook') {
        details.name = profile.name;
        details.email = profile.email;
        details.gender = profile.gender;
        details.first_name = profile.first_name;
        details.last_name = profile.last_name;
    }
    return details;
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
    var url = profile.avatarUrl;
    if (!url) {
        url = _.get(profile.photos, '0.value')
    }
    if (!url) {
        return Promise.resolve(null);
    }
    var options = {
        json: true,
        url: 'http://media_server/internal/import',
        body: {
            external_url: url
        },
    };
    return new Promise((resolve, reject) => {
        Request.post(options, (err, resp, body) => {
            if (!err && resp && resp.statusCode >= 400) {
                err = new HttpError(resp.statusCode);
            }
            if (!err) {
                var image = body;
                resolve(image);
            } else {
                console.log('Unable to retrieve profile image: ' + url);
                resolve(null);
            }
        });
    });
}

exports.start = start;
exports.stop = stop;

if (process.argv[1] === __filename) {
    start();
}
