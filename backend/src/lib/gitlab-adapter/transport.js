var _ = require('lodash');
var Promise = require('bluebird');
var Request = require('request');
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
        return fetch(server, uri, query).then((objects) => {
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

function request(server, uri, method, query, payload) {
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
