import _ from 'lodash';

class AsyncQueue {
    constructor(iteratees, orders) {
        this.active = true;
        this.iteratees = iteratees;
        this.orders = orders;
        this.items = [];
        this.promise = null;
    }

    add(item) {
        let items = _.concat(this.items, item);
        this.items = _.orderBy(items, this.iteratees, this.orders);
        this.fulfill();
    }

    find(predicate) {
        return _.find(this.items, predicate);
    }

    remove(predicate) {
        return _.remove(this.items, predicate);
    }

    async pull() {
        if (this.active) {
            if (this.items.length === 0) {
                await this.wait();
            }
            return this.items.shift();
        }
    }

    start() {
        if (!this.active) {
            this.active = true;
            if (this.items.length > 0) {
                this.fulfill();
            }
        }
    }

    stop() {
        if (this.active) {
            this.fulfill();
            this.active = false;
        }
    }

    async wait() {
        if (!this.promise) {
            let resolve, reject;
            this.promise = new Promise((f1, f2) => {
                resolve = f1;
                reject = f2;
            });
            this.promise.resolve = resolve;
            this.promise.reject = reject;
        }
        return this.promise;
    }

    fulfill() {
        if (this.active) {
            if (this.promise) {
                this.promise.resolve();
                this.promise = null;
            }
        }
    }
}

export {
    AsyncQueue as default,
    AsyncQueue,
};
