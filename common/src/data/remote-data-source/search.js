var _ = require('lodash');
var Promise = require('bluebird');
var Operation = require('data/remote-data-source/operation');
var SessionStartTime = require('data/session-start-time');

module.exports = Search;

function Search(query) {
    Operation.call(this, query);
    this.criteria = query.criteria || {};
    this.remote = query.remote || false;
    this.dirty = false;
    this.cacheSignatureBefore = '';
    this.cacheSignatureAfter = '';
    this.updating = false;
    this.scheduled = false;
    this.lastRetrieved = 0;
    this.missingResults = [];

    this.minimum = query.minimum;
    this.expected = query.expected;
    this.prefetch = query.prefetch;

    if (typeof(this.expected) !== 'number') {
        // if expected object count isn't specified, try inferring it from
        // the search criteria
        this.expected = countCriteria(this.criteria, 'id')
                     || countCriteria(this.criteria, 'name')
                     || countCriteria(this.criteria, 'filters')
                     || undefined;
    }

    // filter out bad values
    this.criteria = removeUndefined(this.criteria);
    this.criteria = removeTemporaryIds(this.criteria);
}

Search.prototype = Object.create(Operation.prototype)

/**
 * Obtain a query object
 *
 * @return {Object}
 */
Search.prototype.getQuery = function() {
    return _.pick(this, 'address', 'schema', 'table', 'criteria');
};

/**
 * Return the types of properties in the criteria object
 *
 * @return {Object}
 */
Search.prototype.getCriteriaShape = function() {
    var shape = _.mapValues(this.criteria, (value) => {
        if (value != null) {
            return value.constructor;
        } else {
            return null;
        }
    });
    return shape;
};

/**
 * Return true if other object is the same search
 *
 * @param  {Object} other
 *
 * @return {Boolean}
 */
Search.prototype.match = function(other) {
    if (!this.matchLocation(other)) {
        return false;
    }
    if (!this.matchCriteria(other)) {
        return false;
    }
    if (!this.matchOptions(other)) {
        return false;
    }
    return true;
};

/**
 * Return true if other object has the same criteria
 *
 * @param  {Object} other
 *
 * @return {Boolean}
 */
Search.prototype.matchCriteria = function(other) {
    return _.isEqual(this.criteria, other.criteria);
};

Search.prototype.matchOptions = function(other) {
    if (this.remote !== other.remote) {
        return false;
    }
    return true;
};

/**
 * Check if cached objects are retrieved so long enough ago that a
 * server-side search is advisable
 *
 * @param  {Number} refreshInterval
 *
 * @return {Boolean}
 */
Search.prototype.isSufficientlyRecent = function(refreshInterval) {
    if (this.isLocal()) {
        return true;
    }
    var rtimes = _.map(this.results, 'rtime');
    var minRetrievalTime = _.min(rtimes);
    if (minRetrievalTime < SessionStartTime) {
        // one of the objects was retrieved in an earlier session
        return false;
    }
    var then = new Date(minRetrievalTime);
    var now = new Date;
    // see how much time has elapsed since the object was retrieved/last verified
    var elapsed = (now - then) * (1 / 1000);
    if (elapsed > refreshInterval) {
        return false;
    }
    // use the retrieval time of the oldest object as the search's finish time
    this.finishTime = minRetrievalTime;
    return true;
}

/**
 * Check if a recent search is fresh
 *
 * @param  {Number} refreshInterval
 *
 * @return {Boolean}
 */
Search.prototype.isFresh = function(refreshInterval) {
    if (this.schema === 'local') {
        return true;
    }
    // we received a notification earlier indicate changes might have occurred
    if (this.dirty) {
        return false;
    }
    // the result hasn't been invalidated via notification
    // still, we want to check with the server once in a while
    var elapsed = this.getTimeElapsed();
    if (elapsed > refreshInterval) {
        return false;
    }
    return true;
}

/**
 * Check if there're enough cached records to warrant displaying them
 * while a remote search at takes place
 *
 * @return {Boolean}
 */
Search.prototype.isSufficientlyCached = function() {
    var count = this.results.length;
    if (this.minimum == undefined) {
        return false;
    }
    if (count < this.minimum) {
        return false;
    }
    return true;
}

/**
 * Check if the number of object retrieved from cache meet expectation
 *
 * @return {Boolean}
 */
 Search.prototype.isMeetingExpectation = function() {
    if (this.results.length !== this.expected) {
        return false;
    }
    return true;
};

/**
 * Remember the current cache signature so we know whether the results we
 * obtained earlier are valid or not
 *
 * @param  {String} signature
 */
Search.prototype.validateResults = function(signature) {
    this.cacheSignatureAfter = signature;
};

/**
 * Given lists of ids and gns (generation numbers), return the ids that
 * either are missing from the current results or the objects' gns are
 * different from the ones provided
 *
 * @param  {Array<Number>} ids
 * @param  {Array<Number>} gns
 *
 * @return {Array<Number>}
 */
Search.prototype.getUpdateList = function(ids, gns) {
    if (this.cacheSignatureBefore) {
        if (this.cacheSignatureBefore !== this.cacheSignatureAfter) {
            // the current results aren't valid
            // fetch everything anew
            return _.slice(ids);
        }
    }
    var objects = this.results;
    var updated = [];
    _.each(ids, (id, i) => {
        var gn = gns[i];
        var index = _.sortedIndexBy(objects, { id }, 'id');
        var object = (objects) ? objects[index] : null;
        if (!object || object.id !== id || object.gn !== gn) {
            updated.push(id);
        }
    });
    return updated;
};

/**
 * Return ids of objects that aren't found in the list provided
 *
 * @param  {Array<Number>} ids
 *
 * @return {Array<Number>}
 */
Search.prototype.getRemovalList = function(ids) {
    if (this.cacheSignatureBefore) {
        if (this.cacheSignatureBefore !== this.cacheSignatureAfter) {
            return [];
        }
    }
    var removal = [];
    _.each(this.results, (object) => {
        if (!_.includes(ids, object.id)) {
            removal.push(object.id);
        }
    });
    return removal;
};

/**
 * Given a list of ids, return the ids that are missing from the current results
 *
 * @param  {Array<Number>} ids
 *
 * @return {Array<Number>}
 */
Search.prototype.getFetchList = function(ids) {
    if (this.cacheSignatureBefore) {
        if (this.cacheSignatureBefore !== this.cacheSignatureAfter) {
            return [];
        }
    }
    var objects = this.results;
    var updated = [];
    _.each(ids, (id, i) => {
        var index = _.sortedIndexBy(objects, { id }, 'id');
        var object = (objects) ? objects[index] : null;
        if (!object || object.id !== id) {
            updated.push(id);
        }
    });
    return updated;
};

Search.prototype.finish = function(results) {
    var previousResults = this.results;
    var missingResults = [];
    var newlyRetrieved = 0;
    Operation.prototype.finish.call(this, results);

    this.dirty = false;
    this.cacheSignatureBefore = this.cacheSignatureAfter;
    if (results) {
        this.promise = Promise.resolve(this.results);

        // update rtime of results
        _.each(this.results, (object) => {
            if (!object.rtime) {
                newlyRetrieved++;
            }
            object.rtime = this.finishTime;
        });

        // if an object that we found before is no longer there, then
        // it's either deleted or changed in such a way that it longer
        // meets the criteria; in both scenarios, the local copy has
        // become stale and should be removed from cache
        _.each(previousResults, (object) => {
            var index = _.sortedIndexBy(results, object, 'id');
            var target = results[index];
            if (!target || target.id !== object.id) {
                missingResults.push(object);
            }
        });
    }
    this.missingResults = missingResults;
    this.lastRetrieved = newlyRetrieved;
};

/**
 * Count criteria of a given type
 *
 * @param  {Object} criteria
 * @param  {String} name
 *
 * @return {Number|undefined}
 */
function countCriteria(criteria, name) {
    if (criteria) {
        var value = criteria[name];
        if (value != undefined) {
            if (value instanceof Array) {
                return value.length;
            } else {
                return (value) ? 1 : 0;
            }
        }
    }
}

/**
 * Remove properties from objects that are undefined
 *
 * @param  {Object} object
 *
 * @return {Object}
 */
function removeUndefined(object) {
    if (object instanceof Array) {
        var dst = [];
        for (var i = 0; i < object.length; i++) {
            var value = object[i];
            if (value !== undefined) {
                if (value instanceof Object) {
                    value = removeUndefined(value);
                }
                dst.push(value);
            }
        }
        return dst;
    } else if (object instanceof Object) {
        var dst = {};
        for (var key in object) {
            var value = object[key];
            if (value !== undefined) {
                if (value instanceof Object) {
                    value = removeUndefined(value);
                }
                dst[key] = value;
            }
        }
        return dst;
    } else {
        return object;
    }
}

/**
 * Return ids that is less than one from criteria object
 *
 * @param  {Object} criteria
 *
 * @return {Object}
 */
function removeTemporaryIds(criteria) {
    return _.mapValues(criteria, (value, name) => {
        if (value instanceof Array) {
            if (/(^|_)ids?$/.test(name)) {
                value = _.filter(value, (v) => {
                    if (typeof(v) === 'number') {
                        if (v < 1) {
                            return false;
                        }
                    }
                    return true;
                });
            }
        }
        return value;
    });
}
