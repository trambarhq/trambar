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
     * Return the access token, server name, and protocol
     *
     * @param  {Object} location
     *
     * @return {Object}
     */
    this.access = function(location) {
        location = merge(context, location);
        return remoteDataSource.getCredentials(location);
    };
}

function merge(context, query) {
    if (!context) {
        return query;
    }
    return _.assign({}, context, query);
}
