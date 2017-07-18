var _ = require('lodash');
var Promise = require('bluebird');
var Express = require('express');
var Passport = require('passport')
var Crypto = Promise.promisifyAll(require('crypto'));
var HttpError = require('errors/http-error');

var Database = require('database');
var Authentication = require('accessors/authentication');
var Authorization = require('accessors/authorization');
var Configuration = require('accessors/configuration');

var Strategies = {
    facebook: require('passport-facebook'),
    github: require('passport-github'),
    gitlab: require('passport-gitlab2'),
    google: require('passport-google-oauth2'),
    dropbox: require('passport-dropbox-oauth2'),
};
var providerSpecificOptions = {
    facebook: {
        profileFields: ['id', 'email', 'gender', 'link', 'locale', 'name', 'timezone', 'verified'],
    },
};

var server;

function start() {
    return Database.open(true).then((db) => {
        return db.need('global').then(() => {
            var app = Express();
            app.set('json spaces', 2);
            app.use(Passport.initialize());

            app.get('/auth', handleAuthenticationStart);
            app.get('/auth/:token', handleAuthenticationRetrieval);
            app.get('/auth/:token/:provider', handleOAuthRequest);
            app.get('/auth/:token/:provider/callback', handleOAuthRequestCallback);

            var criteria = {
                name: 'oauth.provider',
                deleted: false,
            };
            return Configuration.find(db, 'global', criteria, 'details').each((provider) => {
                var name = _.lowerCase(provider.details.name);
                var Strategy = Strategies[name];
                var params = _.extend(
                    { passReqToCallback: true },
                    provider.details.credentials,
                    providerSpecificOptions[name]
                );
                Passport.use(new Strategy(params, processOAuthProfile));
            }).then(() => {
                server = app.listen(80);
            });
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
    Database.open().then((db) => {
        return Crypto.randomBytesAsync(24).then((buffer) => {
            var authentication = {
                token: buffer.toString('hex')
            };
            return Authentication.saveOne(db, 'global', authentication);
        });
    }).then((authentication) => {
        sendResponse(res, _.pick(authentication, 'token'));
    }).catch((err) => {
        sendError(res, err);
    });
}

/**
 * Return an authentication object
 *
 * @param  {Request} req
 * @param  {Response} res
 */
function handleAuthenticationRetrieval(req, res) {
    var token = req.params.token;
    Database.open().then((db) => {
        return Authentication.findOne(db, 'global', { token }, 'token, user_id');
    }).then((authentication) => {
        sendResponse(res, _.pick(authentication, 'token', 'user_id'));
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
    var token = req.params.token;
    Database.open().then((db) => {
        return Authentication.findOne(db, 'global', { token }, 'id');
    }).then((authentication) => {
        if (!authentication) {
            throw new HttpError(400);
        }
        var options = {
            scope: [ 'email' ],
            session: false,
            callbackURL: `${protocol}://${host}/auth/${token}/${provider}/callback`,
        };
        var authenticate = Passport.authenticate(provider, options);
        authenticate(req, res, done);
    }).catch((err) => {
        sendError(res, err);
    });
}

/**
 * Handle redirection from OAuth provider
 *
 * @param  {Request}   req
 * @param  {Response}  res
 */
function handleOAuthRequestCallback(req, res) {
    var provider = req.params.provider;
    var options = {};
    var authenticate = Passport.authenticate(provider, options);
    authenticate(req, res, () => {
        var html;
        if (req.user) {
            html = `<script> close() </script>`;
        } else {
            html = `<h1>Failure</h1>`
        }
        res.send(html);
    });
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
    console.log('processOAuthProfile');
    var token = req.params.token;
    Database.open().then((db) => {
        return Authentication.findOne(db, 'global', { token }, 'id');
    }).then((authentication) => {
        if (!authentication) {
            throw new HttpError(400);
        }
        var emails = _.map(profile.emails, 'value');
        return User.findOne(db, 'global', { emails }, 'id').then((user) => {
            // TODO: auto-creation of guest accounts
            if (!user) {
                throw new HttpError(403);
            }
            return user;
        }).then((user) => {
            var authorization = {
                token: token,
                user_id: user.id,
                expiration_date: Moment().startOf('day').add(30, 'days').toISOString(),
            };
            return Authorization.insertOne(db, 'global', authorization);
        }).then((authorization) => {
            authentication.type = profile.provider,
            authentication.details = {
                profile: profile._json,
                access_token: accessToken,
                refresh_token: refreshToken,
            };
            authentication.user_id = authorization.id;
            return Authentication.updateOne(db, 'global', authentication);
        });
    }).then((authentication) => {
        cb(null, authentication);
    }).catch((err) => {
        cb(err);
    });
}

exports.start = start;
exports.stop = stop;

if (process.argv[1] === __filename) {
    start();
}
