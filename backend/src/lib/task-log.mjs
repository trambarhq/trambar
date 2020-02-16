import _ from 'lodash';
import Moment from 'moment';
import Database from './database.mjs';
import * as RevertibleConsole from './revertible-console.mjs';
import * as Shutdown from './shutdown.mjs';
import HTTPError from './common/errors/http-error.mjs';

import Task from './accessors/task.mjs';

/**
 * Start a task log
 *
 * @param  {String} action
 * @param  {Object|undefined} options
 *
 * @return {TaskLog}
 */
function start(action, options) {
  return new TaskLog(action, options || {});
}

const taskLogHash = {};

/**
 * Obtain a task that was created earlier
 *
 * @param  {String} schema
 * @param  {String} token
 * @param  {String} action
 *
 * @return {TaskLog}
 */
async function obtain(schema, token, action) {
  const db = await Database.open();
  const task = await Task.findOne(db, schema, { token }, 'id, options, action');
  if (!task || task.action !== action) {
    throw new HTTPError(403);
  }
  const loadedTaskLog = _.get(taskLogHash, [ schema, token ]);
  if (loadedTaskLog) {
    return loadedTaskLog;
  }
  const newTaskLog = new TaskLog(action, {
    saving: true,
    database: { schema, id, token },
    multiparts: task.options,
  });
  _.set(taskLogHash, [ schema, token ], newTaskLog);
  return newTaskLog;
}

/**
 * Return the last task
 *
 * @param  {String} action
 * @param  {Object|undefined} options
 *
 * @return {Promise<Task|null>}
 */
async function last(action, options) {
  const db = await Database.open();
  const criteria = {
    action,
    options,
    noop: false,
    order: 'id DESC',
    limit: 1,
  };
  return Task.findOne(db, 'global', criteria, '*');
}

class TaskLog {
  /**
   * @param  {String} action
   * @param  {Object|undefined} options
   *
   * @constructor
   */
  constructor(action, options) {
    const { clearing, saving, multiparts, database, ...taskOptions } = options;
    this.action = action;
    this.options = taskOptions;
    this.clearing = clearing;
    this.saving = saving;
    this.multiparts = multiparts;
    this.schema = (database) ? database.schema : 'global';
    this.id = (database) ? database.id : undefined;
    this.token = (database) ? database.token : undefined;

    this.completion = undefined;
    this.details = {};
    this.noop = true;
    this.saved = false;
    this.error = null;
    this.startTime = Moment();
    this.finished = false;
    this.aborted = false;
    this.endTime = undefined;
    this.saveTime = null;
    this.saveTimeout = 0;
    this.description = null;

    // monitor for system shutdown to ensure data is saved
    this.shutdownListener = () => {
      if (!this.noop) {
        if (!this.saved) {
          if (!this.finished || !this.aborted) {
            this.error = new Error('Interrupted by shutdown');
            this.aborted = true;
          }
          clearTimeout(this.saveTimeout);
          return this.save();
        }
      }
    };
    Shutdown.addListener(this.shutdownListener);
  }

  /**
   * Set details about task
   *
   * @param  {path} current
   * @param  {Number} total
   */
  set(path, value) {
    _.set(this.details, path, value);
    this.noop = false;
    this.saved = false;
  }

  /**
   * Merge in task details
   *
   * @param  {Object} values
   */
  merge(values) {
    _.assign(this.details, values);
    this.noop = false;
    this.saved = false;
  }

  /**
   * Add an item to details
   *
   * @param  {path} current
   * @param  {Number} total
   */
  append(path, item) {
    const array = _.get(this.details, path, []);
    array.push(item);
    this.set(path, array);
  }

  /**
   * Attach description of what's happening
   *
   * @param  {String} text
   */
  describe(text) {
    this.description = text;
    this.output(false);
  }

  /**
   * Record progress of task
   *
   * @param  {Number} current
   * @param  {Number} total
   */
  report(current, total) {
    if (total === undefined) {
      total = 100;
    }
    this.completion = (total > 0) ? Math.round(current / total * 100) : 0;
    this.saved = false;
    this.output(false);

    // initiate autosave
    const now = new Date;
    if (!this.saveTimeout || !this.saveTime || (now - this.saveTime) < 5000) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = setTimeout(async () => {
        await this.save();
      }, 1500);
    }
  }

  /**
   * Record that the task is done
   *
   * @param  {String} part
   *
   * @return {Promise}
   */
  async finish(part) {
    if (this.aborted && this.finished) {
      return;
    }
    if (this.multiparts) {
      if (_.has(this.multiparts, part)) {
        this.multiparts[part] = true;
        if (_.every(this.multiparts)) {
          this.finished = true;
          this.completion = 100;
        }
      }
    } else {
      this.finished = true;
      this.completion = 100;
    }
    this.saved = false;
    this.endTime = Moment();
    clearTimeout(this.saveTimeout);
    Shutdown.removeListener(this.shutdownListener);
    await this.save();
    if (this.finished) {
      if (!this.clearing || this.error || !this.noop) {
        this.output(true);
      } else {
        RevertibleConsole.revert();
      }
      if (this.token) {
        _.unset(taskLogHash, [ this.schema, this.token ]);
      }
    } else {
      this.output(false);
    }
  }

  /**
   * Record that the task failed to finish, probably due to an error
   *
   * @param  {Error|undefined} err
   *
   * @return {Promise}
   */
  async abort(err) {
    if (this.aborted && this.finished) {
      return;
    }
    this.error = err;
    this.aborted = true;
    this.saved = false;
    this.endTime = Moment();
    clearTimeout(this.saveTimeout);
    Shutdown.removeListener(this.shutdownListener);
    const task = await this.save();
    this.output(true);
    if (this.token) {
      _.unset(taskLogHash, [ this.schema, this.token ]);
    }
  }

  /**
   * Preserved any unsaved progress info
   *
   * @return {Promise<Task|null>}
   */
  async save() {
    if (!this.saving) {
      return null;
    }
    if (this.noop && !this.aborted) {
      return null;
    }
    const db = await Database.open();
    const columns = {};
    if (!this.id) {
      columns.action = this.action;
      columns.options = this.options;
    } else {
      columns.id = this.id;
    }
    columns.completion = this.completion;
    if (this.error) {
      const errorProps = _.pick(this.error, 'message', 'stack', 'code', 'statusCode', 'reason');
      columns.details = { ...this.details, error: errorProps };
    } else {
      columns.details  = this.details;
    }
    if (this.multiparts) {
      columns.options = this.multiparts;
    }
    columns.failed = this.aborted;
    if (this.finished) {
      columns.etime = String('NOW()');
    }
    const taskAfter = await Task.saveOne(db, this.schema, columns);
    this.id = taskAfter.id;
    this.saved = true;
    this.saveTime = Moment();
    this.saveTimeout = 0;
  }

  output(commit) {
    const stime = `[${this.startTime.toISOString()}]`;
    const etime = `[${(this.endTime || Moment()).toISOString()}]`;
    const blank = _.repeat('·', etime.length);
    RevertibleConsole.revert();
    const status = this.formatStatus();
    const options = this.formatOptions();
    RevertibleConsole.write(`${stime} ${this.action}${options} - ${status}`);
    const lines = this.formatDescription();
    for (let [ index, line ] of lines.entries()) {
      if (index === lines.length - 1) {
        RevertibleConsole.write(`${etime}   ${line}`);
      } else {
        RevertibleConsole.write(`${blank}   ${line}`);
      }
    }
    if (commit) {
      RevertibleConsole.commit();
    }
  }

  formatStatus() {
    if (this.aborted) {
      return 'ERROR';
    } else if (this.finished) {
      return (this.noop) ? 'NOOP' : 'DONE';
    } else {
      if (this.completion === undefined) {
        return 'BUSY';
      } else {
        return this.completion + '%';
      }
    }
  }

  formatOptions() {
    const pairs = [];
    for (let [ name, value ] of _.entries(this.options)) {
      if (/_id$/.test(name)) {
        // don't list the id if a name is provided
        if (this.options[name.slice(0, -3)]) {
          continue;
        }
      }
      if (value !== undefined) {
        pairs.push(`${name}: ${value}`);
      }
    }
    if (pairs.length > 0) {
      return ` (${pairs.join(', ')})`;
    } else if (this.token) {
      return ` (token: ${this.token})`;
    } else {
      return '';
    }
  }

  formatDescription() {
    let lines = [];
    if (this.aborted) {
      if (this.error) {
        if (process.env.NODE_ENV === 'production') {
          lines = this.error.message;
        } else {
          lines = this.error.stack;
        }
      }
    } else if (this.finished) {
      const keys = _.sortBy(_.keys(this.details));
      for (let key of keys) {
        const value = this.details[key];
        const items = (value instanceof Array) ? value : [ value ];
        const list = _.map(items, (item) => {
          if (item instanceof Array) {
            return '[…]';
          } else if (item instanceof Object) {
            return '{…}';
          } else {
            return item + '';
          }
        });
        const text = list.join(', ');
        if (text.length <= 40) {
          lines.push(`${key}: ${text}`);
        } else {
          const blank = _.repeat(' ', key.length + 2);
          for (let [ index, item ] of list.entries()) {
            const label = (index === 0) ? `${key}: ` : blank;
            lines.push(label + item);
          }
        }
      }
    } else {
      if (this.description) {
        lines = this.description;
      }
    }
    if (typeof(lines) === 'string') {
      lines = _.split(lines, '\n');
    }
    return lines;
  }
}

export {
  start,
  obtain,
  last,
};
