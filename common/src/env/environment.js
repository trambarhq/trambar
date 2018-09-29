import Moment from 'moment';
import * as BlobManager from 'transport/blob-manager';
import * as ImageCropping from 'media/image-cropping';
import { memoizeStrong } from 'utils/memoize';

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
        let url = this.getRemoteImageURL(res, params);
        if (!url) {
            if (!params.remote) {
                url = this.getLocalImageURL(res, params);
            }
        }
        return url;
    }

    /**
     * Return URL of a resource's image at that has not been uploaded yet
     *
     * @param  {Object} res
     * @param  {Object} params
     *
     * @return {String|undefined}
     */
    getLocalImageURL(res, params) {
        if (!res.payload_token) {
            return;
        }
        let name;
        switch (res.type) {
            case 'video':
            case 'audio':
            case 'website':
                name = 'poster';
                break;
            default:
                name = 'main';
                break;
        }
        let url = `payload:${res.payload_token}/${name}`;
        let blob = BlobManager.find(url);
        if (!blob) {
            return null;
        }
        let data = {
            url: BlobManager.url(blob),
            clip: getClippingRect(res, params),
            format: res.format,
        };
        return `json:${JSON.stringify(data)}`;
    }

    /**
     * Return URL of a resource's image at remote server
     *
     * @param  {Object} res
     * @param  {Object} params
     *
     * @return {String|undefined}
     */
    getRemoteImageURL(res, params) {
        let resURL;
        switch(res.type) {
            case 'video':
            case 'audio':
            case 'website':
                resURL = res.poster_url;
                break;
            default:
                resURL = res.url;
        }
        if (!resURL) {
            return;
        }

        let versionPath = '';
        if (!params.original) {
            let filters = [];
            // apply clipping rect
            let clip = getClippingRect(res, params);
            if (clip) {
                // run number through Math.round() just in case error elsewhere left fractional pixel dimensions
                let rect = _.map([ clip.left, clip.top, clip.width, clip.height ], Math.round);
                filters.push(`cr${rect.join('-')}`)
            }
            // resize image (if dimensions are specified)
            let width = decodeLength(params.width);
            let height = decodeLength(params.height);
            if (this.devicePixelRatio !== 1) {
                // request higher resolution image when pixel density is higher
                width = width * this.devicePixelRatio;
                height = height * this.devicePixelRatio;
            }
            width = Math.round(width);
            height = Math.round(height);
            let resizing = width || height;
            if (resizing) {
                if (width && height) {
                    filters.push(`re${width}-${height}`);
                } else if (!width && height) {
                    filters.push(`h${height}`);
                } else if (!height && width) {
                    filters.push(`w${width}`);
                }
                if (res.format === 'png' || res.format === 'gif') {
                    // add sharpen filter to reduce blurriness
                    filters.push(`sh`);
                }
            }
            // set quality
            if (params.quality !== undefined) {
                filters.push(`q${params.quality}`);
            }
            // choose format
            let ext;
            if (res.format === 'svg') {
                // stick with SVG
                ext = 'svg';
            } else {
                if (this.webpSupport) {
                    ext = 'webp';
                    if (res.format === 'png' || res.format === 'gif') {
                        if (!resizing) {
                            // use lossless compression (since it'll likely produce a smaller file)
                            filters.push(`l`);
                        }
                    }
                } else {
                    if (res.format === 'png' || res.format === 'gif') {
                        // use PNG to preserve alpha channel
                        ext = `png`;
                    } else {
                        ext = 'jpg';
                    }
                }
            }
            versionPath = `/${filters.join('+')}.${ext}`;
        }
        return `${this.address}${resURL}${versionPath}`;
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
            let version = this.pickVideoVersion(res, params);
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
            let version = this.pickAudioVersion(res, params);
            if (version) {
                url += `.${version.name}.${version.format}`;
            }
        }
        return url;
    }

    getImageDimensions(res, params) {
        if (!params) {
            params = {};
        }
        let clip = getClippingRect(res, params);
        if (clip && !params.original) {
            // return the dimensions of the clipping rect
            return {
                width: clip.width,
                height: clip.height,
            }
        } else {
            return {
                width: res.width,
                height: res.height,
            };
        }
    }

    /**
     * Return a resource's dimensions
     *
     * @param  {Object} res
     * @param  {Object} params
     *
     * @return {Object}
     */
    getDimensions(res, params) {
        if (res.type === 'video') {
            if (!params.original) {
                let version = this.pickVideoVersion(res, params);
                if (version && version.width && version.height) {
                    return {
                        width: version.width,
                        height: version.height,
                    };
                }
            }
            return {
                width: res.width,
                height: res.height,
            };
        }
        return this.getImageDimensions(res, params);
    }

    /**
     * Get a version of the video with the highest bitrate that is below
     * the available bandwidth
     *
     * @param  {Object} res
     * @param  {Object} params
     *
     * @return {Object}
     */
    pickVideoVersion(res, params) {
        if (params.hasOwnProperty('bitrate')) {
            return _.find(res.resources, { bitrates: { video: params.bitrate }}) || null;
        }
        let bandwidth = getBandwidth(this.connectionType);
        let bitrate = (version) => {
            return parseInt(_.get(version, 'bitrates.video'));
        };
        let below = (version) => {
            let b = bitrate(version);
            return (b <= bandwidth) ? bandwidth - b : Infinity;
        };
        let above = (version) => {
            let b = bitrate(version);
            return (b > bandwidth) ? b - bandwidth : 0;
        };
        let versions = _.sortBy(res.versions, [ below, above ]);
        return _.first(versions) || null;
    }

    /**
     * Get a version of the video with the highest bitrate that is below
     * the available bandwidth
     *
     * @param  {Object} res
     * @param  {Object} params
     *
     * @return {Object|null}
     */
    pickAudioVersion(res, params) {
        if (params.hasOwnProperty('bitrate')) {
            return _.find(res.resources, { bitrates: { audio: params.bitrate }}) || null;
        }
        let bandwidth = this.getBandwidth();
        let bitrate = (version) => {
            return parseInt(_.get(version, 'bitrates.audio'));
        };
        // find bitrate closest to bandwidth, below it if possible
        let below = (version) => {
            let b = bitrate(version);
            return (b <= bandwidth) ? bandwidth - b : Infinity;
        };
        let above = (version) => {
            let b = bitrate(version);
            return (b > bandwidth) ? b - bandwidth : 0;
        };
        let versions = _.sortBy(res.versions, [ below, above ]);
        return _.first(versions) || null;
    }

    logError(err, info) {
        console.error(err);
        console.info(info.componentStack);
    }

    getRelativeDate(diff, unit) {
        return getRelativeDate(this.date, diff, unit);
    }
}

function decodeLength(s) {
    let m;
    if (typeof(s) === 'number') {
        return s;
    } else if (m = /^(\d+)\s*vw/.exec(s)) {
        let n = parseInt(m[1]);
        return Math.round(n * document.body.offsetWidth / 100);
    } else if (m = /^(\d+)\s*vh/.exec(s)) {
        let n = parseInt(m[1]);
        return Math.round(n * document.body.offsetHeight / 100);
    }
}

const KBPS = 1000;

function getBandwidth(networkType) {
    switch (networkType) {
        case 'cellular':
        case '2g':
            return 50 * KBPS;
        case '3g':
            return 400 * KBPS;
        case '4g':
            return 5000 * KBPS;
        case 'ethernet':
        case 'wifi':
        default:
            return 10000 * KBPS;
    }
}

function getClippingRect(res, params) {
    if (params.original) {
        return null;
    }
    var clip = res.clip;
    if (params.hasOwnProperty('clip')) {
        // override the one stored in res
        clip = params.clip;
    } else {
        if (!clip) {
            clip = ImageCropping.apply(res.width, res.height);
        }
    }
    return clip;
}

const getRelativeDate = memoizeStrong('', function(date, diff, unit) {
    let m = Moment(date).add(diff, unit);
    return m.toISOString();
});

export {
    Environment as default,
    Environment,
};
