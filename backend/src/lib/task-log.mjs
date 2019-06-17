import _ from 'lodash';
import Moment from 'moment';
import Database from './database.mjs';
import * as RevertibleConsole from './revertible-console.mjs';
import * as Shutdown from './shutdown.mjs';

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
    return new TaskLog(action, options);
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
        const { preserving, saving, ...taskOptions } = options;
        this.action = action;
        this.options = taskOptions;
        this.preserving = preserving;
        this.saving = saving;

        this.id = undefined;
        this.completion = undefined;
        this.details = {};
        this.noop = true;
        this.saved = false;
        this.saving = false;
        this.error = null;
        this.startTime = Moment();
        this.endTime = undefined;
        this.saveTime = null;
        this.saveTimeout = 0;
        this.description = null;

        // monitor for system shutdown to ensure data is saved
        this.shutdownListener = () => {
            if (!this.noop) {
                if (!this.saved) {
                    if (this.completion !== 100) {
                        this.error = new Error('Interrupted by shutdown');
                        this.details.error = _.pick(this.error, 'message');
                        this.failed = true;
                    }
                    clearTimeout(this.saveTimeout);
                    return this.save();
                }
            }
        };
        Shutdown.on(this.shutdownListener);
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
     * @return {Promise}
     */
    async finish() {
        if (this.completion === 100 && this.saved) {
            // already has the right values
            return null;
        }
        this.completion = 100;
        this.saved = false;
        this.endTime = Moment();
        clearTimeout(this.saveTimeout);
        Shutdown.off(this.shutdownListener);
        await this.save();
        if (this.preserving || this.error || !this.noop) {
            this.output(true);
        } else {
            RevertibleConsole.revert();
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
        this.error = err;
        this.details = { ...this.details };
        this.details.error = _.pick(err, 'message', 'stack', 'code', 'statusCode', 'reason');
        this.failed = true;
        this.saved = false;
        this.endTime = Moment();
        clearTimeout(this.saveTimeout);
        Shutdown.off(this.shutdownListener);
        console.error(err);
        await this.save();
        this.output(true);
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
        if (this.noop && !this.failed) {
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
        columns.details  = this.details;
        columns.failed = this.failed;
        if (this.completion === 100) {
            columns.etime = String('NOW()');
        }
        const task = await Task.saveOne(db, 'global', columns);
        this.id = task.id;
        this.saved = true;
        this.saveTime = Moment();
        this.saveTimeout = 0;
    }

    output(commit) {
        const stime = this.startTime.toISOString();
        const etime = (this.endTime || Moment()).toISOString();
        const blank = _.repeat(' ', etime.length);
        RevertibleConsole.revert();
        const status = this.formatStatus();
        const options = this.formatOptions();
        RevertibleConsole.write(`[${stime}] ${this.action}${options} - ${status}`);
        const lines = this.formatDescription();
        for (let [ index, line ] of lines.entries()) {
            if (index === lines.length - 1) {
                RevertibleConsole.write(`[${etime}]     ${line}`);
            } else {
                RevertibleConsole.write(` ${blank}      ${line}`);
            }
        }
        if (commit) {
            RevertibleConsole.commit();
        }
    }

    formatStatus() {
        if (this.failed) {
            return 'ERROR';
        } else if (this.completion === 100) {
            return (this.noop) ? 'NOOP' : 'DONE';
        } else {
            if (this.completion === undefined) {
                return 'RUNNING';
            } else {
                return this.completion + '%';
            }
        }
    }

    formatOptions() {
        const pairs = [];
        for (let [ name, value ] of _.entries(this.options)) {
            if (!/_id$/.test(name)) {
                pairs.push(`${name}: ${value}`);
            }
        }
        return (pairs.length > 0) ? ` (${pairs.join(', ')})` : '';
    }

    formatDescription() {
        let lines = [];
        if (this.failed) {
            if (this.error) {
                if (process.env.NODE_ENV === 'production') {
                    lines = this.error.message;
                } else {
                    lines = this.error.stack;
                }
            }
        } else if (this.completion === 100) {
            const keys = _.sortBy(_.keys(this.details));
            for (let key of keys) {
                const value = this.details[key];
                if (value instanceof Array) {
                    lines.push(`${key}: ${value.join(', ')}`);
                } else {
                    lines.push(`${key}: ${value}`);
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
    last,
};
