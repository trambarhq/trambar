var _ = require('lodash');
var Promise = require('bluebird');
var Request = require('request');
var FS = Promise.promisifyAll(require('fs'));
var Path = require('path');
var Async = require('async-do-while');
var HttpError = require('errors/http-error');
var Database = require('database');
var Server = require('accessors/server');

exports.fetch = fetch;
exports.fetchAll = fetchAll;
exports.fetchEach = fetchEach;
exports.post = post;
exports.remove = remove;

/**
 * Fetch data from Gitlab server
 *
 * @param  {Server} server
 * @param  {String} uri
 * @param  {Object|undefined} query
 *
 * @return {Promise<Object>}
 */
function fetch(server, uri, query) {
    return request(server, uri, 'get', query);
}

/**
 * Fetch list of objects, returned potentially in multiple chunks
 *
 * @param  {Server} server
 * @param  {String} uri
 * @param  {Object|undefined} query
 *
 * @return {Promise<Object>}
 */
function fetchAll(server, uri, query) {
    var objectLists = [];
    var pageQuery = _.extend({
        page: 1,
        per_page: 100
    }, query);
    var done = false;
    Async.do(() => {
        return fetch(server, uri, pageQuery).then((objects) => {
            if (objects instanceof Array) {
                objectLists.push(objects);
                if (objects.length === pageQuery.per_page && pageQuery.page < 100) {
                    pageQuery.page++;
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

/**
 * Fetch list of objects, invoking callback function for each of them
 *
 * Promise is fulfilled when all objects have been processed
 *
 * @param  {Server} server
 * @param  {String} uri
 * @param  {Object|undefined} query
 * @param  {Function} callback
 *
 * @return {Promise}
 */
function fetchEach(server, uri, query, callback) {
    var pageQuery = _.extend({
        page: 1,
        per_page: 100
    }, query);
    var done = false;
    var total = undefined;
    var index = 0;
    Async.do(() => {
        return fetch(server, uri, pageQuery).then((objects) => {
            if (objects.length < pageQuery.per_page) {
                // we know the total at the last page
                total = index + objects.length;
            }
            return Promise.each(objects, (object) => {
                return callback(object, index++, total);
            }).then(() => {
                if (objects.length === pageQuery.per_page) {
                    pageQuery.page++;
                } else {
                    done = true;
                }
            });
        });
    });
    Async.while(() => { return !done });
    return Async.end();
}

/**
 * Perform an action at Gitlab server using a POST request, possibly as a
 * specific user
 *
 * @param  {Server} server
 * @param  {String} uri
 * @param  {Object} payload
 * @param  {Number|undefined} userId
 *
 * @return {Promise<Object>}
 */
function post(server, uri, payload, userId) {
    if (userId) {
        return impersonate(server, userId).then((token) => {
            return request(server, uri, 'post', undefined, payload, token);
        });
    } else {
        return request(server, uri, 'post', undefined, payload);
    }
}

/**
 * Remove something at Gitlab server using a DELETE request
 *
 * @param  {Server} server
 * @param  {String} uri
 *
 * @return {Promise}
 */
function remove(server, uri, userId) {
    return request(server, uri, 'delete');
}

var userImpersonations = {};

/**
 * Obtain impersonation token for give user
 *
 * @param  {Server} server
 * @param  {String} userId
 *
 * @return {Promise<String>}
 */
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

/**
 * Get a list of impersonation tokens
 *
 * @param  {Server} server
 * @param  {Number} userId
 *
 * @return {Promise<Array<Object>>}
 */
function getImpersonations(server, userId) {
    var url = `/users/${userId}/impersonation_tokens`;
    return fetch(server, url);
}

/**
 * Create an impersonation token for given user
 *
 * @param  {Server} server
 * @param  {Number} userId
 * @param  {Object} props
 *
 * @return {Promise<Object>}
 */
function createImpersonation(server, userId, props) {
    var url = `/users/${userId}/impersonation_tokens`;
    return post(server, url, props);
}

/**
 * Obtain new OAuth acess token using refresh token
 *
 * @param  {Server} server
 *
 * @return {Promise<server>}
 */
function refresh(server) {
    var payload = {
        grant_type: 'refresh_token',
        refresh_token: server.settings.api.refresh_token,
        client_id: server.settings.oauth.client_id,
        client_secret: server.settings.oauth.client_secret,
    };
    var options = {
        json: true,
        body: payload,
        baseUrl: server.settings.oauth.base_url,
        uri: '/oauth/token',
        method: 'post',
    };
    return attempt(options).then((response) => {
        return updateAccessTokens(server, response);
    }).catch((err) => {
        if (err instanceof HttpError) {
            if (err.statusCode === 401) {
                // TODO: reactivate this after more testing
                //return updateAccessTokens(server, {}).throw(err);
            }
        }
        throw err;
    });
}

/**
 * Save new OAuth tokens to server record in database
 *
 * @param  {Server} server
 * @param  {Object} response
 *
 * @return {Promise<Server>}
 */
function updateAccessTokens(server, response) {
    // modifying server so any code reusing the object would have the updated
    // avalues
    server.settings.api.access_token = response.access_token;
    server.settings.api.refresh_token = response.refresh_token;
    return Database.open().then((db) => {
        return Server.updateOne(db, 'global', server).return(server);
    });
}

/**
 * Perform a HTTP request, using either a user impersonation token or the OAuth
 * access token stored in the server object to assert authorization
 *
 * When an error is encountered, try again unless the error is access violation
 *
 * @param  {Server} server
 * @param  {String} uri
 * @param  {String} method
 * @param  {Object|undefined} query
 * @param  {Object|undefined} payload
 * @param  {String} userToken
 *
 * @return {Promise<Object>}
 */
function request(server, uri, method, query, payload, userToken) {
    var baseUrl = _.trimEnd(server.settings.oauth.base_url, '/') + '/api/v4';
    var token;
    if (userToken) {
        token = userToken;
    } else {
        token = server.settings.api.access_token;
    }
    if (!token) {
        return Promise.reject(new HttpError(401));
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
    var lastError;
    Async.do(() => {
        return attempt(options).then((body) => {
            if (Math.random() > 0.9) {
                throw new HttpError(401);
            }
            result = body;
            succeeded = true;
        }).catch((err) => {
            // throw the error if it's HTTP 4xx
            lastError = err;
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
            } else {
                throw lastError;
            }
        }
    });
    Async.return(() => {
        return result;
    });
    return Async.end().catch((err) => {
        if (err instanceof HttpError) {
            if (err.statusCode === 401 || err.statusCode === 467) {
                if (!userToken) {
                    // refresh access token
                    return refresh(server, err).then((serverAfter) => {
                        // then try the request again
                        return request(serverAfter, uri, method, query, payload);
                    });
                }
            }
        }
        throw err;
    });
}

/**
 * Perform a HTTP request
 *
 * @param  {Object} options
 *
 * @return {Promise<Object>}
 */
function attempt(options) {
    return new Promise((resolve, reject) => {
        Request(options, (err, resp, body) => {
            if (!err && resp && resp.statusCode >= 400) {
                err = new HttpError(resp.statusCode);
            }
            if (!err) {
                resolve(body);
            } else {
                reject(err);
            }
        });
    });
}

var CACHE_FOLDER = process.env.CACHE_FOLDER;
if (CACHE_FOLDER) {
    Request = function(options, callback) {
        var Request = require('request');
        if (options.method !== 'get') {
            return Request(options, callback);
        }
        var cacheFilePath = getCachePath(options.baseUrl, options.uri, options.qs);
        FS.readFileAsync(cacheFilePath, 'utf-8').then((json) => {
            var data = JSON.parse(json);
            callback(null, null, data);
        }).catch((err) => {
            Request(options, (err, resp, data) => {
                if (!err) {
                    var json = JSON.stringify(data, undefined, 2);
                    var folderPath = Path.dirname(cacheFilePath);
                    createFolder(folderPath).then(() => {
                        return FS.writeFileAsync(cacheFilePath, json);
                    });
                }
                callback(err, resp, data);
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

    function getCachePath(baseUrl, uri, query) {
        var m = /^https?:\/\/([^\/:]+)/.exec(baseUrl);
        var domain = m[1];
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
