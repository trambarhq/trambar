var _ = require('lodash');
var Promise = require('bluebird');
var HTTPError = require('errors/http-error');

module.exports = Database;

function Database(remoteDataSource, context, online) {
    this.context = context || {};
    this.remoteDataSource = remoteDataSource;
    this.online = online;
}

/**
 * Look for objects matching given query, merged with context, which might
 * contain the location (i.e. server, schema)
 *
 * @param  {Object} query
 *
 * @return {Promise<Array<Object>>}
 */
Database.prototype.find = function(query) {
    query = merge(this.context, query);
    return this.remoteDataSource.find(query);
};

/**
 * Look for one object
 *
 * @param  {Object} query
 *
 * @return {Promise<Object>}
 */
Database.prototype.findOne = function(query) {
    query = _.extend({ expected: 1 }, query);
    return this.find(query).then((objects) => {
        return objects[0] || null;
    });
};

/**
 * Save objects to specified location, which may be the user's computer
 * (if schema is "local") or the remote server.
 *
 * @param  {Object} location
 * @param  {Array<Object>} objects
 * @param  {Number} delay
 *
 * @return {Promise<Array<Object>>}
 */
Database.prototype.save = function(location, objects, delay) {
    if (process.env.NODE_ENV !== 'production') {
        if (!_.isArray(objects) || !_.every(objects, _.isObject)) {
            throw new Error('save() expects an array of objects');
        }
    }
    location = merge(this.context, location);
    return this.remoteDataSource.save(location, objects, delay);
};

/**
 * Save one object
 *
 * @param  {Object} location
 * @param  {Object} object
 * @param  {Number} delay
 *
 * @return {Promise<Object>}
 */
Database.prototype.saveOne = function(location, object, delay) {
    if (process.env.NODE_ENV !== 'production') {
        if (!_.isObject(object)) {
            throw new Error('saveOne() expects an object');
        }
    }
    return this.save(location, [ object ], delay).then((objects) => {
        return (objects.length > 0) ? objects[0] : null;
    });
};

/**
 * Remove objects at given location
 *
 * @param  {Object} location
 * @param  {Array<Object>} objects
 *
 * @return {Promise<Array<Object>>}
 */
Database.prototype.remove = function(location, objects) {
    if (process.env.NODE_ENV !== 'production') {
        if (!_.isArray(objects) || !_.every(objects, _.isObject)) {
            throw new Error('remove() expects an array of objects');
        }
    }
    location = merge(this.context, location);
    return this.remoteDataSource.remove(location, objects);
};

/**
 * Remove one object
 *
 * @param  {Object} location
 * @param  {Object} object
 *
 * @return {Promise<Object>}
 */
Database.prototype.removeOne = function(location, object) {
    if (process.env.NODE_ENV !== 'production') {
        if (!_.isObject(object)) {
            throw new Error('removeOne() expects an object');
        }
    }
    return this.remove(location, [ object ]).then((objects) => {
        return (objects.length > 0) ? objects[0] : null;
    });
};

/**
 * Create a new Database object with contextual variables (e.g. server, schema)
 * that are automatically added to every query or storage operation
 *
 * @param  {...Object} varSets
 *
 * @return {Database}
 */
Database.prototype.use = function(...varSets) {
    var newContext = {};
    _.assign(newContext, this.context);
    _.each(varSets, (varSet) => {
        _.assign(newContext, varSet);
    });
    return new Database(this.remoteDataSource, newContext);
};

/**
 * Gain authorization to data source at given location (which might be set
 * by use() earlier) then return the user id
 *
 * @param  {Object|undefined} location
 *
 * @return {Promise<Number>}
 */
Database.prototype.start = function(location) {
    location = merge(this.context, location);
    return this.remoteDataSource.start(location);
};

/**
 * Create a session and retrieve information about the remote server,
 * including a list of OAuth providers
 *
 * @param  {String} area
 *
 * @return {Promise<Object>}
 */
Database.prototype.beginSession = function(area) {
    return this.remoteDataSource.beginSession(this.context, area);
};

/**
 * Query server to see if authorization has been granted and if so,
 * trigger the onAuthorization event
 *
 * @return {Promise<Boolean>}
 */
Database.prototype.checkSession = function() {
    return this.remoteDataSource.checkSession(this.context);
};

/**
 * Return true if the current user has access to the remote database
 *
 * @return {Boolean}
 */
Database.prototype.hasAuthorization = function() {
    return this.remoteDataSource.hasAuthorization(this.context);
};

/**
 * Add authorization info that was retrieved earlier
 *
 * @param  {Object} session
 */
Database.prototype.restoreSession = function(session) {
    this.remoteDataSource.restoreSession(session);
},

/**
 * Authenticate user through username and password
 *
 * @param  {Object} location
 * @param  {String} username
 * @param  {String} password
 *
 * @return {Promise<Boolean>}
 */
Database.prototype.submitPassword = function(username, password) {
    return this.remoteDataSource.submitPassword(this.context, username, password);
};

/**
 * Remove authorization
 *
 * @return {Promise<Boolean>}
 */
Database.prototype.endSession = function() {
    return this.remoteDataSource.endSession(this.context);
};

/**
 * Create a session for a mobile device (on browser)
 *
 * @param  {String} area
 *
 * @return {Promise<String>}
 */
Database.prototype.beginMobileSession = function(area) {
    return this.remoteDataSource.beginMobileSession(this.context, area);
};

/**
 * Acquired a session created earlier through a web-browser (on mobile device)
 *
 * @param  {String} handle
 *
 * @return {Promise<Number>}
 */
Database.prototype.acquireMobileSession = function(handle) {
    return this.remoteDataSource.acquireMobileSession(this.context, handle);
};

/**
 * Release the session created for a mobile device (on browser)
 *
 * @return {Promise}
 */
Database.prototype.releaseMobileSession = function() {
    return this.remoteDataSource.releaseMobileSession(this.context);
};

/**
 * Remove authorization
 *
 * @return {Promise<Boolean>}
 */
Database.prototype.endMobileSession = function(handle) {
    return this.remoteDataSource.endMobileSession(this.context, handle);
};

/**
 * Return an URL for testing OAuth integration or gaining API access
 *
 * @param  {Object} oauthServer
 * @param  {String} type
 *
 * @return {String}
 */
Database.prototype.getOAuthURL = function(oauthServer, type) {
    return this.remoteDataSource.getOAuthURL(this.context, oauthServer, type);
};

function merge(context, query) {
    return _.assign({}, context, query);
}
