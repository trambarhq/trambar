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
function getDimensions(res, params) {
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
    return getImageDimensions(res, params);
}

/**
 * Return URL of a resource's image at that has not been uploaded yet
 *
 * @param  {Object} res
 * @param  {Object} params
 *
 * @return {String|undefined}
 */
function getLocalImageURL(res, params) {
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

export {
    mergeLists,
    getImageDimensions,
    getDimensions,
    getClippingRect,
    getLocalImageURL,
    getRemoteImageURL,
};
