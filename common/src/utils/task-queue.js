import _ from 'lodash';
import Moment from 'moment';

class TaskQueue {
    constructor(options) {
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
    schedule(name, frequency, func) {
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
            let scheduled = _.some(this.tasks, { name });
            let running = (this.current && this.current.name === name);
            let ranRecently = false;
            if (frequency) {
                let lastStartTime = this.startTimes[name];
                if (lastStartTime) {
                    let frequencyParts = frequency.split(' ');
                    let quantity = parseFloat(frequencyParts[0]);
                    let unit = frequencyParts[1];
                    let before = Moment().subtract(quantity, unit).toISOString();
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
    }

    /**
     * Call the next schedule function
     */
    next() {
        let task = this.tasks.shift();
        if (task) {
            this.current = task;
            setImmediate(async () => {
                try {
                    await task.func();
                    if (task.name) {
                        this.startTimes[task.name] = Moment().toISOString();
                    }
                } catch (err) {
                    console.log(`Error encountered performing task: ${task.name}`);
                    console.error(err);
                }
                this.current = null;
                this.next();
            });
        }
    }

    /**
     * Clear scheduled functions
     */
    clear() {
        this.tasks.splice(0);
    }
}

export {
    TaskQueue as default,
    TaskQueue,
};
