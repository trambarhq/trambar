var _ = require('lodash');
var Promise = require('bluebird');
var Database = require('database');
var Shutdown = require('shutdown');
var TaskQueue = require('utils/task-queue');

var Task = require('accessors/task');

exports.start = start;
exports.last = last;

/**
 * Start a task log
 *
 * @param  {Server} server
 * @param  {String} action
 * @param  {Object|undefined} options
 *
 * @return {TaskLog}
 */
function start(server, action, options) {
    return new TaskLog(server, action, options);
}

/**
 * Return the last task
 *
 * @param  {Server} server
 * @param  {String} action
 *
 * @return {Promise<Task|null>}
 */
function last(server, action) {
    return Database.open().then((db) => {
        var criteria = {
            action,
            server_id: _.get(server, 'id'),
            order: 'id DESC',
            limit: 1,
        };
        return Task.findOne(db, 'global', criteria, '*');
    });
}

/**
 * @param  {Server} server
 * @param  {String} action
 * @param  {Object|undefined} options
 *
 * @constructor
 */
function TaskLog(server, action, options) {
    this.server = server;
    this.action = action;
    this.options = options;

    // call scheduled later override those scheduled earlier
    this.queue = new TaskQueue({ overriding: true });
    this.frequency = '1 second';

    this.id = undefined;
    this.completion = undefined;
    this.details = undefined;
    this.noop = true;
    this.saved = false;
    this.saving = false;
    this.error = null;

    // monitor for system shutdown to ensure data is saved
    this.shutdownListener = () => {
        if (!this.saved) {
            this.queue.clear();
            return this.save();
        } else {
            return this.savePromise;
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
TaskLog.prototype.report = function(current, total, details) {
    this.completion = (total > 0) ? Math.round(current / total * 100) : 0;
    this.details = details;
    this.noop = false;
    this.saved = false;
    this.queue.schedule('log', this.frequency, () => {
        return this.save();
    });
};

/**
 * Record that the task is done
 */
TaskLog.prototype.finish = function() {
    if (this.completion === 100 && this.saved) {
        // already has the right values
        return;
    }
    // indicate we don't want to skip the call by omitting frequency
    this.completion = 100;
    this.saved = false;
    this.queue.schedule('log', () => {
        Shutdown.off(this.shutdownListener);
        return this.save();
    });
};

/**
 * Record that the task failed to finish, probably due to an error
 *
 * @param  {Error|undefined} err
 */
TaskLog.prototype.abort = function(err) {
    this.error = err;
    this.details = _.clone(this.details) || {};
    this.details.error = _.pick(err, 'message', 'stack', 'code', 'statusCode');
    this.failed = true;
    this.saved = false;
    this.queue.schedule('log', () => {
        Shutdown.off(this.shutdownListener);
        return this.save();
    });
};

/**
 * Preserved any unsaved progress info
 *
 * @return {Promise<Task|null>}
 */
TaskLog.prototype.save = function() {
    this.savePromise = Database.open().then((db) => {
        if (this.noop && !this.failed) {
            return null;
        }
        var columns = {};
        if (!this.id) {
            columns.server_id = _.get(this.server, 'id');
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
        return Task.saveOne(db, 'global', columns).then((task) => {
            this.id = task.id;
            this.saved = true;
        });
    }).tap(() => {
        var state = ''
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
    });
    return this.savePromise;
};
