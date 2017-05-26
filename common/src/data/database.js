var _ = require('lodash');
var Promise = require('bluebird');

module.exports = Database;

function Database(remoteDataSource, context) {
    this.context = context;
    
    Object.defineProperty(this, 'remoteDataSource', {
        value: remoteDataSource
    });
}

Database.prototype.find = function(query) {
    query = merge(this.context, query);
    return this.remoteDataSource.find(query);
};

Database.prototype.findOne = function(query) {
    return this.find(query).then((objects) => {
        return (objects.length > 0) ? objects[0] : null;
    });
};

Database.prototype.save = function(location, objects) {
    location = merge(this.context, location);
    return this.remoteDataSource.save(location, objects);
};

Database.prototype.saveOne = function(location, object) {
    return this.save(location, [ object ]).then((objects) => {
        return (objects.length > 0) ? objects[0] : null;
    });
};

Database.prototype.remove = function(location, objects) {
    location = merge(this.context, location);
    return this.remoteDataSource.remove(location, objects);
};

Database.prototype.removeOne = function(location, object) {
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
    var context = {};
    _.each(varSets, (varSet) => {
        _.assign(context, varSet);
    });
    return new Database(this.remoteDataSource, context);
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

function merge(context, query) {
    if (!context) {
        return query;
    }
    return _.assign({}, context, query);
}
