import Promise from 'bluebird';

function ManualPromise() {
    Promise.call(this, (resolve, reject) => {
        this.resolve = resolve;
        this.reject = reject;
    });
}

ManualPromise.prototype = Object.create(Promise.prototype);

export {
    ManualPromise as default,
    ManualPromise,
};
