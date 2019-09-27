import _ from 'lodash';
import Bluebird from 'bluebird';
import QueryString from 'querystring';
import CrossFetch from 'cross-fetch';
import Path from 'path';
import HTTPError from '../common/errors/http-error.mjs';
import Database from '../database.mjs';
import Server from '../accessors/server.mjs';

const PAGE_SIZE = 50;
const PAGE_LIMIT = 5000;

/**
 * Fetch data from Gitlab server
 *
 * @param  {Server} server
 * @param  {String} uri
 * @param  {Object|undefined} query
 *
 * @return {Promise<Object>}
 */
async function fetch(server, uri, query) {
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
async function fetchAll(server, uri, query) {
    const objectList = [];
    const pageQuery = _.extend({
        page: 1,
        per_page: PAGE_SIZE
    }, query);
    let done = false;
    do {
        let objects = await fetch(server, uri, pageQuery);
        if (objects instanceof Array) {
            for (let object of objects) {
                objectList.push(object);
            }
            if (objects.length === pageQuery.per_page && pageQuery.page < PAGE_LIMIT) {
                pageQuery.page++;
            } else {
                done = true;
            }
        } else {
            done = true;
        }
    } while (!done);
    return objectList;
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
async function fetchEach(server, uri, query, callback) {
    const pageQuery = _.extend({
        page: 1,
        per_page: PAGE_SIZE
    }, query);
    let done = false;
    let total = undefined;
    let index = 0;
    do {
        let objects = await fetch(server, uri, pageQuery);
        if (objects instanceof Array) {
            if (objects.length < pageQuery.per_page) {
                // we know the total at the last page
                total = index + objects.length;
            }
            for (let object of objects) {
                let cont = await callback(object, index++, total);
                if (cont === false) {
                    done = true;
                }
            }
            if (!done) {
                if (objects.length === pageQuery.per_page && pageQuery.page < PAGE_LIMIT) {
                    pageQuery.page++;
                } else {
                    done = true;
                }
            }
        } else {
            done = true;
        }
    } while (!done);
}

/**
 * Perform an action at Gitlab server using a POST request, possibly as a
 * specific user
 *
 * @param  {Server} server
 * @param  {String} uri
 * @param  {Object} payload
 * @param  {Number|undefined} userID
 *
 * @return {Promise<Object>}
 */
async function post(server, uri, payload, userID) {
    const token = await impersonate(server, userID);
    return request(server, uri, 'post', undefined, payload, token);
}

/**
 * Perform an action at Gitlab server using a PUT request, possibly as a
 * specific user
 *
 * @param  {Server} server
 * @param  {String} uri
 * @param  {Object} payload
 * @param  {Number|undefined} userID
 *
 * @return {Promise<Object>}
 */
async function put(server, uri, payload, userID) {
    const token = await impersonate(server, userID);
    return request(server, uri, 'put', undefined, payload, token);
}

/**
 * Remove something at Gitlab server using a DELETE request
 *
 * @param  {Server} server
 * @param  {String} uri
 * @param  {Number|undefined} userID
 *
 * @return {Promise}
 */
async function remove(server, uri, userID) {
    const token = await impersonate(server, userID);
    return request(server, uri, 'delete', undefined, undefined, token);
}

let userImpersonations = {};

/**
 * Obtain impersonation token for give user
 *
 * @param  {Server} server
 * @param  {String} userID
 *
 * @return {Promise<String|undefined>}
 */
async function impersonate(server, userID) {
    if (!userID) {
        return;
    }
    const cachedUI = userImpersonations[userID];
    if (cachedUI) {
        return cachedUI;
    }

    // delete old impersonation tokens first
    const existingUIs = await getImpersonations(server, userID);
    for (let existingUI of existingUIs) {
        if (existingUI.name === 'trambar') {
            await deleteImpersonations(server, userID, existingUI);
        }
    }
    const impersonationProps = {
        name: 'trambar',
        scopes: [ 'api' ],
    };
    const newUI = await createImpersonation(server, userID, impersonationProps);
    userImpersonations[userID] = newUI;
    return newUI.token;
}

/**
 * Get a list of impersonation tokens
 *
 * @param  {Server} server
 * @param  {Number} userID
 *
 * @return {Promise<Array<Object>>}
 */
async function getImpersonations(server, userID) {
    const url = `/users/${userID}/impersonation_tokens`;
    const query = { state: 'active' };
    return fetch(server, url, query);
}

/**
 * Revoke an impersonation token
 *
 * @param  {Server} server
 * @param  {Number} userID
 * @param  {Object} ui
 *
 * @return {Promise}
 */
async function deleteImpersonations(server, userID, ui) {
    const url = `/users/${userID}/impersonation_tokens/${ui.id}`;
    return remove(server, url);
}

/**
 * Create an impersonation token for given user
 *
 * @param  {Server} server
 * @param  {Number} userID
 * @param  {Object} props
 *
 * @return {Promise<Object>}
 */
async function createImpersonation(server, userID, props) {
    const url = `/users/${userID}/impersonation_tokens`;
    return post(server, url, props);
}

/**
 * Obtain new OAuth acess token using refresh token
 *
 * @param  {Server} server
 *
 * @return {Promise<server>}
 */
async function refresh(server) {
    const payload = {
        grant_type: 'refresh_token',
        refresh_token: server.settings.api.refresh_token,
        client_id: server.settings.oauth.client_id,
        client_secret: server.settings.oauth.client_secret,
    };
    const options = {
        json: true,
        body: payload,
        baseURL: server.settings.oauth.base_url,
        uri: '/oauth/token',
        method: 'post',
    };
    let response = await attempt(options);
    if (response) {
        await updateAccessTokens(server, response);
    }
}

/**
 * Save new OAuth tokens to server record in database
 *
 * @param  {Server} server
 * @param  {Object} response
 *
 * @return {Promise<Server>}
 */
async function updateAccessTokens(server, response) {
    // modifying server so any code reusing the object would have the updated
    // avalues
    let db = await Database.open();
    server.settings.api.access_token = response.access_token;
    server.settings.api.refresh_token = response.refresh_token;
    await Server.updateOne(db, 'global', server)
    return server;
}

const unreachableLocations = [];

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
async function request(server, uri, method, query, payload, userToken) {
    const qs = QueryString.stringify(query);
    const baseURL = _.trimEnd(server.settings.oauth.base_url, '/') + '/api/v4';
    const url = baseURL + uri + (qs ? '?' + qs : '');
    const oauthToken = server.settings.api.access_token;
    const headers = { 'Content-Type': 'application/json' };
    if (userToken) {
        headers['Private-Token'] = userToken;
    } else if (oauthToken) {
        headers['Authorization'] = `Bearer ${oauthToken}`;
    } else {
        throw new HTTPError(401);
    }
    const body = (payload instanceof Object) ? JSON.stringify(payload) : undefined;

    let delayInterval = 500;
    let chances = _.includes(unreachableLocations, baseURL) ? 1 : 5;
    while (chances-- > 0) {
        const response = await CrossFetch(url, { method, headers, body });
        const { status } = response;
        if (status >= 200 && status <= 299) {
            _.pull(unreachableLocations, baseURL);
            if (status === 204) {
                return null;
            } else {
                const json = await response.json();
                return json;
            }
        } else {
            if (status === 401 || status === 467) {
                if (!userToken) {
                    // refresh access token
                    const serverAfter = await refresh(server, err);
                    // then try the request again
                    return request(serverAfter, uri, method, query, payload);
                }
            } else if (status === 429) {
                await Bluebird.delay(5000);
            } else if ((status >= 400 && status <= 499) || chances === 0) {
                if (!_.includes(unreachableLocations, baseURL)) {
                    unreachableLocations.push(baseURL);
                }
                throw new HTTPError(status);
            }
        }
        await Bluebird.delay(delayInterval);
        delayInterval *= 2;
    }
}

export {
    fetch,
    fetchAll,
    fetchEach,
    post,
    put,
    remove,
};
