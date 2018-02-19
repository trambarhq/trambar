var _ = require('lodash');

module.exports = Operation;

function Operation(location) {
    var byComponent = _.get(location, 'by.constructor.displayName')
    this.address = location.address;
    this.schema = location.schema;
    this.table = location.table;
    this.start = null;
    this.finish = null;
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
 * Set the finish start time of the operation to the current time
 */
Operation.prototype.setStartTime = function() {
    var now = new Date;
    this.start = now.toISOString();
};

/**
 * Set the finish time to the current time and the duration of the operation
 */
Operation.prototype.setFinishTime = function() {
    var then = new Date(this.start);
    var now = new Date;
    this.finish = now.toISOString();
    this.duration = now - then;
};

/**
 * Return the number of seconds since the operation finished
 *
 * @return {Number}
 */
Operation.prototype.getTimeElapsed = function() {
    var then = new Date(this.finish);
    var now = new Date;
    return (now - then) * (1 / 1000);
};
