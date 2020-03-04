import _ from 'lodash';
import { AsyncQueue } from './async-queue.mjs';

export class TaskQueue {
  constructor() {
    const priority = (entry) => {
      return entry.task.priority(entry.initial);
    };
    this.queue = new AsyncQueue([ priority ], [ 'desc' ]);
    this.periodicTasks = [];
  }

  add(task) {
    if (task instanceof PeriodicTask) {
      throw new Error('Use schedule() to schedule periodic tasks');
    }
    return this.push(task, false);
  }

  push(task, initial) {
    const existing = this.queue.find((existing) => {
      return _.isEqual(existing.task, task);
    });
    if (existing) {
      return false;
    }
    this.queue.add({ task, initial });
    return true;
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
          this.push(task, true);
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
      const entry = await this.queue.pull();
      if (!entry) {
        break;
      }
      const { task, initial } = entry;
      try {
        await task.run(this, initial);
        if (task instanceof PeriodicTask) {
          setTimeout(() => {
            this.push(task, false);
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
  BasicTask,
  PeriodicTask,
};
