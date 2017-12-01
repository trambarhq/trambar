var _ = require('lodash');
var Moment = require('moment');

module.exports = TaskQueue;

function TaskQueue(options) {
    this.tasks = [];
    this.current = null;
    this.options = options || {};
    this.startTimes = {};
}

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
                var before = Moment().subtract(frequency).toISOString();
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
        setImmediate(() => {
            this.next();
        });
    }
    return null;
}

TaskQueue.prototype.next = function() {
    var task = this.tasks.shift();
    if (task) {
        try {
            var promise = task.func();
            if (task.name) {
                this.startTimes[task.name] = Moment().toISOString();
            }
        } catch(err) {
            console.log(`Error encountered performing task: ${task.name}`);
            console.error(err);
        }
        if (promise) {
            this.current = task;
            promise.catch((err) => {
                console.error(err);
            }).finally(() => {
                this.current = null;
                this.next();
            });
        } else {
            setImmediate(() => {
                this.next();
            });
        }
    }
}
