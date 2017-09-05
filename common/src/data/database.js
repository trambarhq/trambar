var _ = require('lodash');
var Promise = require('bluebird');

module.exports = Database;

function Database(remoteDataSource, context) {
    this.context = context;

    var self = this;

    this.find = function(query) {
        query = merge(context, query);
        return remoteDataSource.find(query);
    };

    this.findOne = function(query) {
        return self.find(query).then((objects) => {
            return (objects.length > 0) ? objects[0] : null;
        });
    };

    this.save = function(location, objects) {
        location = merge(context, location);
        return remoteDataSource.save(location, objects);
    };

    this.saveOne = function(location, object) {
        return self.save(location, [ object ]).then((objects) => {
            return (objects.length > 0) ? objects[0] : null;
        });
    };

    this.remove = function(location, objects) {
        location = merge(context, location);
        return remoteDataSource.remove(location, objects);
    };

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

    this.beginAuthorization = function(area) {
        return remoteDataSource.beginAuthorization(context, area);
    };

    this.checkAuthorizationStatus = function() {
        return remoteDataSource.checkAuthorizationStatus(context);
    };

    this.submitPassword = function(username, password) {
        return remoteDataSource.submitPassword(context, username, password);
    };

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
