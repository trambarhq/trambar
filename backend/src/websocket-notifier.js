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
var Reaction = require('accessors/reaction');
var Story = require('accessors/story');

var server;
var sockets = [];

function start() {
    return Database.open(true).then((db) => {
        var tables = [
            'picture',
            'project',
            'server',
            'system',
            'user',

            'bookmark',
            'listing',
            'reaction',
            'repo',
            'robot',
            'role',
            'statistics',
            'story',
        ];
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
                        return checkAuthorization(db, token).then((userId) => {
                            return fetchCredentials(db, userId).then((credentials) => {
                                socket.credentials = credentials;
                                socket.locale = locale;
                                sockets.push(socket);
                            });
                        });
                    }
                });
                socket.on('close', () => {
                    _.pull(sockets, socket);
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
    return Authorization.check(db, token, null).then((userId) => {
        if (!userId) {
            throw new HttpError(401);
        }
        return userId;
    });
}

function fetchCredentials(db, userId) {
    var credentials = {};
    return User.findOne(db, 'global', { id: userId, deleted: false }, '*').then((user) => {
        if (!user) {
            throw new HttpError(403);
        }
        credentials.user = user;
    }).then(() => {
        return credentials;
    });
}

function handleDatabaseChanges(events) {
    var db = this;
    _.each(sockets, (socket) => {
        var changes = {};
        _.each(events, (event) => {
            if (canUserSeeEvent(event, socket.credentials)) {
                var table = `${event.schema}.${event.table}`;
                var idList = changes[table];
                if (!idList) {
                    idList = changes[table] = [];
                }
                if (!_.includes(idList, event.id)) {
                    idList.push(event.id);
                }
            }
        });
        if (!_.isEmpty(changes)) {
            var payload = { changes: changes };
            socket.write(JSON.stringify(payload));
        }
    });

    var reactionInsertions = _.filter(events, { table: 'reaction' });
    Promise.each(reactionInsertions, (event) => {
        var schema = event.schema;
        var published = _.get(event.diff, [ 'published', 1, ]);
        if (published) {
            return Reaction.findOne(db, schema, { id: event.id }, '*').then((reaction) => {
                var elapsed = getTimeElapsed(reaction.ptime, new Date);
                if (elapsed > 5 * 60 * 1000) {
                    return;
                }
                return User.findOne(db, 'global', { id: reaction.user_id }, '*').then((sender) => {
                    return Story.findOne(db, schema, { id: reaction.story_id }, '*').then((story) => {
                        if (!sender || !story) {
                            return;
                        }
                        return Promise.each(reaction.target_user_ids, (userId) => {
                            // TODO: employ user preference
                            var socket = _.find(sockets, (s) => {
                                return s.credentials.user.id === userId;
                            });
                            if (socket) {
                                var alert = Reaction.createAlert(schema, reaction, story, sender, socket.locale)
                                var payload = { alert };
                                console.log(alert);
                                socket.write(JSON.stringify(payload));
                            }
                        });
                    });
                });
            });
        }
    });
}

function canUserSeeEvent(event, credentials) {
    // TODO
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

function getTimeElapsed(start, end) {
    if (!start) {
        return Infinity;
    }
    if (!end) {
        return 0;
    }
    var s = (typeof(start) === 'string') ? new Date(start) : start;
    var e = (typeof(end) === 'string') ? new Date(end) : end;
    return (e - s);
}

exports.start = start;
exports.stop = stop;

if (process.argv[1] === __filename) {
    start();
}

_.each(['SIGTERM', 'SIGUSR2'], (sig) => {
    process.on(sig, function() {
        stop().then(() => {
            process.exit(0);
        });
    });
});

process.on('uncaughtException', function(err) {
    console.error(err);
});
