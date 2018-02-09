var _ = require('lodash');
var Promise = require('bluebird');

var LocalSearch = require('data/local-search');

module.exports = RemoteDataChange;

function RemoteDataChange(location, objects) {
    this.location = location;
    this.objects = _.map(objects, (object) => {
        if (!object.uncommitted) {
            object = _.clone(object);
            if (!object.id) {
                // assign a temporary id so we can find the object again
                object.id = getTemporaryId();
            }
            object.uncomitted = true;
        }
        return object;
    });
    this.removed = _.map(objects, (object) => {
        return false;
    });
    this.dispatched = false;
    this.delayed = false;
    this.dispatching = false;
    this.committed = false;
    this.timeout = 0;
    this.promise = new Promise((resolve, reject) => {
        this.resolvePromise = resolve;
        this.rejectPromise = reject;
    });
}

RemoteDataChange.prototype.delay = function(delay) {
    if (this.delayed) {
        return;
    }
    this.delayed = true;
    this.timeout = setTimeout(() => {
        this.delayed = false;
        if (this.dispatching) {
            this.dispatching = false;
            this.dispatch();
        }
    }, delay);
};

RemoteDataChange.prototype.dispatch = function() {
    if (this.dispatched || this.canceled) {
        // already sent or canceled
        return;
    }
    if (this.delayed) {
        // wait for timeout to fire
        this.dispatching = true;
        return;
    }
    this.dispatched = true;
    this.onDispatch(this).then((objects) => {
        this.committed = true;
        if (!this.canceled) {
            this.resolvePromise(objects);
        } else {
            // ignore the results
            this.resolvePromise([]);
        }
    }).catch((err) => {
        if (!this.canceled) {
            this.rejectPromise(err);
        } else {
            // ignore the error
            this.resolvePromise([]);
        }
    });
};

RemoteDataChange.prototype.cancel = function() {
    if (this.canceled) {
        // already canceled
        return;
    }
    this.canceled = true;
    if (this.timeout) {
        clearTimeout(this.timeout);
    }
    if (this.dispatched) {
        // the change was already sent--don't call onCancel unless
        // onDispatch failed
        return;
    }
    this.onCancel(this).then(() => {
        // return empty array
        this.resolvePromise([]);
    }).catch((err) => {
        this.rejectPromise(err);
    });
};

/**
 * Incorporate changes from an earlier operation
 *
 * @param  {Object} earlierOp
 */
RemoteDataChange.prototype.merge = function(earlierOp) {
    if (!_.isEqual(earlierOp.location, this.location)) {
        return;
    }
    _.each(this.objects, (object, i) => {
        var index = _.findIndex(earlierOp.objects, { id: object.id });
        if (index !== -1 && !earlierOp.removed[index]) {
            var earlierObject = earlierOp.objects[index];
            // merge in missing properties from earlier op
            _.forIn(earlierObject, (value, key) => {
                if (object[key] === undefined) {
                    object[key] = value;
                }
            });
            // indicate that the object has been superceded
            earlierOp.removed[index] = true;
        }
    });
    // cancel the earlier op if everything was removed from it
    if (_.every(earlierOp.removed)) {
        earlierOp.cancel();
    }
};

/**
 * Apply changes to search results
 *
 * @param  {Object} search
 * @param  {Boolean} includeDeleted
 */
RemoteDataChange.prototype.apply = function(search, includeDeleted) {
    if (this.canceled) {
        return;
    }
    if (!_.isMatch(search, this.location)) {
        return;
    }
    _.each(this.objects, (uncommittedObject, i) => {
        if (this.removed[i]) {
            return;
        }
        var index = _.findIndex(search.results, { id: uncommittedObject.id });
        if (index !== -1) {
            if (uncommittedObject.deleted && !includeDeleted) {
                search.results.splice(index, 1);
            } else {
                var match = LocalSearch.match(search.table, uncommittedObject, search.criteria);
                if (match) {
                    var newObject = _.clone(search.results[index]);
                    search.results[index] = _.extend(newObject, uncommittedObject);
                } else {
                    search.results.splice(index, 1);
                }
            }
        } else {
            if (!(uncommittedObject.deleted && !includeDeleted)) {
                var match = LocalSearch.match(search.table, uncommittedObject, search.criteria);
                if (match) {
                    search.results.push(uncommittedObject);
                }
            }
        }
    });
}

RemoteDataChange.prototype.deliverables = function() {
    return _.map(this.objects, (object) => {
        // strip out special properties
        if (object.id < 1) {
            return _.omit(object, 'id', 'uncomitted');
        } else {
            return _.omit(object, 'uncomitted')
        }
    });
}

/**
 * Return a temporary id that can be used to identify an uncommitted object
 *
 * @return {Number}
 */
function getTemporaryId() {
    var newTemporaryId = lastTemporaryId + 0.000000001;
    lastTemporaryId = newTemporaryId;
    return newTemporaryId;
}

var lastTemporaryId = 0;
