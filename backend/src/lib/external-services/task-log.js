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
    var taskLog = new TaskLog(server, action, options);
    taskLog.start();
    return taskLog;
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
            noop: false,
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

    this.id = null;
    this.completion = undefined;
    this.details = undefined;
    this.noop = true;
    this.unsaved = false;
    this.error = null;

    // monitor for system shutdown to ensure data is saved
    this.shutdownListener = () => {
        return this.save();
    };
    Shutdown.on(this.shutdownListener);
}

/**
 * Start logging a task
 */
TaskLog.prototype.start = function() {
    this.queue.schedule(() => {
        return Database.open().then((db) => {
            var columns = {
                server_id: _.get(this.server, 'id'),
                action: this.action,
                options: this.options,
            };
            return Task.insertOne(db, 'global', columns).then((task) => {
                this.id = task.id;
            });
        });
    });
};

/**
 * Record progress of task
 *
 * @param  {Number} completion
 * @param  {Object|undefined} details
 */
TaskLog.prototype.report = function(completion, details) {
    this.completion = completion;
    this.details = details;
    this.noop = false;
    this.unsaved = true;
    this.queue.schedule('log', this.frequency, () => {
        return Database.open().then((db) => {
            var columns = {
                id: this.id,
                completion,
                details,
            };
            return Task.updateOne(db, 'global', columns).then((task) => {
                console.log(`${task.action}: ${task.completion}%`);
                this.unsaved = false;
            });
        });
    });
};

/**
 * Preserved any unsaved progress info
 *
 * @return {Promise}
 */
TaskLog.prototype.save = function() {
    if (!this.unsaved) {
        return Promise.resolve();
    }
    return Database.open().then((db) => {
        var columns = {
            id: this.id,
            completion: this.completion,
            details: this.details,
        };
        return Task.updateOne(db, 'global', columns).then((task) => {
            this.unsaved = false;
        });
    });
};

/**
 * Record that the task is done
 */
TaskLog.prototype.finish = function(details) {
    // indicate we don't want to skip the call by omitting frequency
    this.queue.schedule('log', () => {
        Shutdown.off(this.shutdownListener);
        return Database.open().then((db) => {
            var columns = {
                id: this.id,
                completion: 100,
                details: (this.unsaved) ? this.details : undefined,
                etime: String('NOW()'),
            };
            return Task.updateOne(db, 'global', columns).then((task) => {
                console.log(`${task.action}: finished`);
                this.unsaved = false;
            });
        });
    });
};

/**
 * Record that the task failed to finish, probably due to an error
 *
 * @param  {Error|undefined} err
 */
TaskLog.prototype.abort = function(err) {
    this.error = err;
    this.queue.schedule('log', () => {
        Shutdown.off(this.shutdownListener);
        return Database.open().then((db) => {
            var details = _.clone(this.details) || {};
            var completion = this.completion;
            if (err) {
                details.error = _.pick(err, 'message', 'stack', 'code', 'statusCode');
            } else {
                if (!this.unsaved) {
                    // nothing to save
                    return;
                }
            }
            var columns = {
                id: this.id,
                failed: true,
                noop: this.noop,
                completion,
                details,
                etime: String('NOW()'),
            };
            return Task.updateOne(db, 'global', columns).then((task) => {
                console.log(`${task.action}: aborted`);
                this.unsaved = false;
            });
        });
    });
};
