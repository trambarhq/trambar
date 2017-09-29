var _ = require('lodash');
var Promise = require('bluebird');
var Request = require('request');
var Async = require('utils/async-do-while');
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
    return new Promise((resolve, reject) => {
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
