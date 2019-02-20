import _ from 'lodash';
import ManualPromise from 'utils/manual-promise';

class CacheSignature {
    constructor(address, schema, table, id) {
        this.address = address;
        this.schema = schema;
        this.table = table;
        this.id = id;
        this.resolved = false;
        this.promise = ManualPromise();
    }

    /**
     * Check if the other object has the same location
     *
     * @param  {Object} other
     *
     * @return {Boolean}
     */
    match(other) {
        if (this.address !== other.address) {
            return false;
        }
        if (this.schema !== other.schema) {
            return false;
        }
        if (this.table !== other.table) {
            return false;
        }
        if (this.id !== other.id) {
            return false;
        }
        return true;
    }

    resolve() {
        if (!this.resolved) {
            this.resolved = true;
            this.promise.resolve(true);
        }
    }

    setTimeout(delay) {
        if (delay !== undefined) {
            setTimeout(() => {
                if (!this.resolved) {
                    this.resolved = true;
                    this.promise.resolve(false);
                }
            }, delay);
        }
    }
}

export {
    CacheSignature as default,
    CacheSignature,
};
