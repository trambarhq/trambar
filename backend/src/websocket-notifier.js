var _ = require('lodash');
var Promise = require('bluebird');
var Http = require('http');
var SockJS = require('sockjs');
var Moment = require('moment');
var Database = require('database');
var HttpError = require('errors/http-error');

// accessors
var Authorization = require('accessors/authorization');
var User = require('accessors/user');

var server;
var sockets = [];

function start() {
    var tables = [
        'user',
        'preferences',
        'project',

        'bookmark',
        'commit',
        'folder',
        'issue',
        'listing',
        'reaction',
        'repo',
        'robot',
        'role',
        'statistics',
        'story',
    ];
    return Database.open(true).then((db) => {
        return db.listen(tables, 'change', handleDatabaseChanges, 100).then(() => {
            var sockJS = SockJS.createServer({
                sockjs_url: 'http://cdn.jsdelivr.net/sockjs/1.1.2/sockjs.min.js'
            });
            sockJS.on('connection', (socket) => {
                socket.on('data', (message) => {
                    var object = parseJSON(message);
                    if (object && object.authorization) {
                        var token = object.authorization.token;
                        var locale = object.authorization.locale;
                        return checkAuthorization(db, token).then((auth) => {
                            return fetchCredentials(db, auth.user_id).then((credentials) => {
                                socket.credentials = credentials;
                                socket.locale = locale;
                                sockets.push(socket);
                            });
                        });
                    }
                });
                socket.on('close', () => {
                    var index = sockets.indexOf(socket);
                    if (index !== -1) {
                        sockets.splice(index, 1);
                    }
                });

                // close the socket after five second if we fail to obtain user
                // credentials for it
                setTimeout(() => {
                    if (!socket.credentials) {
                        socket.close();
                    }
                }, 5000)
            });

            server = Http.createServer();
            sockJS.installHandlers(server, { prefix:'/socket' });
            server.listen(80, '0.0.0.0');
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

function handleDatabaseChanges(events) {
    _.each(sockets, (socket) => {
        var changes = {};
        _.each(events, (event) => {
            if (canUserSeeEvent(event, socket.credentials)) {
                var table = `${event.schema}.${event.table}`;
                var idList = changes[table];
                if (!idList) {
                    idList = changes[table] = [];
                }
                idList.push(event.id);
            }
        });
        if (!_.isEmpty(changes)) {
            var payload = { changes: changes };
            socket.write(JSON.stringify(payload));
        }
    });
}

function canUserSeeEvent(event, credentials) {
    if (event.schema === 'global') {
    }
    return true;
}

function parseJSON(text) {
    try {
        return JSON.parse(text);
    } catch (err) {
    }
}

exports.start = start;
exports.stop = stop;

if (process.argv[1] === __filename) {
    start();
}
