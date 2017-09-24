var _ = require('lodash');

module.exports = TaskQueue;

function TaskQueue() {
    this.tasks = [];
    this.current = null;
}

TaskQueue.prototype.schedule = function(name, func) {
    if (!func) {
        return;
    }
    if (name) {
        if (_.some(this.tasks, { name })) {
            // already scheduled
            return;
        } else if (this.current && this.current.name === name) {
            // already running
            return;
        }
    }
    this.tasks.push({
        name,
        func,
    });
    if (!this.current) {
        this.next();
    }
    return null;
}

TaskQueue.prototype.next = function() {
    var task = this.tasks.shift();
    if (task) {
        try {
            var promise = task.func();
        } catch(err) {
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
