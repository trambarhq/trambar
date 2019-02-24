import _ from 'lodash';
import Database from 'database';
import * as Shutdown from 'shutdown';

import Task from 'accessors/task';

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
    let db = await Database.open();
    let criteria = {
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
        this.action = action;
        this.options = options;

        this.id = undefined;
        this.completion = undefined;
        this.details = undefined;
        this.noop = true;
        this.saved = false;
        this.saving = false;
        this.error = null;
        this.saveTimeout = 0;
        this.saveTime = null;

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
     * Record progress of task
     *
     * @param  {Number} current
     * @param  {Number} total
     * @param  {Object|undefined} details
     */
    report(current, total, details) {
        this.completion = (total > 0) ? Math.round(current / total * 100) : 0;
        this.details = details;
        this.noop = false;
        this.saved = false;

        let now = new Date;
        if (!this.saveTimeout || !this.saveTime || (now - this.saveTime) < 5000) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = setTimeout(() => {
                this.save();
            }, 1500);
        }
    };

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
        clearTimeout(this.saveTimeout);
        Shutdown.off(this.shutdownListener);
        return this.save();
    };

    /**
     * Record that the task failed to finish, probably due to an error
     *
     * @param  {Error|undefined} err
     *
     * @return {Promise}
     */
    async abort(err) {
        this.error = err;
        this.details = _.clone(this.details) || {};
        this.details.error = _.pick(err, 'message', 'stack', 'code', 'statusCode', 'reason');
        this.failed = true;
        this.saved = false;
        clearTimeout(this.saveTimeout);
        Shutdown.off(this.shutdownListener);
        console.error(err);
        return this.save();
    };

    /**
     * Preserved any unsaved progress info
     *
     * @return {Promise<Task|null>}
     */
    async save() {
        if (this.noop && !this.failed) {
            return null;
        }
        let db = await Database.open();
        let columns = {};
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
        let task = await Task.saveOne(db, 'global', columns);
        this.id = task.id;
        this.saved = true;
        this.saveTime = new Date;
        this.saveTimeout = 0;

        let state = ''
        if (this.completion < 100) {
            if (this.failed) {
                state = 'aborted';
            } else {
                state = `${this.completion}%`;
            }
        } else {
            state = 'finished';
        }
        console.log(`[${this.id || 'NOP'}] ${this.action}: ${state}`);
    }
}

export {
    start,
    last,
};
