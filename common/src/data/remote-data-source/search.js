var _ = require('lodash');
var Operation = require('data/remote-data-source/operation');
var SessionStartTime = require('data/session-start-time');

module.exports = Search;

function Search(query) {
    Operation.call(this, query);
    this.criteria = removeUndefined(query.criteria);
    this.minimum = query.minimum;
    this.expected = query.expected;
    this.remote = query.remote;
    this.committed = query.committed;
    this.required = query.required;
    this.dirty = false;
    this.updating = false;
    this.lastRetrieved = 0;

    if (typeof(this.expected) !== 'number') {
        // if expected object count isn't specified, try inferring it from
        // the search criteria
        this.expected = countCriteria(this.criteria, 'id')
                     || countCriteria(this.criteria, 'name')
                     || countCriteria(this.criteria, 'filters')
                     || undefined;
    }
}

Search.prototype = Object.create(Operation.prototype)

/**
 * Obtain a query object
 *
 * @return {Object}
 */
Search.prototype.getQuery = function() {
    return _.pick(this, 'address', 'schema', 'table', 'criteria', 'minimum', 'expected', 'remote', 'committed');
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

/**
 * Return true if other object is the criteria with the same fields
 *
 * @param  {Object} other
 *
 * @return {Boolean}
 */
Search.prototype.matchCriteriaShape = function(other) {
    var criteriaKeys1 = _.keys(this.criteria).sort();
    var criteriaKeys2 = _.keys(other.criteria).sort();
    if (_.isEqual(criteriaKeys1, criteriaKeys2)) {
        return true;
    }
    return false;
};

/**
 * Return an object detailing the difference in criteria, if the other search
 * is fairly similar
 *
 * @param  {Object} other
 *
 * @return {Object|null}
 */
Search.prototype.findCriteriaDifference = function(other) {
    var criteriaKeys = _.keys(this.criteria);
    var diffKey, diffValue1, diffValue2;
    for (var i = 0; i < criteriaKeys.length; i++) {
        var key = criteriaKeys[i];
        var value1 = this.criteria[key];
        var value2 = other.criteria[key];
        if (!_.isEqual(value1, value2)) {
            if (!diffKey) {
                diffKey = key;
                diffValue1 = value1;
                diffValue2 = value2;
            } else {
                // more than one value differ
                return;
            }
        }
    }
    if (diffValue1 instanceof Array && diffValue2 instanceof Array) {
        // see if the two list only differ slightly
        if (diffValue1.length > 0 && diffValue2.length > 0) {
            var diff21 = _.difference(diffValue2, diffValue1);
            var similarity21 = 1 - (diff21.length / diffValue2.length);
            if (similarity1 > 0.9) {
                var diff12 = _.difference(diffValue1, diffValue2);
                var similarity12 = 1 - (diff12.length / diffValue1.length);
                return {
                    key: diffKey,
                    similarityToThis: similarity21,
                    similarityToOther: similarity12,
                    differenceFromThis: diff21,
                    differenceFromOther: diff12,
                };
            }
        }
    }
    return null;
}

Search.prototype.matchOptions = function(other) {
    if (this.minimum !== other.minimum) {
        return false;
    }
    if (this.expected !== other.expected) {
        return false;
    }
    if (this.remote !== other.remote) {
        return false;
    }
    if (this.committed !== other.committed) {
        return false;
    }
    if (this.required !== other.required) {
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
    this.finish = minRetrievalTime;
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
    var minimum = this.minimum;
    if (minimum === undefined) {
        // use the expected object count
        minimum = this.expected;
    }
    if (minimum === undefined) {
        minimum = 1;
    }
    var count = this.results.length;
    if (count < minimum) {
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
                return 1;
            }
        }
    }
}

/**
 * Remove properties from objects that are undefined (some _.isEqual() would)
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
