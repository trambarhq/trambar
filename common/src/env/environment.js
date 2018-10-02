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
        this.browser = envMonitor.browser;
        this.os = envMonitor.os;
        this.pointingDevice = envMonitor.pointingDevice;
        this.date = envMonitor.date;
        this.startTime = Moment().toISOString();

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

    /**
     * Get URL of resource
     *
     * @param  {Object} res
     * @param  {Object} params
     *
     * @return {Object}
     */
    getResourceURL(res, params) {
        switch (res.type) {
            case 'image':
                return this.getImageURL(res, params);
            case 'video':
                return this.getVideoURL(res, params);
            case 'website':
                return res.url;
            case 'audio':
                return this.getAudioURL(res, params);
        }
    }

    /**
     * Return URL of image file
     *
     * @param  {Object} res
     * @param  {Object} params
     *
     * @return {String|undefined}
     */
    getImageURL(res, params) {
        if (!res) {
            return undefined;
        }
        if (!params) {
            params = {};
        }
        let url = ResourceUtils.getRemoteImageURL(res, params, this);
        if (!url) {
            if (!params.remote) {
                url = ResourceUtils.getLocalImageURL(res, params);
            }
        }
        return url;
    }

    /**
     * Return URL to video resource
     *
     * @param  {Object} res
     * @param  {Object} params
     *
     * @return {String|null}
     */
    getVideoURL(res, params) {
        if (!res.url) {
            return null;
        }
        if (!params) {
            params = {};
        }
        let url = `${this.address}${res.url}`;
        // pick suitable version unless specified otherwise
        if (!params || !params.original) {
            let version = ResourceUtils.pickVideoVersion(res, params, this);
            if (version) {
                url += `.${version.name}.${version.format}`;
            }
        }
        return url;
    }

    /**
     * Return URL to audio resource
     *
     * @param  {Object} res
     * @param  {Object} params
     *
     * @return {String|null}
     */
    getAudioURL(res, params) {
        if (!res.url) {
            return null;
        }
        if (!params) {
            params = {};
        }
        let url = `${this.address}${res.url}`;
        if (!params || !params.original) {
            let version = ResourceUtils.pickAudioVersion(res, params, this);
            if (version) {
                url += `.${version.name}.${version.format}`;
            }
        }
        return url;
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
