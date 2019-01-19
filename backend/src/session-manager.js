import _ from 'lodash';
import Bluebird from 'bluebird';
import Express from 'express';
import CORS from 'cors';
import BodyParser from 'body-parser';
import Passport from 'passport';
import Crypto from 'crypto'; Bluebird.promisifyAll(Crypto);
import FS from 'fs'; Bluebird.promisifyAll(FS);
import Moment from 'moment';
import Request from 'request';
import HtpasswdAuth from 'htpasswd-auth';
import Async from 'async-do-while';
import HTTPError from 'errors/http-error';
import Database from 'database';
import * as Shutdown from 'shutdown';
import * as ExternalDataUtils from 'objects/utils/external-data-utils';
import { DefaultUserSettings } from 'objects/settings/user-settings';
import * as Whitelist from 'utils/whitelist';

import * as GitlabUserImporter from 'gitlab-adapter/user-importer';

// accessors
import Device from 'accessors/device';
import Project from 'accessors/project';
import Server from 'accessors/server';
import Session from 'accessors/session';
import System from 'accessors/system';
import User from 'accessors/user';

const SESSION_LIFETIME_AUTHENTICATION = 120; // minutes
const SESSION_LIFETIME_DEVICE_ACTIVATION = 60;
const SESSION_LIFETIME_ADMIN = 60 * 24 * 1;
const SESSION_LIFETIME_CLIENT = 60 * 24 * 30;

let server;
let cleanUpInterval;

async function start() {
    let app = Express();
    app.set('json spaces', 2);
    app.use(CORS());
    app.use(BodyParser.json());
    app.use(BodyParser.urlencoded({ extended: true }));
    app.use(Passport.initialize());

    app.route('/srv/session/?')
        .post(handleSessionStart)
        .get(handleSessionRetrieval)
        .delete(handleSessionTermination);
    app.route('/srv/session/:name(terms|privacy)/?')
        .get(handleLegalDocumentRequest);
    app.route('/srv/session/htpasswd/?')
        .post(handleHTPasswdRequest);
    app.route('/srv/session/:provider/callback/?')
        .get(handleOAuthTestRequest)
        .get(handleOAuthActivationRequest)
        .get(handleOAuthRequest);
    app.route('/srv/session/:provider/deauthorize/?')
        .post(handleOAuthDeauthorizationRequest);
    app.route('/srv/session/:provider/?')
        .get(handleOAuthTestRequest)
        .get(handleOAuthActivationRequest)
        .get(handleOAuthRequest);
    server = app.listen(80);

    cleanUpInterval = setInterval(deleteExpiredSessions, 60 * 60 * 1000);
}

async function stop() {
    clearInterval(cleanUpInterval);
    await Shutdown.close(server);
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
    let html = `
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
        let message = err.message;
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
async function handleSessionStart(req, res) {
    try {
        let area = _.toLower(req.body.area);
        let originalHandle = _.toLower(req.body.handle);
        if (!(area === 'client' || area === 'admin')) {
            throw new HTTPError(400);
        }
        let result;
        if (!originalHandle) {
            let handle = await createRandomToken(8);
            // create session object
            let etime = getFutureTime(SESSION_LIFETIME_AUTHENTICATION);
            let session = await saveSession({ area, handle, etime });
            let system = await findSystem();
            let servers = await findOAuthServers(area);
            result = {
                session: _.pick(session, 'handle', 'etime'),
                system: _.pick(system, 'details'),
                servers: _.map(servers, (server) => {
                    return _.pick(server, 'id', 'type', 'details')
                })
            };
        } else {
            // create session for mobile device
            let originalSession = await findSession(originalHandle);
            if (originalSession.area !== area) {
                throw new HTTPError(403);
            }
            let userID = originalSession.user_id;
            let handle = await createRandomToken(8);
            let token = await createRandomToken(16);
            let etime = getFutureTime(SESSION_LIFETIME_DEVICE_ACTIVATION);
            let session = await saveSession({ area, handle, token, etime, user_id: userID });
            result = {
                session: _.pick(session, 'handle', 'etime')
            };
        }
        sendJSON(res, result);
    } catch (err) {
        sendErrorJSON(res, err);
    }
}

/**
 * Handle authentication by password stored in a htpasswd file
 *
 * @param  {Request} req
 * @param  {Response} res
 */
async function handleHTPasswdRequest(req, res) {
    try {
        let handle = _.toLower(req.body.handle);
        let username = _.trim(_.toLower(req.body.username));
        let password = _.trim(req.body.password);
        let session = await findSession(handle);
        let matched = await findHtpasswdRecord(username, password);
        let user = await findUserByName(username);
        let sessionAfter = await authorizeUser(session, user, {}, true);
        let result = {
            session: _.pick(sessionAfter, 'token', 'user_id', 'etime')
        };
        sendJSON(res, result);
    } catch (err) {
        sendErrorJSON(res, err);
    }
}

/**
 * Return an authentication object, used by the client to determine if login
 * was successful
 *
 * @param  {Request} req
 * @param  {Response} res
 */
async function handleSessionRetrieval(req, res) {
    try {
        let handle = _.toLower(req.query.handle);
        let session = await findSession(handle);
        if (session.activated) {
            throw new HTTPError(410);
        }
        let result;
        if (session.token) {
            session.activated = true;
            session.etime = getFutureTime(SESSION_LIFETIME_CLIENT);
            let sessionAfter = await saveSession(session);
            result = {
                session: _.pick(sessionAfter, 'token', 'user_id', 'etime')
            };
        } else {
            let error = session.details.error;
            if (error) {
                throw new HTTPError(error);
            }
            result = null;
        }
        sendJSON(res, result);
    } catch (err) {
        sendErrorJSON(res, err);
    }
}

/**
 * Mark session object as deleted
 *
 * @param  {Request} req
 * @param  {Response} res
 */
async function handleSessionTermination(req, res) {
    try {
        let handle = _.toLower(req.body.handle);
        let session = await removeSession(handle);
        let devices = await removeDevices(session.handle);
        sendJSON(res, {});
    } catch (err) {
        sendErrorJSON(res, err);
    }
}

/**
 * Redirect to OAuth provider
 *
 * @param  {Request}   req
 * @param  {Response}  res
 * @param  {Function} done
 */
async function handleOAuthRequest(req, res, done) {
    try {
        let query = extractQueryVariables(req.query);
        let serverID = parseInt(query.sid);
        let handle = _.toLower(query.handle);
        let session = await findSession(handle);
        try {
            let system = await findSystem();
            let server = await findServer(serverID);
            let params = { sid: serverID, handle };
            let account = await authenticateThruPassport(req, res, system, server, params);
            let user = await findMatchingUser(server, account);
            // save the info from provider for potential future use
            let details = {
                profile: account.profile._json,
                access_token: account.accessToken,
                refresh_token: account.refreshToken,
            };
            await authorizeUser(session, user, details);
        } catch (err) {
            // save the error
            session.details.error = _.pick(err, 'statusCode', 'code', 'message', 'reason', 'stack');
            await saveSession(session);
        }
        let html = `<script> close() </script>`;
        sendHTML(res, html);
    } catch (err) {
        sendErrorHTML(res, err);
    }
}

/**
 * Acquire access token from an OAuth provider
 *
 * @param  {Request}   req
 * @param  {Response}  res
 * @param  {Function}  done
 */
async function handleOAuthTestRequest(req, res, done) {
    let query = extractQueryVariables(req.query);
    if (!query.test) {
        return done();
    }
    try {
        let serverID = parseInt(query.sid);
        let system = await findSystem();
        let server = await findServer(serverID);
        let params = { test: 1, sid: serverID, handle: 'TEST' };
        let account = await authenticateThruPassport(req, res, system, server, params);
        console.log(`OAuth authentication test:\n`);
        console.log(`Display name = ${account.profile.displayName}`);
        console.log(`User name = ${account.profile.username}`);
        console.log(`User ID = ${account.profile.id}`);
        console.log(`Email = ${_.map(account.profile.emails, 'value').join(', ')}`);
        console.log(`Server type = ${server.type}`);
        let html = `<h1>OK</h1>`;
        sendHTML(res, html);
    } catch (err) {
        sendErrorHTML(res, err);
    }
}

/**
 * Acquire access token from an OAuth provider
 *
 * @param  {Request}   req
 * @param  {Response}  res
 * @param  {Function}  done
 */
async function handleOAuthActivationRequest(req, res, done) {
    let query = extractQueryVariables(req.query);
    if (!query.activation) {
        return done();
    }
    try {
        let serverID = parseInt(query.sid);
        let handle = _.toLower(query.handle);
        let session = await findSession(handle);
        // make sure we have admin access
        if (session.area !== 'admin') {
            throw new HTTPError(403);
        }
        let system = await findSystem();
        let server = await findServer(serverID);
        let params = { activation: 1, sid: serverID, handle };
        let account = await authenticateThruPassport(req, res, system, server, params);
        let profile = account.profile._json;
        let isAdmin = false;
        if (server.type === 'gitlab') {
            isAdmin = profile.is_admin;
        }
        if (!isAdmin) {
            let username = account.profile.username;
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
        await saveServer(server);
        let html = `<h1>OK</h1>`;
        sendHTML(res, html);
    } catch (err) {
        sendErrorHTML(res, err);
    }
}

/**
 * Remove relation to external server upon deauthorization request, possibly
 * disabling the account as well
 *
 * @param  {Request}   req
 * @param  {Response}  res
 * @param  {Function}  done
 */
async function handleOAuthDeauthorizationRequest(req, res, done) {
    try {
        let provider = req.params.provider;
        let signedRequest = req.body.signed_request;
        let servers = await findServersByType(req.params.provider);
        let matchingServer, payload, lastError;
        for (let server in servers) {
            // see which server has the right secret
            // having multiple servers isn't really a normal use case
            let secret = _.get(server, 'settings.oauth.client_secret');
            if (secret) {
                try {
                    payload = parseDeauthorizationRequest(signedRequest, secret);
                    if (payload) {
                        matchingServer = server;
                        break;
                    }
                } catch (err) {
                    lastError = err;
                }
            }
        }
        if (payload) {
            return detachExternalAccount(matchingServer, payload.user_id);
        } else {
            if (lastError) {
                throw lastError;
            }
        }
        sendJSON(res, { status: 'ok' });
    } catch (err) {
        console.error(err);
        sendErrorJSON(res, err);
    }
}

/**
 * Handle requests for legal documents
 *
 * @param  {Request}   req
 * @param  {Response}  res
 */
async function handleLegalDocumentRequest(req, res) {
    try {
        let db = await Database.open();
        let system = await System.findOne(db, 'global', { deleted: false }, 'details');
        let name = req.params.name;
        let path = `${__dirname}/templates/${name}.ejs`;
        let company = _.get(system, 'details.company_name', 'Our company');
        let text = await FS.readFileAsync(path, 'utf-8');
        let fn = _.template(text);
        let html = fn({ company });
        sendHTML(res, html);
    } catch (err) {
        sendErrorHTML(res, err);
    }
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
async function authorizeUser(session, user, details, activate) {
    let token = await createRandomToken(16);
    if (session.area === 'admin' && user.type !== 'admin') {
        if (!process.env.ADMIN_GUEST_MODE) {
            throw new HTTPError(403, {
                reason: 'restricted-area',
                username: user.username,
            });
        }
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
async function authenticateThruPassport(req, res, system, server, params) {
    return new Promise((resolve, reject) => {
        let provider = req.params.provider;
        // query variables are send as the state parameter
        let query = _.reduce(params, (query, value, name) => {
            if (query) {
                query += '&';
            }
            query += name + '=' + value;
            return query;
        }, '');
        let address = _.get(system, 'settings.address');
        if (!address) {
            throw new HTTPError(400, { message: 'Missing site address' });
        }
        let settings = addServerSpecificSettings(server, {
            clientID: server.settings.oauth.client_id,
            clientSecret: server.settings.oauth.client_secret,
            baseURL: server.settings.oauth.base_url,
            callbackURL: `${address}/srv/session/${provider}/callback/`,
        });
        let options = addServerSpecificOptions(server, params, {
            session: false,
            state: query,
        });

        // create strategy object, resolving promise when we have the profile
        let Strategy = findPassportPlugin(server);
        let strategy = new Strategy(settings, (accessToken, refreshToken, profile, done) => {
            // just resolve the promise--no need to call done() since we're not
            // using Passport as an Express middleware
            resolve({ accessToken, refreshToken, profile });
        });
        // trigger Passport middleware manually
        Passport.use(strategy);
        let authType = server.type;
        let auth = Passport.authenticate(strategy.name, options, (err, user, info) => {
            // if this callback is called, then authentication has failed, since
            // the callback passed to Strategy() resolves the promise and does
            // not invoke done()
            let message, reason;
            if (info && info.message) {
                message = info.message;
            } else if (err && err.message) {
                if (err.oauthError) {
                    if (err.oauthError.message) {
                        message = err.oauthError.message;
                    } else if (err.oauthError.data) {
                        try {
                            let oauthResult = JSON.parse(err.oauthError.data);
                            if (oauthResult.error) {
                                message = oauthResult.error.message;
                            }
                        } catch(err) {
                            message = err.message;
                        }
                    }
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
 * Remove link between user and an external account
 *
 * @param  {Server} server
 * @param  {String|Number} externalUserID
 *
 * @return {Promise<User>}
 */
async function detachExternalAccount(server, externalUserID) {
    let db = await Database.open();
    let criteria = {
        external_object: ExternalDataUtils.createLink(server, {
            user: { id: externalUserID },
        }),
    };
    let user = await User.findOne(db, 'global', criteria, '*');
    if (!user) {
        return null;
    }
    ExternalDataUtils.removeLink(user, server);
    let userAfter = await User.saveOne(db, 'global', user);
    // delete active sessions when user is not connected to any account
    if (ExternalDataUtils.countLinks(userAfter) === 0) {
        let sessionCriteria = {
            deleted: false,
            user_id: userAfter.id,
        };
        await Session.updateMatching(db, 'global', sessionCriteria, { deleted: true });
    }
    return userAfter;
}

/**
 * Create or update session object
 *
 * @param  {Object} session
 *
 * @return {Promise<Session>}
 */
async function saveSession(session) {
    let db = await Database.open();
    return Session.saveOne(db, 'global', session);
}

/**
 * Mark session as deleted
 *
 * @param  {Object} session
 *
 * @return {Promise<Session>}
 */
async function removeSession(handle) {
    let db = await Database.open();
    let session = await Session.findOne(db, 'global', { handle }, 'id');
    if (!session) {
        throw new HTTPError(404);
    }
    session.deleted = true;
    return Session.updateOne(db, 'global', session);
}

/**
 * Find a session object
 *
 * @param  {String} handle
 *
 * @return {Promise<Session>}
 */
async function findSession(handle) {
    let db = await Database.open();
    let criteria = {
        handle,
        expired: false,
        deleted: false,
    };
    let session = await Session.findOne(db, 'global', criteria, '*');
    if (!session) {
        throw new HTTPError(404);
    }
    return session;
}

/**
 * Find a system object
 *
 * @return {Promise<System>}
 */
async function findSystem() {
    let db = await Database.open();
    let criteria = { deleted: false };
    return System.findOne(db, 'global', criteria, '*');
}

/**
 * Find a server object
 *
 * @param  {Number} serverID
 *
 * @return {Promise<Server>}
 */
async function findServer(serverID) {
    let db = await Database.open();
    let criteria = { id: serverID, deleted: false };
    let server = await Server.findOne(db, 'global', criteria, '*');
    if (!server) {
        throw new HTTPError(400);
    }
    return server;
}

/**
 * Find a server objects of given type
 *
 * @param  {String} type
 *
 * @return {Promise<Server>}
 */
async function findServersByType(type) {
    let db = await Database.open();
    let criteria = { type, deleted: false };
    return Server.find(db, 'global', criteria, '*');
}

/**
 * Find servers that provide OAuth authentication
 *
 * @param  {String} area
 *
 * @return {Promise<Array<Server>>}
 */
async function findOAuthServers(area) {
    let db = await Database.open();
    let criteria = {
        deleted: false,
        disabled: false,
    };
    let servers = await Server.find(db, 'global', criteria, '*');
    let availableServers = _.filter(servers, (server) => {
        return canProvideAccess(server, area);
    });
    return availableServers;
}

/**
 * Create or update a server object
 *
 * @param  {Server} server
 *
 * @return {Promise<Server>}
 */
async function saveServer(server) {
    let db = await Database.open();
    return Server.saveOne(db, 'global', server);
}

/**
 * Find a user object
 *
 * @param  {Number} userID
 *
 * @return {Promise<User>}
 */
async function findUser(userID) {
    let db = await Database.open();
    let criteria = { id: userID, deleted: false };
    let user = await User.findOne(db, 'global', criteria, '*');
    if (!user) {
        throw new HTTPError(401);
    }
    return user;
}

/**
 * Find a user object by username
 *
 * @param  {String} username
 *
 * @return {Promise<User>}
 */
async function findUserByName(username) {
    let db = await Database.open();
    let criteria = { username, deleted: false };
    let user = await User.findOne(db, 'global', criteria, '*');
    if (!user) {
        // create the admin user if it's not there
        let name = _.capitalize(username);
        if (name === 'Root') {
            name = 'Administrator';
        }
        let userNew = {
            username,
            type: 'admin',
            details: { name },
            settings: DefaultUserSettings,
        };
        user = await User.insertOne(db, 'global', userNew);
    }
    return user;

}

/**
 * Remove devices connected with specified session handle(s)
 *
 * @param  {String|Array<String>} handles
 *
 * @return {Array<Device>}
 */
async function removeDevices(handles) {
    let db = await Database.open();
    let criteria = {
        session_handle: handles,
        deleted: false,
    };
    return Device.updateMatching(db, 'global', criteria, { deleted: true });
}

/**
 * Find or create a user that's linked with the external account
 *
 * @param  {Server} server
 * @param  {Object} account
 *
 * @return {Promise<User>}
 */
async function findMatchingUser(server, account) {
    let db = await Database.open();
    // look for a user with the external id
    let profile = account.profile;
    let criteria = {
        external_object: ExternalDataUtils.createLink(server, {
            user: { id: getProfileID(profile) },
        }),
        deleted: false,
    };
    let user = await User.findOne(db, 'global', criteria, '*');
    if (!user) {
        let emails = _.filter(_.map(profile.emails, 'value'));
        for (let email of emails) {
            let criteria = {
                email: email,
                deleted: false,
                order: 'id'
            };
            user = await User.findOne(db, 'global', criteria, '*');
            if (user) {
                break;
            }
        }
    }
    if (!user) {
        // map Gitlab root user to root
        if (server.type === 'gitlab' && profile.username === 'root') {
            let criteria = {
                username: profile.username,
                deleted: false,
            };
            user = await User.findOne(db, 'global', criteria, '*');
        }
    }
    if (!user) {
        // create the user if server allows it
        if (!acceptNewUser(server, profile)) {
            throw new HTTPError(403, {
                reason: 'existing-users-only',
            });
        }
        let image = await retrieveProfileImage(profile);
        let userNew = copyUserProperties(null, server, image, profile);
        if (userNew.disabled) {
            // don't create disabled user
            throw new HTTPError(403, {
                reason: 'existing-users-only',
            });
        }
        user = await User.insertUnique(db, 'global', userAfter);
    } else {
        // update profile image (without waiting)
        updateProfileImage(db, user, server, profile);
    }
    return user;
}

/**
 * Find matching entry in htpasswd file (throw otherwise)
 *
 * @param  {String} username
 * @param  {String} password
 *
 * @return {Promise}
 */
async function findHtpasswdRecord(username, password) {
    try {
        let htpasswdPath = process.env.HTPASSWD_PATH;
        let data = await FS.readFileAsync(htpasswdPath, 'utf-8');
        let successful = await HtpasswdAuth.authenticate(username, password, data);
        if (successful !== true) {
            await Bluebird.delay(Math.random() * 1000);
            throw new HTTPError(401);
        }
    } catch (err) {
        if (err.code === 'ENOENT') {
            // password file isn't there
            throw new HTTPError(403, {
                reason: 'missing-password-file'
            });
        } else {
            throw err;
        }
    }
}

/**
 * Return a Passport plugin
 *
 * @param  {Server} server
 *
 * @return {Function}
 */
function findPassportPlugin(server) {
    let plugins = {
        dropbox: 'passport-dropbox-oauth2',
        facebook: 'passport-facebook',
        github: 'passport-github',
        gitlab: 'passport-gitlab2',
        google: 'passport-google-oauth2',
        windows: 'passport-windowslive',
    };
    let module = require(plugins[server.type]);
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
                    default:
                        if (process.env.ADMIN_GUEST_MODE) {
                            return true;
                        }
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
 * @param  {Object} profile
 *
 * @return {Boolean}
 */
function acceptNewUser(server, profile) {
    let type = _.get(server, 'settings.user.type');
    let mapping = _.get(server, 'settings.user.mapping');
    if (!type && !_.some(mapping)) {
        return false;
    }
    let whitelist = _.trim(_.get(server, 'settings.user.whitelist'));
    if (whitelist) {
        let emails = _.map(profile.emails, 'value');
        return _.some(emails, (email) => {
            return Whitelist.match(email, whitelist);
        });
    } else {
        return true;
    }
}

/**
 * Get user id from OAuth profile
 *
 * @param  {Object} profile
 *
 * @return {Number|String}
 */
function getProfileID(profile) {
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
    let json = profile._json;
    if (server.type === 'gitlab') {
        // use GitlabAdapter's importer
        return GitlabUserImporter.copyUserProperties(user, server, image, json);
    } else {
        let email = _.first(_.map(profile.emails, 'value'));
        let username = profile.username || proposeUsername(profile);
        let userType = _.get(server, 'settings.user.type');
        let userAfter;
        if (user) {
            userAfter = _.cloneDeep(user);
        } else {
            userAfter = {
                role_ids: _.get(server, 'settings.user.role_ids', []),
                settings: DefaultUserSettings,
            };
        }

        ExternalDataUtils.addLink(userAfter, server, {
            user: {
                id: getProfileID(profile),
                username: profile.username,
            }
        });
        ExternalDataUtils.importProperty(userAfter, server, 'type', {
            value: userType,
            overwrite: 'match-previous:type',
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
    let email = _.get(profile.emails, '0.value');
    if (email) {
        return _.replace(email, /@.*/, '');
    }
    let lname = toSimpleLatin(profile.name.familyName);
    let fname = toSimpleLatin(profile.name.givenName);
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
async function retrieveProfileImage(profile) {
    let url = profile.avatarURL;
    if (!url) {
        url = _.get(profile.photos, '0.value') || _.get(profile.avatarURL);
    }
    if (!url) {
        url = profile.avatarUrl;
    }
    if (!url) {
        return null;
    }
    let options = {
        json: true,
        url: 'http://media_server/srv/internal/import',
        body: { url },
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
 * Update a user's profile image
 *
 * @param  {Database} db
 * @param  {User} user
 * @param  {Server} server
 * @param  {Object} profile
 *
 * @return {Promise}
 */
async function updateProfileImage(db, user, server, profile) {
    try {
        let image = await retrieveProfileImage(profile);
        let userAfter = copyUserProperties(user, server, image, profile);
        if(!_.isEqual(userAfter, user)) {
            await User.updateOne(db, 'global', userAfter);
        }
    } catch (err) {
        console.error(err);
    }
}

/**
 * Create a random token with given number of bytes
 *
 * @param  {Number} bytes
 *
 * @return {Promise<String>}
 */
async function createRandomToken(bytes) {
    let buffer = await Crypto.randomBytesAsync(bytes);
    return buffer.toString('hex');
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
        case 'facebook':
            settings.profileFields = [ 'id', 'emails', 'link', 'displayName', 'name', 'picture', 'verified' ];
            break;
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
            options.scope = [ 'email', 'public_profile' ];
            break;
        case 'gitlab':
            if (params.activation) {
                options.scope = [ 'api' ];
            }
            break;
        case 'github':
            options.scope = [ 'user:email', 'read:user' ];
            break;
        case 'google':
            options.scope = [ 'profile', 'email' ];
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
    let values = {};
    let pairs = _.split(queryString, '&');
    for (let pair of pairs) {
        let parts = _.split(pair, '=');
        let name = decodeURIComponent(parts[0]);
        let value = decodeURIComponent(parts[1] || '');
        value = _.replace(value, /\+/g, ' ');
        values[name] = value;
    }
    return values;
}

/**
 * Parse a signed request, checking whether the given signature was
 * signed using the app secret
 *
 * @param  {String} signedRequest
 * @param  {String} appSecret
 *
 * @return {Object}
 */
function parseDeauthorizationRequest(signedRequest, appSecret){
    let [ signatureReceived, payloadBase64 ] = signedRequest.split('.');
    let payloadText = new Buffer(payloadBase64, 'base64').toString();
    let payload = JSON.parse(payloadText);
    let algorithm = _.toLower(payload.algorithm);
    if (!_.startsWith(algorithm, 'hmac-')) {
        throw new HTTPError(400, `Unsupported hashing scheme: ${algorithm}`);
    }
    let hmac = Crypto.createHmac(algorithm.substr(5), appSecret);
    let signatureCalculated = hmac.update(payloadBase64).digest('base64');
    signatureCalculated = _.replace(signatureCalculated, /\//g, '_');
    signatureCalculated = _.replace(signatureCalculated, /\+/g, '-');
    signatureCalculated = _.trimEnd(signatureCalculated, '=');
    if (signatureReceived !== signatureCalculated) {
        throw new HTTPError(403, `Signature does not match`);
    }
    return payload;
}

/**
 * Remove old unused session objects
 *
 * @return {Promise<Array>}
 */
async function deleteExpiredSessions() {
    let db = await Database.open();
    let criteria = {
        authorization_id: null,
        expired: true,
    };
    let sessions = await Session.updateMatching(db, 'global', criteria, { deleted: true });
    let handles = _.map(sessions, 'handle');
    await removeDevices(handles)
    return sessions;
}

if (process.argv[1] === __filename) {
    start();
    Shutdown.on(stop);
}

export {
    start,
    stop,
};
