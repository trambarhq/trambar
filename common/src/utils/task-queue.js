var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');

module.exports = TaskQueue;

/**
 * Create a task queue
 *
 * @param  {Object|undefined} options
 *
 * @constructor
 */
function TaskQueue(options) {
    this.tasks = [];
    this.current = null;
    this.options = options || {};
    this.startTimes = {};
}

/**
 * Schedule a function to be executed. If a name is provided and another
 * function by name name was scheduled earlier, either this or the earlier
 * function is dropped, depending on the overriding option. If frequency is
 * provided, the function will not run if a function by that name ran recently.
 *
 * @param  {String} name [optional]
 * @param  {String} frequency [optional]
 * @param  {Function} func
 *
 * @return {null}
 */
TaskQueue.prototype.schedule = function(name, frequency, func) {
    if (arguments.length === 1) {
        func = name;
        name = null;
        frequency = null;
    } else if (arguments.length === 2) {
        func = frequency;
        frequency = null;
    }
    if (!func) {
        return;
    }
    if (name) {
        var scheduled = _.some(this.tasks, { name });
        var running = (this.current && this.current.name === name);
        var ranRecently = false;
        if (frequency) {
            var lastStartTime = this.startTimes[name];
            if (lastStartTime) {
                var frequencyParts = frequency.split(' ');
                var quantity = parseFloat(frequencyParts[0]);
                var unit = frequencyParts[1];
                var before = Moment().subtract(quantity, unit).toISOString();
                if (lastStartTime > before) {
                    ranRecently = true;
                }
            }
        }
        if (ranRecently) {
            return;
        } else if (scheduled) {
            if (!this.options.overriding) {
                // skip, since it's already scheduled
                return;
            } else {
                // remove the one scheduled earlier
                _.remove(this.tasks, { name });
            }
        } else if (running) {
            if (!this.options.overriding) {
                // skip, since it's already running
                return;
            }
        }
    }
    this.tasks.push({ name, func });
    if (!this.current) {
        this.next();
    }
    return null;
};

/**
 * Call the next schedule function
 */
TaskQueue.prototype.next = function() {
    var task = this.tasks.shift();
    if (task) {
        this.current = task;
        setImmediate(() => {
            Promise.try(() => {
                return task.func();
            }).then(() => {
                if (task.name) {
                    this.startTimes[task.name] = Moment().toISOString();
                }
            }).catch((err) => {
                console.log(`Error encountered performing task: ${task.name}`);
                console.error(err);
            }).finally(() => {
                this.current = null;
                this.next();
            });
        });
    }
};

/**
 * Clear scheduled functions
 */
TaskQueue.prototype.clear = function() {
    this.tasks.splice(0);
};
