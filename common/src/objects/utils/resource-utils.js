import _ from 'lodash';
import * as BlobManager from 'transport/blob-manager';
import * as ImageCropping from 'media/image-cropping';

import { mergeObjects } from 'data/merger';

/**
 * Merge remote resource list into local one
 *
 * @param  {Array<Object>} local
 * @param  {Array<Object>} remote
 * @param  {Array<Object>} common
 *
 * @param  {Array<Object>}
 */
function mergeLists(local, remote, common) {
    let commonToLocal = findIndexMapping(common, local);
    let commonToRemote = findIndexMapping(common, remote);
    let localToRemote = findIndexMapping(local, remote);
    let list = [];
    _.each(common, (resC, indexC) => {
        let indexL = commonToLocal[indexC];
        let indexR = commonToRemote[indexC];
        let resL = local[indexL];
        let resR = remote[indexR];
        if (resL && resR) {
            // merge resource objects, applying the same logic
            // to the indices as well
            let a = { resource: resL, index: indexL };
            let b = { resource: resR, index: indexR };
            let c = { resource: resC, index: indexC };
            let d = mergeObjects(a, b, c);
            list.push(d);
        }
    });
    _.each(remote, (resR, indexR) => {
        if (!_.includes(commonToRemote, indexR)) {
            // add resource that wasn't there before
            list.push({ resource: resR, index: indexR });
        }
    });
    _.each(local, (resL, indexL) => {
        let indexR = localToRemote[indexL];
        let resR = remote[indexR];
        if (!_.includes(commonToLocal, indexL) && !resR) {
            // add resource that wasn't there before or in the remote list
            list.push({ resource: resL, index: indexL });
        }
    });
    // put the list into order then strip out indices
    list = _.sortBy(list, 'index');
    return _.map(list, 'resource');
}

/**
 * Get corresponding indices of resources in listA in listB
 *
 * @param  {Array} listA
 * @param  {Array} listB
 *
 * @return {Array}
 */
function findIndexMapping(listA, listB) {
    let map = [];
    let mapped = [];
    _.each(listA, (a, indexA) => {
        let keyA = a.url || a.payload_token;
        let indexB = _.findIndex(listB, (b, indexB) => {
            let keyB = b.url || b.payload_token;
            if (keyA === keyB && !mapped[indexB]) {
                return true;
            }
        });
        if (indexB !== -1) {
            map[indexA] = indexB;
            mapped[indexB] = true;
        }
    });
    return map;
}

function hasPoster(res) {
    if (!res) {
        if (res.poster_url) {
            return true;
        }
        let url = `payload:${res.payload_token}/poster`;
        let blob = BlobManager.find(url);
        if (blob) {
            return true;
        }
    }
    return false;
}

function getImageDimensions(res, params) {
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
 * Return the clipping rect of a resource
 *
 * @param  {Object} res
 * @param  {Object} params
 *
 * @return {Object}
 */
function getClippingRect(res, params) {
    if (!params) {
        params = {};
    }
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

/**
 * Return a resource's dimensions
 *
 * @param  {Object} res
 * @param  {Object} params
 *
 * @return {Object}
 */
function getDimensions(res, params, env) {
    if (res.type === 'video') {
        if (!params.original) {
            let version = pickVideoVersion(res, params, env);
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
    return getImageDimensions(res, params);
}

/**
 * Return URL of a resource's image at that has not been uploaded yet
 *
 * @param  {Object} res
 * @param  {Object} params
 * @param  {Environment} env
 *
 * @return {String|undefined}
 */
function getLocalImageURL(res, params, env) {
    let blob;
    if (res.payload_token) {
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
        let payloadURL = `payload:${res.payload_token}/${name}`;
        blob = BlobManager.find(payloadURL);
    }
    if (!blob) {
        let remoteURL = getRemoteImageURL(res, params, env);
        if (remoteURL) {
            blob = BlobManager.find(remoteURL);
        }
    }
    if (!blob) {
        return;
    }
    if (params.jsonURL) {
        // encode the resource as JSON
        return `json:${JSON.stringify(res)}`;
    } else if (params.original) {
        return BlobManager.url(blob);
    }
}

/**
 * Return URL of a resource's image at remote server
 *
 * @param  {Object} res
 * @param  {Object} params
 * @param  {Environment} env
 *
 * @return {String|undefined}
 */
function getRemoteImageURL(res, params, env) {
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
        if (env.devicePixelRatio !== 1) {
            // request higher resolution image when pixel density is higher
            width = width * env.devicePixelRatio;
            height = height * env.devicePixelRatio;
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
            if (env.webpSupport) {
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
    return `${env.address}${resURL}${versionPath}`;
}

/**
 * Get a version of the video with the highest bitrate that is below
 * the available bandwidth
 *
 * @param  {Object} res
 * @param  {Object} params
 * @param  {Environment} env
 *
 * @return {Object}
 */
function pickVideoVersion(res, params, env) {
    if (params.hasOwnProperty('bitrate')) {
        return _.find(res.resources, { bitrates: { video: params.bitrate }}) || null;
    }
    let bandwidth = getBandwidth(env.connectionType);
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
 * @param  {Environment} env
 *
 * @return {Object|null}
 */
function pickAudioVersion(res, params, env) {
    if (params.hasOwnProperty('bitrate')) {
        return _.find(res.resources, { bitrates: { audio: params.bitrate }}) || null;
    }
    let bandwidth = getBandwidth(env.connectionType);
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

function getURL(res, params, env) {
    if (!res) {
        return undefined;
    }
    switch (res.type) {
        case 'image':
            return getImageURL(res, params, env);
        case 'audio':
            return getAudioURL(res, params, env);
        case 'video':
            return getVideoURL(res, params, env);
        case 'website':
            return res.url;
    }
}

/**
 * Return URL of image file
 *
 * @param  {Object} res
 * @param  {Object} params
 * @param  {Environment} env
 *
 * @return {String|undefined}
 */
function getImageURL(res, params, env) {
    if (!res) {
        return undefined;
    }
    if (!params) {
        params = {};
    }
    let url;
    if (!params.local) {
        url = getRemoteImageURL(res, params, env);
    }
    if (!url) {
        if (!params.remote) {
            url = getLocalImageURL(res, params, env);
        }
    }
    return url;
}

/**
 * Return URL to video resource
 *
 * @param  {Object} res
 * @param  {Object} params
 * @param  {Environment} env
 *
 * @return {String|null}
 */
function getVideoURL(res, params, env) {
    if (!res.url) {
        return null;
    }
    if (!params) {
        params = {};
    }
    let url = `${env.address}${res.url}`;
    // pick suitable version unless specified otherwise
    if (!params || !params.original) {
        let version = pickVideoVersion(res, params, env);
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
 * @param  {Environment} env
 *
 * @return {String|null}
 */
function getAudioURL(res, params, env) {
    if (!res.url) {
        return null;
    }
    if (!params) {
        params = {};
    }
    let url = `${env.address}${res.url}`;
    if (!params || !params.original) {
        let version = pickAudioVersion(res, params, env);
        if (version) {
            url += `.${version.name}.${version.format}`;
        }
    }
    return url;
}

function getMarkdownIconURL(res, forImage, env) {
    if (forImage)  {
        if (res.type === 'audio') {
            return require('!file-loader!speaker.svg') + `#${encodeURI(res.url)}`;
        } else {
            // images are style at height = 1.5em
            let params = {
                height: 24,
                jsonURL: true
            };
            return getImageURL(res, params, env);
        }
    } else {
        return getURL(res, {}, env);
    }
}

/**
 * Parse a JSON URL crated by getLocalImageURL()
 *
 * @param  {String} url
 *
 * @return {Object|null}
 */
function parseJSONEncodedURL(url) {
    if (_.startsWith(url, 'json:')) {
        let json = url.substr(5);
        try {
            return JSON.parse(json);
        } catch(err) {
        }
    }
    return null;
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

export {
    mergeLists,
    getImageDimensions,
    getDimensions,
    getClippingRect,
    pickVideoVersion,
    pickAudioVersion,
    getURL,
    getImageURL,
    getVideoURL,
    getAudioURL,
    getMarkdownIconURL,
    hasPoster,
    parseJSONEncodedURL,
};
