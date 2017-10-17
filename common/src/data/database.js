var _ = require('lodash');
var Promise = require('bluebird');

module.exports = Database;

function Database(remoteDataSource, context) {
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
            return (objects.length > 0) ? objects[0] : null;
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
        if (newContext.schema !== 'local') {
            if (!newContext.server) {
                // set server automatically to the current host and protocol
                newContext.server = window.location.hostname;
                newContext.protocol = window.location.protocol;
            } else {
                // default to https
                newContext.protocol = 'https:';
            }
        }
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
     * Return an URL for granting OAuth access to the backend
     *
     * @param  {Object} oauthServer
     *
     * @return {String}
     */
    this.getActivationUrl = function(oauthServer) {
        return remoteDataSource.getActivationUrl(context, oauthServer);
    };
}

function merge(context, query) {
    if (!context) {
        return query;
    }
    return _.assign({}, context, query);
}
