import _ from 'lodash';
import Bluebird from 'bluebird';
import Express from 'express';
import CORS from 'cors';
import BodyParser from 'body-parser';
import Passport from 'passport';
import Crypto from 'crypto'; Bluebird.promisifyAll(Crypto);
import FS from 'fs'; Bluebird.promisifyAll(FS);
import Moment from 'moment';
import CrossFetch from 'cross-fetch';
import HtpasswdJS from 'htpasswd-js';
import { HTTPError } from './lib/errors.mjs';
import { Database } from './lib/database.mjs';
import { TaskLog } from './lib/task-log.mjs';
import { createLink, addLink, removeLink, countLinks, importProperty, importResource } from './lib/external-data-utils.mjs';
import { onShutdown, shutdownHTTPServer } from './lib/shutdown.mjs';

import * as GitlabUserImporter from './lib/gitlab-adapter/user-importer.mjs';
import * as MediaImporter from './lib/media-server/media-importer.mjs';

// accessors
import { Device } from './lib/accessors/device.mjs';
import { Project } from './lib/accessors/project.mjs';
import { Server } from './lib/accessors/server.mjs';
import { Session } from './lib/accessors/session.mjs';
import { System } from './lib/accessors/system.mjs';
import { User } from './lib/accessors/user.mjs';

const SESSION_LIFETIME_AUTHENTICATION = 120; // minutes
const SESSION_LIFETIME_DEVICE_ACTIVATION = 60;
const SESSION_LIFETIME_ADMIN = 60 * 24 * 1;
const SESSION_LIFETIME_CLIENT = 60 * 24 * 30;

let server;
let cleanUpInterval;

async function start() {
  const app = Express();
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
  app.use(handleError);
  server = app.listen(80);

  cleanUpInterval = setInterval(deleteExpiredSessions, 60 * 60 * 1000);
}

async function stop() {
  clearInterval(cleanUpInterval);
  await shutdownHTTPServer(server);
};

/**
 * Create a new session object
 *
 * @param  {Request} req
 * @param  {Response} res
 * @param  {Function} next
 */
async function handleSessionStart(req, res, next) {
  const taskLog = TaskLog.start('session-start');
  try {
    const area = (req.body.area || '').toLowerCase();
    const originalHandle = (req.body.handle || '').toLowerCase();
    if (!(area === 'client' || area === 'admin')) {
      throw new HTTPError(400);
    }
    let result;
    if (!originalHandle) {
      const handle = await createRandomToken(8);
      // create session object
      const etime = getFutureTime(SESSION_LIFETIME_AUTHENTICATION);
      const session = await saveSession({ area, handle, etime });
      const system = await findSystem();
      const servers = await findOAuthServers(area);
      result = {
        session: { handle: session.handle,  etime: session.etime },
        system: { details: system.details },
        servers: servers.map((server) => {
          return { id: server.id, type: server.type, details: server.details }
        })
      };
      taskLog.set('type', 'browser');
    } else {
      // create session for mobile device
      const originalSession = await findSession(originalHandle);
      if (originalSession.area !== area) {
        throw new HTTPError(403);
      }
      const userID = originalSession.user_id;
      const handle = await createRandomToken(8);
      const token = await createRandomToken(16);
      const etime = getFutureTime(SESSION_LIFETIME_DEVICE_ACTIVATION);
      const session = await saveSession({ area, handle, token, etime, user_id: userID });
      result = {
        session: _.pick(session, 'handle', 'etime')
      };
      taskLog.set('type', 'mobile');
    }
    taskLog.set('area', area);
    res.json(result);
    await taskLog.finish();
  } catch (err) {
    next(err);
    await taskLog.abort(err);
  }
}

/**
 * Handle authentication by password stored in a htpasswd file
 *
 * @param  {Request} req
 * @param  {Response} res
 * @param  {Function} next
 */
async function handleHTPasswdRequest(req, res, next) {
  const taskLog = TaskLog.start('password-check');
  try {
    const handle = _.toLower(req.body.handle);
    const username = _.trim(_.toLower(req.body.username));
    const password = _.trim(req.body.password);
    await findHtpasswdRecord(username, password);

    const session = await findSession(handle);
    const user = await findUserByName(username);
    const sessionAfter = await authorizeUser(session, user, {}, true);
    const result = {
      session: _.pick(sessionAfter, 'token', 'user_id', 'etime')
    };
    res.json(result);
    taskLog.set('user', user.username);
    await taskLog.finish();
  } catch (err) {
    next(err);
    await taskLog.abort(err);
  }
}

/**
 * Return an authentication object, used by the client to determine if login
 * was successful
 *
 * @param  {Request} req
 * @param  {Response} res
 * @param  {Function} next
 */
async function handleSessionRetrieval(req, res, next) {
  const taskLog = TaskLog.start('session-retrieve');
  try {
    const handle = (req.query.handle || '').toLowerCase();
    const session = await findSession(handle);
    let sessionAfter;
    if (session.activated) {
      throw new HTTPError(410);
    }
    let result;
    if (session.token) {
      session.activated = true;
      session.etime = getFutureTime(SESSION_LIFETIME_CLIENT);
      sessionAfter = await saveSession(session);
      result = {
        session: {
          token: sessionAfter.token,
          user_id: sessionAfter.user_id,
          etime: sessionAfter.etime,
        }
      };
    } else {
      const error = session.details.error;
      if (error) {
        throw new HTTPError(error);
      }
      result = null;
    }
    res.json(result);
    if (sessionAfter && sessionAfter.token) {
      const user = await findUser(session.user_id);
      taskLog.set('user', user.username);
      taskLog.set('expiration', sessionAfter.etime);
    }
    await taskLog.finish();
  } catch (err) {
    next(err);
    await taskLog.abort(err);
  }
}

/**
 * Mark session object as deleted
 *
 * @param  {Request} req
 * @param  {Response} res
 * @param  {Function} next
 */
async function handleSessionTermination(req, res, next) {
  const taskLog = TaskLog.start('session-terminate');
  try {
    const handle = _.toLower(req.body.handle);
    const session = await removeSession(handle);
    const devices = await removeDevices(session.handle);
    res.json({});
    await taskLog.finish();
  } catch (err) {
    next(err);
    await taskLog.abort(err);
  }
}

/**
 * Redirect to OAuth provider
 *
 * @param  {Request}   req
 * @param  {Response}  res
 * @param  {Function} next
 */
async function handleOAuthRequest(req, res, next) {
  const taskLog = TaskLog.start('oauth-authenticate');
  try {
    const query = extractQueryVariables(req.query);
    const serverID = parseInt(query.sid);
    const handle = _.toLower(query.handle);
    const session = await findSession(handle);
    try {
      const system = await findSystem();
      const server = await findServer(serverID);
      const params = { sid: serverID, handle };
      const account = await authenticateThruPassport(req, res, system, server, params);
      const user = await findMatchingUser(server, account);
      // save the info from provider for potential future use
      const details = {
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
    const html = `<script> close() </script>`;
    res.type('html').send(html);
  } catch (err) {
    next(err);
  }
}

/**
 * Acquire access token from an OAuth provider
 *
 * @param  {Request}   req
 * @param  {Response}  res
 * @param  {Function}  next
 */
async function handleOAuthTestRequest(req, res, next) {
  const query = extractQueryVariables(req.query);
  if (!query.test) {
    return next();
  }
  const taskLog = TaskLog.start('oauth-test');
  try {
    const serverID = parseInt(query.sid);
    const system = await findSystem();
    const server = await findServer(serverID);
    const params = { test: 1, sid: serverID, handle: 'TEST' };
    const account = await authenticateThruPassport(req, res, system, server, params);
    taskLog.set('name', account.profile.displayName);
    taskLog.set('username', account.profile.username);
    taskLog.set('id', account.profile.id);
    taskLog.set('email', _.map(account.profile.emails, 'value'));
    taskLog.set('server', server.name);
    const html = `<h1>OK</h1>`;
    res.type('html').send(html);
    await taskLog.finish();
  } catch (err) {
    next(err);
    await taskLog.abort(err);
  }
}

/**
 * Acquire access token from an OAuth provider
 *
 * @param  {Request}   req
 * @param  {Response}  res
 * @param  {Function}  next
 */
async function handleOAuthActivationRequest(req, res, next) {
  const query = extractQueryVariables(req.query);
  if (!query.activation) {
    return next();
  }
  const taskLog = TaskLog.start('oauth-access-acquire');
  try {
    const serverID = parseInt(query.sid);
    const handle = _.toLower(query.handle);
    const session = await findSession(handle);
    // make sure we have admin access
    if (session.area !== 'admin') {
      throw new HTTPError(403);
    }
    const system = await findSystem();
    const server = await findServer(serverID);
    const params = { activation: 1, sid: serverID, handle };
    const account = await authenticateThruPassport(req, res, system, server, params);
    const profile = account.profile._json;
    let isAdmin = false;
    if (server.type === 'gitlab') {
      isAdmin = profile.is_admin;
    }
    if (!isAdmin) {
      const username = account.profile.username;
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
    const html = `<h1>OK</h1>`;
    res.type('html').send(html);
    taskLog.set('server', server.name);
    await taskLog.finish();
  } catch (err) {
    next(err);
    await taskLog.abort(err);
  }
}

/**
 * Remove relation to external server upon deauthorization request, possibly
 * disabling the account as well
 *
 * @param  {Request}   req
 * @param  {Response}  res
 * @param  {Function}  next
 */
async function handleOAuthDeauthorizationRequest(req, res, next) {
  const taskLog = TaskLog.start('oauth-access-deauthorize');
  try {
    const provider = req.params.provider;
    const signedRequest = req.body.signed_request;
    const servers = await findServersByType(req.params.provider);
    let matchingServer, payload, lastError;
    for (let server in servers) {
      // see which server has the right secret
      // having multiple servers isn't really a normal use case
      const secret = _.get(server, 'settings.oauth.client_secret');
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
    let user;
    if (payload) {
      user = await detachExternalAccount(matchingServer, payload.user_id);
    } else {
      if (lastError) {
        throw lastError;
      }
    }
    res.json({ status: 'ok' });
    if (user) {
      taskLog.set('user', user.username);
    }
    await taskLog.finish();
  } catch (err) {
    next(next);
    await taskLog.abort(err);
  }
}

/**
 * Handle requests for legal documents
 *
 * @param  {Request}   req
 * @param  {Response}  res
 * @param  {Function}  next
 */
async function handleLegalDocumentRequest(req, res, next) {
  try {
    const db = await Database.open();
    const system = await System.findOne(db, 'global', { deleted: false }, 'details');
    const name = req.params.name;
    const path = `${__dirname}/templates/${name}.ejs`;
    const company = _.get(system, 'details.company_name', 'Our company');
    const text = await FS.readFileAsync(path, 'utf-8');
    const fn = _.template(text);
    const html = fn({ company });
    res.type('html').send(html);
  } catch (err) {
    next(err);
  }
}

/**
 * Handle error
 *
 * @param  {Error}     err
 * @param  {Request}   req
 * @param  {Response}  res
 * @param  {Function}  next
 */
function handleError(err, req, res, next) {
  if (!err.statusCode) {
    // not an expected error
    let message = err.message;
    if (process.env.NODE_ENV === 'production') {
      message = 'The application has encountered an unexpected fault';
    }
    err = new HTTPError(500, { message });
  }
  if (!res.headersSent) {
    res.status(err.statusCode);

    if (/\btext\/html\b/.test(req.headers.accept)) {
      const html = `
        <h1>${err.statusCode} ${err.name}</h1>
        <p>${err.message}</p>
      `;
      res.type('html').send(html);
    } else {
      const json = _.omit(err, 'statusCode');
      res.json(json);
    }
  } else {
    console.log(`Error occurred after HTTP headers have already been sent`);
    console.error(err);
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
  const token = await createRandomToken(16);
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
  const provider = req.params.provider;
  // query variables are send as the state parameter
  const query = _.reduce(params, (query, value, name) => {
    if (query) {
      query += '&';
    }
    query += name + '=' + value;
    return query;
  }, '');
  const address = _.trimEnd(_.get(system, 'settings.address'), ' /');
  if (!address) {
    throw new HTTPError(400, { message: 'Missing site address' });
  }
  const settings = addServerSpecificSettings(server, {
    clientID: server.settings.oauth.client_id,
    clientSecret: server.settings.oauth.client_secret,
    baseURL: server.settings.oauth.base_url,
    callbackURL: `${address}/srv/session/${provider}/callback/`,
  });
  const options = addServerSpecificOptions(server, params, {
    session: false,
    state: query,
  });

  const Strategy = await findPassportPlugin(server);
  const account = new Promise((resolve, reject) => {
    // create strategy object, resolving promise when we have the profile
    const strategy = new Strategy(settings, (accessToken, refreshToken, profile, done) => {
      // just resolve the promise--no need to call done() since we're not
      // using Passport as an Express middleware
      resolve({ accessToken, refreshToken, profile });
    });

    // trigger Passport middleware manually
    Passport.use(strategy);
    const auth = Passport.authenticate(strategy.name, options, (err, user, info) => {
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
              const oauthResult = JSON.parse(err.oauthError.data);
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
  return account;
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
  const db = await Database.open();
  const criteria = {
    external_object: createLink(server, {
      user: { id: externalUserID },
    }),
  };
  const user = await User.findOne(db, 'global', criteria, '*');
  if (!user) {
    return null;
  }
  removeLink(user, server);
  const userAfter = await User.saveOne(db, 'global', user);
  // delete active sessions when user is not connected to any account
  if (countLinks(userAfter) === 0) {
    const sessionCriteria = {
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
  const db = await Database.open();
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
  const db = await Database.open();
  const session = await Session.findOne(db, 'global', { handle }, 'id');
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
  const db = await Database.open();
  const criteria = {
    handle,
    expired: false,
    deleted: false,
  };
  const session = await Session.findOne(db, 'global', criteria, '*');
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
  const db = await Database.open();
  const criteria = { deleted: false };
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
  const db = await Database.open();
  const criteria = { id: serverID, deleted: false };
  const server = await Server.findOne(db, 'global', criteria, '*');
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
  const db = await Database.open();
  const criteria = { type, deleted: false };
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
  const db = await Database.open();
  const criteria = {
    deleted: false,
    disabled: false,
  };
  const servers = await Server.find(db, 'global', criteria, '*');
  const availableServers = _.filter(servers, (server) => {
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
  const db = await Database.open();
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
  const db = await Database.open();
  const criteria = { id: userID, deleted: false };
  const user = await User.findOne(db, 'global', criteria, '*');
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
  const db = await Database.open();
  const criteria = { username, deleted: false };
  let user = await User.findOne(db, 'global', criteria, '*');
  if (!user) {
    // create the admin user if it's not there
    let name = _.capitalize(username);
    if (name === 'Root') {
      name = 'Administrator';
    }
    const userNew = {
      username,
      type: 'admin',
      details: { name },
      settings: User.getDefaultSettings(),
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
  const db = await Database.open();
  const criteria = {
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
  const db = await Database.open();
  // look for a user with the external id
  const profile = account.profile;
  const criteria = {
    external_object: createLink(server, {
      user: { id: getProfileID(profile) },
    }),
    deleted: false,
  };
  let user = await User.findOne(db, 'global', criteria, '*');
  if (!user) {
    const emails = _.filter(_.map(profile.emails, 'value'));
    for (let email of emails) {
      const criteria = {
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
      const criteria = {
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
    let image;
    try {
      image = await retrieveProfileImage(profile);
    } catch (err){
    }
    const userNew = copyUserProperties(null, server, image, profile);
    if (userNew.disabled) {
      // don't create disabled user
      throw new HTTPError(403, {
        reason: 'existing-users-only',
      });
    }
    user = await User.insertUnique(db, 'global', userNew);
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
    const htpasswdPath = process.env.HTPASSWD_PATH;
    const successful = await HtpasswdJS.authenticate({
      username,
      password,
      file: htpasswdPath,
    });
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
 * @return {Promise<Function>}
 */
async function findPassportPlugin(server) {
  const plugins = {
    dropbox: 'passport-dropbox-oauth2',
    facebook: 'passport-facebook',
    github: 'passport-github',
    gitlab: 'passport-gitlab2',
    google: 'passport-google-oauth2',
    windows: 'passport-windowslive',
  };
  const module = await import(plugins[server.type]);
  if (module.default) {
    return module.default;
  } else if (module.Strategy) {
    return module.Strategy;
  }
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
  const type = _.get(server, 'settings.user.type');
  const mapping = _.get(server, 'settings.user.mapping');
  if (!type && !_.some(mapping)) {
    return false;
  }
  const whitelist = _.trim(_.get(server, 'settings.user.whitelist'));
  if (whitelist) {
    const emails = _.map(profile.emails, 'value');
    return _.some(emails, (email) => {
      return matchWhiteList(email, whitelist);
    });
  } else {
    return true;
  }
}

/**
 * Return true if a email address matches an item on a whitelist
 *
 * @param  {String} email
 * @param  {String} whitelist
 *
 * @return {Boolean}
 */
function matchWhiteList(email, whitelist) {
  let items = _.split(_.trim(whitelist), /\s*\n\s*/);
  let emailParts = _.split(email, '@');
  let name = emailParts[0];
  let domain = emailParts[1];
  return _.some(items, (item) => {
    if (/^#/.test(item)) {
      return;
    }
    let permitted = _.split(item, '@');
    if (permitted.length === 1) {
      if (domain === permitted[0]) {
        return true;
      }
    } else if (permitted.length === 2) {
      if (domain === permitted[1] && name === permitted[0]) {
        return true;
      }
    }
  });
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
  const json = profile._json;
  if (server.type === 'gitlab') {
    // use GitlabAdapter's importer
    return GitlabUserImporter.copyUserProperties(user, server, image, json);
  } else {
    const email = _.first(_.map(profile.emails, 'value'));
    const username = profile.username || proposeUsername(profile);
    const userType = _.get(server, 'settings.user.type');
    let userAfter;
    if (user) {
      userAfter = _.cloneDeep(user);
    } else {
      userAfter = {
        role_ids: _.get(server, 'settings.user.role_ids', []),
        settings: User.getDefaultSettings(),
      };
    }

    addLink(userAfter, server, {
      user: {
        id: getProfileID(profile),
        username: profile.username,
      }
    });
    importProperty(userAfter, server, 'type', {
      value: userType,
      overwrite: 'match-previous:type',
    });
    importProperty(userAfter, server, 'username', {
      value: username,
      overwrite: 'match-previous:username',
    });
    importProperty(userAfter, server, 'details.name', {
      value: profile.displayName,
      overwrite: 'match-previous:name',
    });
    importProperty(userAfter, server, 'details.email', {
      value: email,
      overwrite: 'match-previous:email',
    });
    importProperty(userAfter, server, 'details.gender', {
      value: json.gender,
      overwrite: 'match-previous:gender',
    });
    importResource(userAfter, server, {
      type: 'image',
      value: image,
      replace: 'match-previous'
    });
    if (server.type === 'github') {
      importProperty(userAfter, server, 'details.github_url', {
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
  const email = _.get(profile.emails, '0.value');
  if (email) {
    return _.replace(email, /@.*/, '');
  }
  const lname = toSimpleLatin(profile.name.familyName);
  const fname = toSimpleLatin(profile.name.givenName);
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
  let avatarURL = profile.avatarURL || profile.avatarUrl;
  if (!avatarURL) {
    avatarURL = _.get(profile.photos, '0.value');
  }
  if (avatarURL) {
    return MediaImporter.importFile(avatarURL);
  }
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
    const image = await retrieveProfileImage(profile);
    const userChanges = copyUserProperties(user, server, image, profile);
    if(userChanges) {
      await User.updateOne(db, 'global', userChanges);
    }
  } catch (err) {
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
  const buffer = await Crypto.randomBytesAsync(bytes);
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
  const values = {};
  const pairs = _.split(queryString, '&');
  for (let pair of pairs) {
    const parts = _.split(pair, '=');
    const name = decodeURIComponent(parts[0]);
    const value = decodeURIComponent(parts[1] || '').replace(/\+/g, ' ');
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
  const [ signatureReceived, payloadBase64 ] = signedRequest.split('.');
  const payloadText = new Buffer(payloadBase64, 'base64').toString();
  const payload = JSON.parse(payloadText);
  const algorithm = _.toLower(payload.algorithm);
  if (!_.startsWith(algorithm, 'hmac-')) {
    throw new HTTPError(400, `Unsupported hashing scheme: ${algorithm}`);
  }
  const hmac = Crypto.createHmac(algorithm.substr(5), appSecret);
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
  const db = await Database.open();
  const criteria = {
    authorization_id: null,
    expired: true,
  };
  const sessions = await Session.updateMatching(db, 'global', criteria, { deleted: true });
  const handles = _.map(sessions, 'handle');
  await removeDevices(handles)
  return sessions;
}

if ('file://' + process.argv[1] === import.meta.url) {
  start();
  onShutdown(stop);
}

export {
  start,
  stop,
};
