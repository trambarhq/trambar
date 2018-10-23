import Moment from 'moment';
import { memoizeStrong } from 'utils/memoize';
import * as ResourceUtils from 'objects/utils/resource-utils';

class Environment {
    constructor(envMonitor, extra) {
        this.envMonitor = envMonitor;
        this.visible = envMonitor.visible;
        this.online = envMonitor.online;
        this.connectionType = envMonitor.connectionType;
        this.screenWidth = envMonitor.screenWidth;
        this.screenHeight = envMonitor.screenHeight;
        this.viewportWidth = envMonitor.viewportWidth;
        this.viewportHeight = envMonitor.viewportHeight;
        this.devicePixelRatio = envMonitor.devicePixelRatio;
        this.webpSupport = envMonitor.webpSupport,
        this.platform = envMonitor.platform;
        this.browser = envMonitor.browser;
        this.os = envMonitor.os;
        this.pointingDevice = envMonitor.pointingDevice;
        this.date = envMonitor.date;
        this.startTime = Moment().toISOString();
        this.devices = envMonitor.devices;
        this.recorders = envMonitor.recorders;

        this.locale = extra.locale;
        this.address = extra.address;
        this.widthDefinitions = extra.widthDefinitions;
    }

    isWiderThan(dim) {
        let width;
        if (typeof(dim) === 'number') {
            width = dim;
        } else if (typeof(dim) === 'string') {
            width = this.widthDefinitions[dim];
        }
        return (this.viewportWidth >= width);
    }

    logError(err, info) {
        console.error(err);
        console.info(info.componentStack);
    }

    getRelativeDate(diff, unit) {
        return getRelativeDate(this.date, diff, unit);
    }
}

const getRelativeDate = memoizeStrong('', function(date, diff, unit) {
    let m = Moment(date).add(diff, unit);
    return m.toISOString();
});

export {
    Environment as default,
    Environment,
};
