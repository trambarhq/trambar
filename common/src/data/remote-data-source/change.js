import { delay } from '../../utils/delay.js';
import { isEqual } from '../../utils/object-utils.js';
import { promiseSelf } from '../../utils/promise-self.js';

import { matchSearchCriteria } from '../local-search.js';
import { allocateTempoaryID } from './temporary-id.js';

export class Change {
  constructor(location, objects, options) {
    this.location = location;
    this.objects = objects.map((object) => {
      if (!object.uncommitted) {
        object = { ...object, uncommitted: true };
        if (!object.id) {
          // assign a temporary id so we can find the object again
          object.id = allocateTempoaryID();
        }
      }
      return object;
    });
    this.removed = objects.map(obj => false);
    this.dispatched = false;
    this.delayed = false;
    this.dispatching = false;
    this.committed = false;
    this.canceled = false;
    this.timeout = 0;
    this.promise = promiseSelf();
    this.dependentPromises = [];
    this.delivered = null;
    this.received = null;
    this.error = null;
    this.time = null;

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
  }

  /**
   * Send a pending change to remote server by triggering the attached
   * onDispatch handler
   */
  async dispatch() {
    if (this.dispatched || this.canceled) {
      // already sent or canceled
      return;
    }
    if (this.delayed) {
      // wait for timeout to fire
      this.dispatching = true;
      return;
    }
    if (this.dependentPromises.length > 0) {
      await Promise.all(this.dependentPromises);
    }
    let retryInterval = 1000;
    while (!this.canceled) {
      this.dispatched = true;

      try {
        const objects = await this.onDispatch(this);
        this.committed = true;
        this.received = objects;
        this.time = new Date;
        if (!this.canceled) {
          this.promise.resolve(objects);
        } else {
          // ignore the results
          this.promise.resolve([]);
        }
        return;
      } catch (err) {
        let unrecoverable = false;
        if (err.statusCode >= 400 && err.statusCode <= 499) {
          unrecoverable = true;
        } else if (err instanceof TypeError) {
          unrecoverable = true;
        }
        if (unrecoverable) {
          this.error = err;
          this.promise.reject(err);
          this.canceled = true;
        } else {
          this.dispatched = false;
          // wait a bit then try again
          retryInterval = Math.min(retryInterval * 2, 10 * 1000);
          await delay(retryInterval);
          if (this.canceled) {
            this.promise.resolve([]);
            return;
          }
        }
      }
    }
  }

  /**
   * Cancel a change
   */
  cancel() {
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
    this.promise.resolve([]);
  }

  /**
   * Incorporate changes from an earlier operation
   *
   * @param  {Object} earlierOp
   */
  merge(earlierOp) {
    if (!isEqual(earlierOp.location, this.location)) {
      return;
    }
    try {
      let dependent = false;
      for (let object of this.objects) {
        const index = earlierOp.objects.findIndex(obj => obj.id === object.id);
        if (index !== -1 && !earlierOp.removed[index]) {
          if (!earlierOp.dispatched || object.id >= 1) {
            const earlierObject = earlierOp.objects[index];
            // merge in missing properties from earlier op
            for (let [ key, value ] of Object.entries(earlierObject)) {
              if (object[key] === undefined) {
                object[key] = value;
              }
            }
            // indicate that the object has been superceded
            earlierOp.removed[index] = true;
          } else {
            // the prior operation has already been sent; if it's going
            // to yield a permanent database id, then this operation
            // needs to wait for it to resolve first
            dependent = true;
            break;
          }
        }
      }
      if (dependent) {
        // we need to replace the temporary ID with a permanent one before
        // this change is dispatch; otherwise multiple objects would be created
        const dependentPromise = this.acquirePermanentIDs(earlierOp);
        this.dependentPromises.push(dependentPromise);
      } else {
        // cancel the earlier op if everything was removed from it
        if (!earlierOp.removed.includes(false)) {
          earlierOp.cancel();
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  /**
   * Wait for earlier op to finish and obtain permanent IDs from its results
   *
   * @param  {Change}  earlierOp
   *
   * @return {Promise}
   */
  async acquirePermanentIDs(earlierOp) {
    try {
      await earlierOp.promise;
      for (let object of this.objects) {
        if (object.id < 1) {
          let id = earlierOp.findPermanentID(object.id);
          if (id) {
            object.id = id;
          }
        }
      }
    } catch (err) {
      // if earlierOp failed, then presumably no new database row was
      // created; we could proceed as if the operation didn't happen
    }
  }

  /**
   * Look for a permanent id that was assigned by remote server
   *
   * @param  {Number} temporaryID
   *
   * @return {Number|undefined}
   */
  findPermanentID(temporaryID) {
    const index = this.delivered.findIndex(obj => obj.id === temporaryID);
    if (index !== -1) {
      if (this.received) {
        let object = this.received[index];
        if (object) {
          return object.id;
        }
      }
    }
  }

  /**
   * Apply changes to search results
   *
   * @param  {Object} search
   * @param  {Boolean} includeDeleted
   */
  apply(search, includeDeleted) {
    if (this.canceled) {
      return;
    }
    for (let [ i, uncommittedObject ] of Object.entries(this.objects)) {
      if (this.removed[i]) {
        continue;
      }
      const index = search.results.findIndex(obj => obj.id === uncommittedObject.id);
      if (index !== -1) {
        if (uncommittedObject.deleted && !includeDeleted) {
          search.results.splice(index, 1);
        } else {
          const match = matchSearchCriteria(search.table, uncommittedObject, search.criteria);
          if (match) {
            // merge the new object with the original if the new one
            // doesn't have everything
            const originalObject = search.results[index];
            let missingProperties = false;
            for (let [ key, value ] of Object.entries(originalObject)) {
              if (!uncommittedObject.hasOwnProperty(key)) {
                missingProperties = true;
                break;
              }
            }
            let tempObject;
            if (missingProperties) {
              tempObject = { ...originalObject, ...uncommittedObject };
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
          const match = matchSearchCriteria(search.table, uncommittedObject, search.criteria);
          if (match) {
            search.results.push(uncommittedObject);
          }
        }
      }
    }
  }

  /**
   * Return data that should be sent to the server
   *
   * @return {Array<Object>}
   */
  deliverables() {
    this.delivered = this.objects.filter((object, index) => {
      return !this.removed[index];
    });
    return this.delivered;
  }

  /**
   * Remove deleted objects with temporary ids, returning true if there's
   * nothing left to be saved
   *
   * @return {Boolean}
   */
  noop() {
    if (this.dependentPromises.length > 0) {
      // an earlier operation has already been dispatched--we can't
      // drop this one since a new object will be created
      return false;
    }
    this.objects = this.objects.filter((object) => {
      if (object.deleted && object.id < 1) {
        return false;
      }
      return true;
    });
    return (this.objects.length === 0);
  }

  /**
   * Return true if location matches
   *
   * @param  {Object} other
   *
   * @return {Boolean}
   */
  matchLocation(other) {
    if (this.location.address !== other.address) {
      return false;
    }
    if (this.location.schema !== other.schema) {
      return false;
    }
    if (this.location.table !== other.table) {
      return false;
    }
    return true;
  }
}
