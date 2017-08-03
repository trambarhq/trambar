var _ = require('lodash');
var Promise = require('bluebird');
var Http = require('http');
var Request = require('request');
var Moment = require('moment');
var Database = require('database');
var HttpError = require('errors/http-error');

// accessors
var Account = require('accessors/account');
var Repo = require('accessors/repo');
var Server = require('accessors/server');
var User = require('accessors/user');

var server;

function start() {
    return Database.open().then((db) => {
        return findServers(db).each((server) => {
            return syncRepositories(db, server).then(() => {
                return syncAccounts(db, server);
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
}

function findServers(db) {
    var criteria = {
        name: 'gitlab',
        deleted: false
    };
    return Server.find(db, 'global', criteria, '*');
}

function syncAccounts(db, server) {
    return fetch(server, '/users').then((users) => {
        var criteria = {
            server_id: server.id,
        };
        return Account.find(db, 'global', criteria, '*').then((accounts) => {
            var processed = {};
            var changes = [];
            // see if the existing records requires updating
            _.each(accounts, (account) => {
                var id = _.get(account, 'details.user.id');
                var user = _.find(users, { id });
                if (user) {
                    if (account.deleted !== false || !_.isEqual(account.details.user, user)) {
                        account.deleted = false;
                        account.details.user = user;
                        changes.push(account);
                    }
                    processed[user.id] = true;
                } else {
                    if (account.deleted !== true) {
                        account.deleted = true;
                        changes.push(account);
                    }
                }
            });
            // add new accounts
            _.each(users, (user) => {
                if (!processed[user.id]) {
                    var account = {
                        type: 'gitlab',
                        server_id: server.id,
                        details: { user },
                        deleted: false,
                    };
                    changes.push(account);
                }
            });
            if (!_.isEmpty(changes)) {
                return Account.save(db, 'global', changes);
            } else {
                return [];
            }
        });
    });
}

function syncRepositories(db, server) {
    return fetch(server, '/projects').then((projects) => {
        var criteria = {
            server_id: server.id,
        };
        return Repo.find(db, 'global', criteria, '*').then((repos) => {
            var processed = {};
            var changes = [];
            // see if the existing records requires updating
            _.each(repos, (repo) => {
                var id = _.get(repo, 'details.project.id');
                var project = _.find(projects, { id });
                if (project) {
                    if (repo.deleted !== false || !_.isEqual(repo.details.project, project)) {
                        repo.deleted = false;
                        repo.details.project = project;
                        changes.push(repo);
                    }
                    processed[project.id] = true;
                } else {
                    if (repo.deleted !== true) {
                        repo.deleted = true;
                        changes.push(repo);
                    }
                }
            });
            // add new repos
            _.each(projects, (project) => {
                if (!processed[project.id]) {
                    var repo = {
                        type: 'gitlab',
                        server_id: server.id,
                        details: { project },
                        deleted: false,
                    };
                    changes.push(repo);
                }
            });
            if (!_.isEmpty(changes)) {
                return Repo.save(db, 'global', changes);
            } else {
                return [];
            }
        });
    });
}

function fetch(server, uri) {
    return new Promise((resolve, reject) => {
        var options = {
            json: true,
            baseUrl: _.get(server, 'details.url'),
            headers: {
                'PRIVATE-TOKEN': _.get(server, 'details.credentials.token'),
            },
            uri,
        };
        Request(options, (err, resp, body) => {
            if (!err) {
                resolve(body);
            } else {
                reject(err);
            }
        });
    });
}

exports.start = start;
exports.stop = stop;

if (process.argv[1] === __filename) {
    start();
}
