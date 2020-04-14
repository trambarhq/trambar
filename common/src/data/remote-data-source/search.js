import { Operation } from './operation.js';
import { sortedIndexBy } from '../../utils/array-utils.js';
import { isEqual } from '../../utils/object-utils.js';

export class Search extends Operation {
  constructor(query) {
    super(query);
    if (query) {
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
  }

  clone() {
    const newSearch = new Search;
    Object.assign(newSearch, this);
    newSearch.results = newSearch.results.slice();
    return newSearch;
  }

  /**
   * Obtain a query object
   *
   * @return {Object}
   */
  getQuery() {
    const { address, schema, table, criteria } = this;
    return { address, schema, table, criteria };
  }

  /**
   * Return true if other object is the same search
   *
   * @param  {Object} other
   *
   * @return {boolean}
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
   * @return {boolean}
   */
  matchCriteria(other) {
    return isEqual(this.criteria, other.criteria);
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
   * @param  {number} refreshInterval
   *
   * @return {boolean}
   */
  isSufficientlyRecent(refreshInterval) {
    if (this.local) {
      return true;
    }
    if (this.invalid) {
      return false;
    }
    let minRetrievalTime = '?';
    for (let object of this.results) {
      if (object.rtime < minRetrievalTime) {
        minRetrievalTime = object.rtime;
      }
    }
    const then = new Date(minRetrievalTime);
    const now = new Date;
    // see how much time has elapsed since the object was retrieved/last verified
    const elapsed = (now - then) * (1 / 1000);
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
   * @param  {number} refreshInterval
   *
   * @return {boolean}
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
    const elapsed = this.getTimeElapsed();
    if (elapsed > refreshInterval) {
      return false;
    }
    return true;
  }

  /**
   * Check if there're enough cached records to warrant displaying them
   * while a remote search at takes place
   *
   * @return {boolean}
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
   * @return {boolean}
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
   * @param  {number[]} ids
   * @param  {number[]} gns
   *
   * @return {number[]}
   */
  getUpdateList(ids, gns) {
    const objects = (this.invalid || !this.results) ? [] : this.results;
    const updated = [];
    for (let [ i, id ] of ids.entries()) {
      const gn = gns[i];
      const index = sortedIndexBy(objects, { id }, 'id');
      const object = (objects) ? objects[index] : null;
      if (!object || object.id !== id || object.gn !== gn) {
        updated.push(id);
      }
    }
    return updated;
  }

  /**
   * Return ids of objects that aren't found in the list provided
   *
   * @param  {number[]} ids
   *
   * @return {number[]}
   */
  getRemovalList(ids) {
    const objects = (!this.results) ? [] : this.results;
    const removal = [];
    for (let object of objects) {
      if (!ids.includes(object.id)) {
        removal.push(object.id);
      }
    }
    return removal;
  }

  /**
   * Given a list of ids, return the ids that are missing from the current results
   *
   * @param  {number[]} ids
   *
   * @return {number[]}
   */
  getFetchList(ids) {
    const objects = (this.invalid) ? [] : this.results;
    const updated = [];
    for (let id of ids) {
      const index = sortedIndexBy(objects, { id }, 'id');
      const object = (objects) ? objects[index] : null;
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
    const previousResults = this.results || [];
    super.finish(results);

    this.dirty = false;
    this.invalid = false;
    this.updating = false;
    this.initial = false;

    if (this.results !== previousResults) {
      const missingResults = [];
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
          const index = sortedIndexBy(results, object, 'id');
          const target = results[index];
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
 * @param  {string} name
 *
 * @return {number|undefined}
 */
function countCriteria(criteria, name) {
  if (criteria) {
    const value = criteria[name];
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
    const dst = [];
    for (let value of object) {
      if (value !== undefined) {
        if (value instanceof Object) {
          value = removeUndefined(value);
        }
        dst.push(value);
      }
    }
    return dst;
  } else if (object instanceof Object) {
    const dst = {};
    for (let [ key, value ] of Object.entries(object)) {
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
  const dst = {};
  for (let [ name, value ] of Object.entries(criteria)) {
    if (value instanceof Array) {
      if (/(^|_)ids?$/.test(name)) {
        value = value.filter((v) => {
          if (typeof(v) === 'number') {
            if (v < 1) {
              return false;
            }
          }
          return true;
        });
      }
    }
    dst[name] = value;
  }
  return dst;
}
