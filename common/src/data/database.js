var _ = require('lodash');
var Promise = require('bluebird');
var HttpError = require('errors/http-error');

module.exports = Database;

function Database(remoteDataSource, context) {
    if (!context) {
        context = {};
    }
    this.context = context;

    var self = this;

    /**
     * Look for objects matching given query, merged with context, which might
     * contain the location (i.e. server, schema)
     *
     * @param  {Object} query
     *
     * @return {Promise<Array<Object>>}
     */
    this.find = function(query) {
        query = merge(context, query);
        return remoteDataSource.find(query);
    };

    /**
     * Look for one object
     *
     * @param  {Object} query
     *
     * @return {Promise<Object>}
     */
    this.findOne = function(query) {
        query = _.extend({ expected: 1 }, query);
        return self.find(query).then((objects) => {
            if (objects.length > 0) {
                return objects[0];
            } else {
                if (query.required) {
                    throw new HttpError(404);
                }
                return null;
            }
        });
    };

    /**
     * Save objects to specified location, which may be the user's computer
     * (if schema is "local") or the remote server.
     *
     * @param  {Object} location
     * @param  {Array<Object>} objects
     *
     * @return {Promise<Array<Object>>}
     */
    this.save = function(location, objects) {
        if (process.env.NODE_ENV !== 'production') {
            if (!_.isArray(objects) || !_.every(objects, _.isObject)) {
                throw new Error('save() expects an array of objects');
            }
        }
        location = merge(context, location);
        return remoteDataSource.save(location, objects);
    };

    /**
     * Save one object
     *
     * @param  {Object} location
     * @param  {Object} object
     *
     * @return {Promise<Object>}
     */
    this.saveOne = function(location, object) {
        if (process.env.NODE_ENV !== 'production') {
            if (!_.isObject(object)) {
                throw new Error('saveOne() expects an object');
            }
        }
        return self.save(location, [ object ]).then((objects) => {
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
    this.remove = function(location, objects) {
        if (process.env.NODE_ENV !== 'production') {
            if (!_.isArray(objects) || !_.every(objects, _.isObject)) {
                throw new Error('remove() expects an array of objects');
            }
        }
        location = merge(context, location);
        return remoteDataSource.remove(location, objects);
    };

    /**
     * Remove one object
     *
     * @param  {Object} location
     * @param  {Object} object
     *
     * @return {Promise<Object>}
     */
    this.removeOne = function(location, object) {
        if (process.env.NODE_ENV !== 'production') {
            if (!_.isObject(object)) {
                throw new Error('removeOne() expects an object');
            }
        }
        return self.remove(location, [ object ]).then((objects) => {
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
    this.use = function(...varSets) {
        var newContext = {};
        _.assign(newContext, context);
        _.each(varSets, (varSet) => {
            _.assign(newContext, varSet);
        });
        return new Database(remoteDataSource, newContext);
    };

    /**
     * Gain authorization to data source at given location (which might be set
     * by use() earlier) then return the user id
     *
     * @param  {Object|undefined} location
     *
     * @return {Promise<Number>}
     */
    this.start = function(location) {
        location = merge(context, location);
        return remoteDataSource.start(location);
    };

    /**
     * Create a login session and retrieve information about the remote server,
     * including a list of OAuth providers
     *
     * @param  {String} area
     *
     * @return {Promise<Object>}
     */
    this.beginAuthorization = function(area) {
        return remoteDataSource.beginAuthorization(context, area);
    };

    /**
     * Query server to see if authorization has been granted and if so,
     * trigger the onAuthorization event
     *
     * @return {Promise<Boolean>}
     */
    this.checkAuthorizationStatus = function() {
        return remoteDataSource.checkAuthorizationStatus(context);
    };

    /**
     * Return true if the current user has access to the remote database
     *
     * @return {Boolean}
     */
    this.hasAuthorization = function() {
        return remoteDataSource.hasAuthorization(context);
    };

    /**
     * Add authorization info that was retrieved earlier
     *
     * @param  {Object} authorization
     */
    this.addAuthorization = function(authorization) {
        remoteDataSource.addAuthorization(context, authorization);
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
    this.submitPassword = function(username, password) {
        return remoteDataSource.submitPassword(context, username, password);
    };

    /**
     * Remove authorization
     *
     * @return {Promise<Boolean>}
     */
    this.endAuthorization = function() {
        return remoteDataSource.endAuthorization(context);
    };

    /**
     * Return an URL for testing OAuth integration or gaining API access
     *
     * @param  {Object} oauthServer
     * @param  {String} type
     *
     * @return {String}
     */
    this.getOAuthUrl = function(oauthServer, type) {
        return remoteDataSource.getOAuthUrl(context, oauthServer, type);
    };
}

function merge(context, query) {
    return _.assign({}, context, query);
}
