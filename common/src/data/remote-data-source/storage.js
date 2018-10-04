import _ from 'lodash'
import Operation from 'data/remote-data-source/operation';

class Storage extends Operation {
    constructor(location, objects, options) {
        super(location);
        this.objects = objects;
        this.options = options || {};
        this.canceled = false;
    }

    finish(results) {
        super.finish(results);

        if (!this.isLocal()) {
            _.each(this.results, (object) => {
                object.rtime = this.finishTime;
            });
        }
    }
}

export {
    Storage as default,
    Storage,
};
