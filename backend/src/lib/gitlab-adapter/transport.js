var _ = require('lodash');
var Promise = require('bluebird');
var Request = require('request');
var FS = Promise.promisifyAll(require('fs'));
var Path = require('path');
var Async = require('async-do-while');
var HttpError = require('errors/http-error');

exports.fetch = fetch;
exports.fetchAll = fetchAll;
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
            objectLists.push(objects);
            if (objects.length === query.per_page && query.page < 100) {
                query.page++;
            } else {
                done = true;
            }
        });
    });
    Async.while(() => { return !done });
    Async.return(() => { return _.flatten(objectLists) });
    return Async.end();
}

function post(server, uri, payload) {
    return request(server, uri, 'post', undefined, payload);
}

function remove(server, uri) {
    return request(server, uri, 'delete');
}

var request = function(server, uri, method, query, payload) {
    // TODO: handle token refreshing
    var baseUrl = _.trimEnd(server.settings.oauth.baseURL, '/') + '/api/v4';
    var token = server.settings.api.access_token;
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
    request = function(server, uri, method, query, payload) {
        if (method !== 'get') {
            return requestUncached(server, uri, method, query, payload);
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
        var address = _.trimEnd(server.settings.oauth.baseURL, '/');
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
