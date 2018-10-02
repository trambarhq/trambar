import _ from 'lodash';
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

export {
    mergeLists,
    getImageDimensions,
    getDimensions,
    getClippingRect,
};
