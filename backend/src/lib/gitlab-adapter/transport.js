var _ = require('lodash');
var Promise = require('bluebird');
var Request = require('request');
var FS = Promise.promisifyAll(require('fs'));
var Path = require('path');
var Async = require('async-do-while');
var HttpError = require('errors/http-error');

exports.fetch = fetch;
exports.fetchAll = fetchAll;
exports.fetchEach = fetchEach;
exports.post = post;
exports.remove = remove;

function fetch(server, uri, query) {
    return request(server, uri, 'get', query);
}

function fetchAll(server, uri, params) {
    var objectLists = [];
    var query = _.extend({
        page: 1,
        per_page: 100
    }, params);
    var done = false;
    Async.do(() => {
        return request(server, uri, 'get', query).then((objects) => {
            if (objects instanceof Array) {
                objectLists.push(objects);
                if (objects.length === query.per_page && query.page < 100) {
                    query.page++;
                } else {
                    done = true;
                }
            } else {
                done = true;
            }
        });
    });
    Async.while(() => { return !done });
    Async.return(() => { return _.flatten(objectLists) });
    return Async.end();
}

function fetchEach(server, uri, params, callback) {
    var query = _.extend({
        page: 1,
        per_page: 100
    }, params);
    var done = false;
    var total = undefined;
    var index = 0;
    Async.do(() => {
        return fetch(server, uri, query).then((objects) => {
            if (objects.length < query.per_page) {
                total = index + objects.length;
            }
            return Promise.each(objects, (object) => {
                return callback(object, index++, total);
            }).then(() => {
                if (objects.length === query.per_page) {
                    query.page++;
                } else {
                    done = true;
                }
            });
        });
    });
    Async.while(() => { return !done });
    return Async.end();
}

function post(server, uri, payload, userId) {
    if (userId) {
        return impersonate(server, userId).then((token) => {
            return request(server, uri, 'post', undefined, payload, token);
        });
    } else {
        return request(server, uri, 'post', undefined, payload);
    }
}

function remove(server, uri, userId) {
    if (userId) {
        return impersonate(server, userId).then((token) => {
            return request(server, uri, 'delete', null, null, token);
        });
    } else {
        return request(server, uri, 'delete', null, null);
    }
}

var userImpersonations = {};

function impersonate(server, userId) {
    var ui = userImpersonations[userId];
    if (ui) {
        return Promise.resolve(ui.token);
    }
    return getImpersonations(server, userId).then((impersonations) => {
        var matching = _.find(impersonations, { name: 'trambar', active: true });
        if (matching) {
            userImpersonations[userId] = matching;
            return matching.token;
        }
        var impersonationProps = {
            user_id: userId,
            name: 'trambar',
            scopes: [ 'api' ],
        };
        return createImpersonation(server, impersonationProps).then((impersonation) => {
            userImpersonations[userId] = impersonation;
            return impersonation.token;
        });
    });
}

function getImpersonations(server, userId) {
    var url = `/users/${userId}/impersonation_tokens`;
    return fetch(server, url);
}

function createImpersonation(server, impersonation) {
    var url = `/users/${impersonation.user_id}/impersonation_tokens`;
    return post(server, url, impersonation);
}

var request = function(server, uri, method, query, payload, token) {
    // TODO: handle token refreshing
    var baseUrl = _.trimEnd(server.settings.oauth.base_url, '/') + '/api/v4';
    if (!token) {
        token = server.settings.api.access_token;
    }
    var options = {
        json: true,
        headers: {
            Authorization: `Bearer ${token}`,
        },
        qs: query,
        body: payload,
        baseUrl,
        uri,
        method,
    };

    var succeeded = false;
    var attempts = 0;
    var result = null;
    var delayInterval = 500;
    Async.do(() => {
        return attempt(options).then((body) => {
            result = body;
            succeeded = true;
        }).catch((err) => {
            // throw the error if it's HTTP 4xx
            if (err instanceof HttpError) {
                if (err.statusCode >= 400 || err.statusCode <= 499) {
                    throw err;
                }
            }
        });
    });
    Async.while(() => {
        if (!succeeded) {
            if (attempts < 10) {
                // try again after a delay
                return Promise.delay(delayInterval).then(() => {
                    console.log(`Retrying (${attempts}/10)...`);
                    attempts++;
                    delayInterval *= 2;
                    return true;
                });
            }
        }
    });
    Async.return(() => {
        return result;
    });
    return Async.end();
}

function attempt(options) {
    return new Promise((resolve, reject) => {
        Request(options, (err, resp, body) => {
            if (!err && resp && resp.statusCode >= 400) {
                err = new HttpError(resp.statusCode);
            }
            if (resp) {
                resp.destroy();
            }
            if (!err) {
                resolve(body);
            } else {
                console.log(`Error retrieving: `, options);
                reject(err);
            }
        });
    });
}

var CACHE_FOLDER = process.env.CACHE_FOLDER;
if (CACHE_FOLDER) {
    var requestUncached = request;
    request = function(server, uri, method, query, payload, token) {
        if (method !== 'get') {
            return requestUncached(server, uri, method, query, payload, token);
        }
        var cacheFilePath = getCachePath(server, uri, query);
        return FS.readFileAsync(cacheFilePath, 'utf-8').then((json) => {
            var data = JSON.parse(json);
            return data;
        }).catch((err) => {
            return requestUncached(server, uri, method, query).then((data) => {
                var json = JSON.stringify(data, undefined, 2);
                var folderPath = Path.dirname(cacheFilePath);
                return createFolder(folderPath).then(() => {
                    return FS.writeFileAsync(cacheFilePath, json).then(() => {
                        return data;
                    });
                });
            });
        });
    }

    function createFolder(folderPath) {
        return FS.statAsync(folderPath).catch((err) => {
            var parentPath = Path.dirname(folderPath);
            if (parentPath === folderPath) {
                throw err;
            }
            return createFolder(parentPath).then(() => {
                return FS.mkdirAsync(folderPath);
            });
        });
    }

    function getCachePath(server, uri, query) {
        var address = _.trimEnd(server.settings.oauth.base_url, '/');
        var domain = address.replace(/^https?:\/\//, '').replace(/:\d+/, '');
        var path = _.trimEnd(uri, '/');
        if (!_.startsWith(path, '/')) {
            path = '/' + path;
        }
        if (_.isEmpty(query)) {
            path += '.json';
        } else {
            var filename = '';
            _.forIn(query, (value, name) => {
                if (filename) {
                    filename += '&';
                }
                filename += name;
                filename += '=';
                filename += encodeURIComponent(value);
            });
            filename += '.json';
            path += '/' + filename;
        }
        return `${CACHE_FOLDER}/${domain}${path}`;
    }
}
