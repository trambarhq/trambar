import _ from 'lodash';

export class Operation {
  constructor(location) {
    const byComponent = _.get(location, 'by.constructor.displayName')
    if (location.schema !== 'local') {
      this.address =  location.address;
    }
    this.local = (location.schema === 'local');
    this.schema = location.schema;
    this.table = location.table;
    this.canceled = false;
    this.failed = false;
    this.error = null;
    this.startTime = null;
    this.finishTime = null;
    this.results = [];
    this.by = (byComponent) ? [ byComponent ] : [];
  }

  /**
   * Obtain a location object
   *
   * @return {Object}
   */
  getLocation() {
    if (this.local) {
      return _.pick(this, 'schema', 'table');
    } else {
      return _.pick(this, 'address', 'schema', 'table');
    }
  }

  /**
   * Check if the other object has the same location
   *
   * @param  {Object} other
   *
   * @return {Boolean}
   */
  matchLocation(other) {
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
  }

  /**
   * Set the start time of the operation to the current time
   */
  start() {
    const now = new Date;
    this.startTime = now.toISOString();
  }

  /**
   * Set the results, finish time, and the duration of the operation
   *
   * @param  {Array<Object>} results
   */
  finish(results) {
    const then = new Date(this.startTime);
    const now = new Date;
    if (results) {
      this.results = results;
    }
    this.finishTime = now.toISOString();
    this.duration = now - then;
  }

  /**
   * Mark the operation as canceled
   */
  cancel() {
    this.canceled = true;
  }

  /**
   * Mark the operation as failed
   *
   * @param  {Error} err
   */
  fail(err) {
    this.finish(undefined);
    this.failed = true;
    this.error = err;
  }

  /**
   * Return the number of seconds since the operation finished
   *
   * @return {Number}
   */
  getTimeElapsed() {
    const then = new Date(this.finishTime);
    const now = new Date;
    return (now - then) * (1 / 1000);
  }
}
