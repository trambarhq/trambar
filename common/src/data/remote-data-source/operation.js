var _ = require('lodash');

module.exports = Operation;

function Operation(location) {
    var byComponent = _.get(location, 'by.constructor.displayName')
    if (location.schema !== 'local') {
        this.address =  location.address;
    }
    this.schema = location.schema;
    this.table = location.table;
    this.startTime = null;
    this.finishTime = null;
    this.results = [];
    this.promise = null;
    this.by = (byComponent) ? [ byComponent ] : [];
}

/**
 * Obtain a location object
 *
 * @return {Object}
 */
Operation.prototype.getLocation = function() {
    if (this.isLocal()) {
        return _.pick(this, 'schema', 'table');
    } else {
        return _.pick(this, 'address', 'schema', 'table');
    }
};

/**
 * Check if the other object has the same location
 *
 * @param  {Object} other
 *
 * @return {Boolean}
 */
Operation.prototype.matchLocation = function(other) {
    if (this.address !== other.address) {
        return false;
    }
    if (this.schema !== other.schema) {
        return false;
    }
    if (this.table !== other.table) {
        return false;
    }
    return true;
};

/**
 * Return true if the operation is concerns only locally stored data
 *
 * @return {Boolean}
 */
Operation.prototype.isLocal = function() {
    return (this.schema === 'local');
};

/**
 * Set the start time of the operation to the current time
 */
Operation.prototype.start = function() {
    var now = new Date;
    this.startTime = now.toISOString();
};

/**
 * Set the results, finish time, and the duration of the operation
 *
 * @param  {Array<Object>} results
 */
Operation.prototype.finish = function(results) {
    var then = new Date(this.startTime);
    var now = new Date;
    if (results) {
        this.results = results;
    }
    this.finishTime = now.toISOString();
    this.duration = now - then;
};

/**
 * Mark the operation as canceled
 */
Operation.prototype.cancel = function() {
    this.canceled = true;
};

/**
 * Return the number of seconds since the operation finished
 *
 * @return {Number}
 */
Operation.prototype.getTimeElapsed = function() {
    var then = new Date(this.finishTime);
    var now = new Date;
    return (now - then) * (1 / 1000);
};
