export class Operation {
  constructor(location) {
    const byComponent = location.by?.constructor?.name;
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
    const { local, address, schema, table } = this;
    if (local) {
      return { schema, table };
    } else {
      return { address, schema, table };
    }
  }

  /**
   * Check if the other object has the same location
   *
   * @param  {Object} other
   *
   * @return {boolean}
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
   * @param  {Object[]} results
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
   * @return {number}
   */
  getTimeElapsed() {
    const then = new Date(this.finishTime);
    const now = new Date;
    return (now - then) * (1 / 1000);
  }
}
