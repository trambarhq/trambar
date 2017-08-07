module.exports = TaskQueue;

function TaskQueue() {
    this.tasks = [];
    this.busy = false;
}

TaskQueue.prototype.schedule = function(f) {
    if (!f) {
        return;
    }
    this.tasks.push(f);
    if (!this.busy) {
        this.next();
    }
}

TaskQueue.prototype.next = function() {
    var f = this.tasks.shift();
    if (f) {
        var promise = f();
        if (promise) {
            this.busy = true;
            promise.catch((err) => {
                console.error(err);
            }).finally(() => {
                this.busy = false;
                this.next();
            });
        } else {
            setImmediate(() => {
                this.next();
            });
        }
    }
}
