var _ = require('lodash');
var Promise = require('bluebird');
var Async = require('async-do-while');

var LocalSearch = require('data/local-search');
var TemporaryID = require('data/remote-data-source/temporary-id');

module.exports = Change;

function Change(location, objects, options) {
    this.location = location;
    this.objects = _.map(objects, (object) => {
        if (!object.uncommitted) {
            object = _.clone(object);
            if (!object.id) {
                // assign a temporary id so we can find the object again
                object.id = TemporaryID.allocate();
            }
            object.uncommitted = true;
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
    this.canceled = false;
    this.timeout = 0;
    this.promise = new Promise((resolve, reject) => {
        this.resolvePromise = resolve;
        this.rejectPromise = reject;
    });
    this.dependentPromises = [];
    this.delivered = null;
    this.received = null;

    if (options) {
        if (options.delay) {
            this.delayed = true;
            this.timeout = setTimeout(() => {
                this.delayed = false;
                if (this.dispatching) {
                    this.dispatching = false;
                    this.dispatch();
                }
            }, options.delay);
        }
        this.onConflict = options.onConflict;
    }
    this.onDispatch = null;
    this.onCancel = null;
    this.onCompletion = null;
}

/**
 * Send a pending change to remote server by triggering the attached
 * onDispatch handler
 */
Change.prototype.dispatch = function() {
    if (this.dispatched || this.canceled) {
        // already sent or canceled
        return;
    }
    if (this.delayed) {
        // wait for timeout to fire
        this.dispatching = true;
        return;
    }
    Promise.all(this.dependentPromises).then(() => {
        var attempt = 1;
        var delay = 1000;
        Async.while(() => {
            return !this.committed && !this.canceled && !this.dispatched;
        });
        Async.do(() => {
            this.dispatched = true;
            return this.onDispatch(this).then((objects) => {
                this.committed = true;
                this.received = objects;
                return this.onCompletion(this).then(() => {
                    if (!this.canceled) {
                        this.resolvePromise(objects);
                    } else {
                        // ignore the results
                        this.resolvePromise([]);
                    }
                });
            }).catch((err) => {
                if (err.statusCode >= 400 && err.statusCode <= 499) {
                    this.rejectPromise(err);
                }
                if (this.comitted) {
                    this.rejectPromise(err);
                }
                this.dispatched = false;
                // wait a bit then try again
                delay = Math.min(delay * 2, 10 * 1000);
                return Promise.delay(delay).then(() => {
                    if (!this.canceled) {
                        attempt++;
                    } else {
                        this.resolvePromise([]);
                    }
                });
            });
        });
        return Async.end();
    });
};

/**
 * Cancel a change, triggering the attached onCancel handler
 */
Change.prototype.cancel = function() {
    if (this.canceled) {
        // already canceled
        return;
    }
    this.canceled = true;
    if (this.dispatched) {
        // the change was already sent
        return;
    }
    if (this.timeout) {
        clearTimeout(this.timeout);
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
Change.prototype.merge = function(earlierOp) {
    if (!_.isEqual(earlierOp.location, this.location)) {
        return;
    }
    var dependent = false;
    _.each(this.objects, (object, i) => {
        var index = _.findIndex(earlierOp.objects, { id: object.id });
        if (index !== -1 && !earlierOp.removed[index]) {
            if (!earlierOp.dispatched || object.id >= 1) {
                var earlierObject = earlierOp.objects[index];
                // merge in missing properties from earlier op
                _.forIn(earlierObject, (value, key) => {
                    if (object[key] === undefined) {
                        object[key] = value;
                    }
                });
                // indicate that the object has been superceded
                earlierOp.removed[index] = true;
            } else {
                // the prior operation has already been sent; if it's going
                // to yield a permanent database id, then this operation
                // needs to wait for it to resolve first
                dependent = true;
            }
        }
    });
    if (dependent) {
        // we need to replace the temporary ID with a permanent one before
        // this change is dispatch; otherwise multiple objects would be created
        var dependentPromise = earlierOp.promise.then(() => {
            _.each(this.objects, (object) => {
                if (object.id < 1) {
                    var id = earlierOp.findPermanentID(object.id);
                    if (id) {
                        object.id = id;
                    }
                }
            });
        }).catch((err) => {
            // if earlierOp failed, then presumably no new database row was
            // created; we could proceed as if the operation didn't happen
        });
        this.dependentPromises.push(dependentPromise);
    } else {
        // cancel the earlier op if everything was removed from it
        if (_.every(earlierOp.removed)) {
            earlierOp.cancel();
        }
    }
};

/**
 * Look for a permanent id that was assigned by remote server
 *
 * @param  {Number} temporaryID
 *
 * @return {Number|undefined}
 */
Change.prototype.findPermanentID = function(temporaryID) {
    var index = _.findIndex(this.delivered, { id: temporaryID });
    if (index !== -1) {
        if (this.received) {
            var object = this.received[index];
            if (object) {
                return object.id;
            }
        }
    }
};

/**
 * Apply changes to search results
 *
 * @param  {Object} search
 * @param  {Boolean} includeDeleted
 */
Change.prototype.apply = function(search, includeDeleted) {
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
                    // merge the new object with the original if the new one
                    // doesn't have everything
                    var originalObject = search.results[index];
                    var missingProperties = _.some(originalObject, (value, key) => {
                        if (!uncommittedObject.hasOwnProperty(key)) {
                            return true;
                        }
                    });
                    var tempObject;
                    if (missingProperties) {
                        tempObject = _.extend({}, originalObject, uncommittedObject);
                    } else {
                        tempObject = uncommittedObject;
                    }
                    search.results[index] = tempObject;
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
};

/**
 * Return data that should be sent to the server
 *
 * @return {Array<Object>}
 */
Change.prototype.deliverables = function() {
    this.delivered = _.filter(this.objects, (object, index) => {
        return !this.removed[index];
    });
    return _.map(this.delivered, (object) => {
        // strip out special properties
        if (object.id < 1) {
            return _.omit(object, 'id', 'uncommitted');
        } else {
            return _.omit(object, 'uncommitted')
        }
    });
};

/**
 * Remove deleted objects with temporary ids, returning true if there's
 * nothing left to be saved
 *
 * @return {Boolean}
 */
Change.prototype.noop = function() {
    this.objects = _.filter(this.objects, (object) => {
        if (object.deleted && object.id < 1) {
            return false;
        }
        return true;
    });
    return _.isEmpty(this.objects);
};

/**
 * Return true if location matches
 *
 * @param  {Object} location
 *
 * @return {Boolean}
 */
Change.prototype.matchLocation = function(location) {
    return _.isEqual(this.location, location);
}
