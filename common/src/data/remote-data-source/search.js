import _ from 'lodash';
import Operation from 'data/remote-data-source/operation';

class Search extends Operation {
    constructor(query) {
        super(query);
        this.criteria = query.criteria || {};
        this.remote = query.remote || false;
        this.dirty = false;
        this.invalid = false;
        this.signature = '';
        this.notifying = false;
        this.failed = false;
        this.initial = true;
        this.updating = false;
        this.lastRetrieved = 0;
        this.results = undefined;
        this.missingResults = [];
        this.localSearchPromise = null;
        this.remoteSearchPromise = null;

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
        this.criteria = removeTemporaryIDs(this.criteria);
    }

    /**
     * Obtain a query object
     *
     * @return {Object}
     */
    getQuery() {
        return _.pick(this, 'address', 'schema', 'table', 'criteria');
    }

    /**
     * Return true if other object is the same search
     *
     * @param  {Object} other
     *
     * @return {Boolean}
     */
    match(other) {
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
    }

    /**
     * Return true if other object has the same criteria
     *
     * @param  {Object} other
     *
     * @return {Boolean}
     */
    matchCriteria(other) {
        return _.isEqual(this.criteria, other.criteria);
    }

    matchOptions(other) {
        if (this.remote !== other.remote) {
            return false;
        }
        return true;
    }

    /**
     * Check if cached objects are retrieved so long enough ago that a
     * server-side search is advisable
     *
     * @param  {Number} refreshInterval
     *
     * @return {Boolean}
     */
    isSufficientlyRecent(refreshInterval) {
        if (this.local) {
            return true;
        }
        if (this.invalid) {
            return false;
        }
        let rtimes = _.map(this.results, 'rtime');
        let minRetrievalTime = _.min(rtimes);
        let then = new Date(minRetrievalTime);
        let now = new Date;
        // see how much time has elapsed since the object was retrieved/last verified
        let elapsed = (now - then) * (1 / 1000);
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
    isFresh(refreshInterval) {
        if (this.schema === 'local') {
            return true;
        }
        // we received a notification earlier indicate changes might have occurred
        if (this.dirty) {
            return false;
        }
        // the result hasn't been invalidated via notification
        // still, we want to check with the server once in a while
        let elapsed = this.getTimeElapsed();
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
    isSufficientlyCached() {
        if (!this.results) {
            return false;
        }
        if (this.minimum == undefined) {
            return false;
        }
        if (this.results.length < this.minimum) {
            return false;
        }
        return true;
    }

    /**
     * Check if the number of object retrieved from cache meet expectation
     *
     * @return {Boolean}
     */
    isMeetingExpectation() {
        if (!this.results) {
            return false;
        }
        if (this.results.length !== this.expected) {
            return false;
        }
        return true;
    }

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
    getUpdateList(ids, gns) {
        let objects = (this.invalid || !this.results) ? [] : this.results;
        let updated = [];
        for (let [ i, id ] of ids.entries()) {
            let gn = gns[i];
            let index = _.sortedIndexBy(objects, { id }, 'id');
            let object = (objects) ? objects[index] : null;
            if (!object || object.id !== id || object.gn !== gn) {
                updated.push(id);
            }
        }
        return updated;
    }

    /**
     * Return ids of objects that aren't found in the list provided
     *
     * @param  {Array<Number>} ids
     *
     * @return {Array<Number>}
     */
    getRemovalList(ids) {
        let objects = (!this.results) ? [] : this.results;
        let removal = [];
        for (let object of objects) {
            if (!_.includes(ids, object.id)) {
                removal.push(object.id);
            }
        }
        return removal;
    }

    /**
     * Given a list of ids, return the ids that are missing from the current results
     *
     * @param  {Array<Number>} ids
     *
     * @return {Array<Number>}
     */
    getFetchList(ids) {
        let objects = (this.invalid) ? [] : this.results;
        let updated = [];
        for (let id of ids) {
            let index = _.sortedIndexBy(objects, { id }, 'id');
            let object = (objects) ? objects[index] : null;
            if (!object || object.id !== id) {
                updated.push(id);
            }
        }
        return updated;
    }

    start() {
        super.start();
        this.updating = true;
    }

    finish(results) {
        let previousResults = this.results || [];
        super.finish(results);

        this.dirty = false;
        this.invalid = false;
        this.updating = false;
        this.initial = false;

        if (this.results !== previousResults) {
            let missingResults = [];
            let newlyRetrieved = 0;

            if (results) {
                // update rtime of results
                for (let object of this.results) {
                    if (!object.rtime) {
                        newlyRetrieved++;
                    }
                    object.rtime = this.finishTime;
                }

                // if an object that we found before is no longer there, then
                // it's either deleted or changed in such a way that it longer
                // meets the criteria; in both scenarios, the local copy has
                // become stale and should be removed from cache
                for (let object of previousResults) {
                    let index = _.sortedIndexBy(results, object, 'id');
                    let target = results[index];
                    if (!target || target.id !== object.id) {
                        missingResults.push(object);
                    }
                }
            }
            this.missingResults = missingResults;
            this.lastRetrieved = newlyRetrieved;
        }
    }
}

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
        let value = criteria[name];
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
        let dst = [];
        for (let i = 0; i < object.length; i++) {
            let value = object[i];
            if (value !== undefined) {
                if (value instanceof Object) {
                    value = removeUndefined(value);
                }
                dst.push(value);
            }
        }
        return dst;
    } else if (object instanceof Object) {
        let dst = {};
        for (let key in object) {
            let value = object[key];
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
function removeTemporaryIDs(criteria) {
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

export {
    Search as default,
    Search,
};
