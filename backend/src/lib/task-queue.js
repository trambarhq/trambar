import _ from 'lodash';
import AsyncQueue from 'utils/async-queue';

class TaskQueue {
    constructor() {
        let priority = (task) => { return task.priority(); };
        this.queue = new AsyncQueue([ priority ], [ 'desc' ]);
        this.periodicTasks = [];
    }

    add(task) {
        let existing = this.queue.find((existing) => {
            return _.isEqual(existing, task);
        });
        if (!existing) {
            this.queue.add(task);
        }
    }

    schedule(periodicTask) {
        this.periodicTasks.push(periodicTask);
    }

    async start() {
        this.queue.start();
        this.loop();

        for (let task of this.periodicTasks) {
            try {
                await task.start(this);
                setTimeout(() => {
                    this.add(task);
                }, task.delay(true));
            } catch (err) {
                console.error(err);
            }
        }
    }

    async stop() {
        this.queue.stop();
        for (let task of this.periodicTasks) {
            try {
                await task.stop(this);
            } catch (err) {
                console.error(err);
            }
        }
    }

    async loop() {
        for (;;) {
            let task = await this.queue.pull();
            if (!task) {
                break;
            }
            try {
                await task.run(this);
                if (task instanceof PeriodicTask) {
                    setTimeout(() => {
                        this.add(task);
                    }, task.delay());
                }
            } catch (err) {
                console.error(err);
            }
        }
    }
}

class BasicTask {
    priority() {
        return 1;
    }

    async run() {
    }
}

class PeriodicTask extends BasicTask {
    priority() {
        return 0;
    }

    delay(initial) {
        return (initial) ? 0 : 10 * 60 * 1000;
    }

    async start() {
    }

    async stop() {
    }
}

export {
    TaskQueue as default,
    TaskQueue,
    BasicTask,
    PeriodicTask,
};
