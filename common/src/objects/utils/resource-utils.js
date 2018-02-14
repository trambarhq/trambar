var _ = require('lodash');
var Merger = require('data/merger');

module.exports = {
    mergeLists
};

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
    var commonToLocal = findIndexMapping(common, local);
    var commonToRemote = findIndexMapping(common, remote);
    var localToRemote = findIndexMapping(local, remote);
    var list = [];
    _.each(common, (resC, indexC) => {
        var indexL = commonToLocal[indexC];
        var indexR = commonToRemote[indexC];
        var resL = local[indexL];
        var resR = remote[indexR];
        if (resL && resR) {
            // merge resource objects, applying the same logic
            // to the indices as well
            var a = { resource: resL, index: indexL };
            var b = { resource: resR, index: indexR };
            var c = { resource: resC, index: indexC };
            var d = Merger.mergeObjects(a, b, c);
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
        var indexR = localToRemote[indexL];
        var resR = remote[indexR];
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
    var map = [];
    var mapped = [];
    _.each(listA, (a, indexA) => {
        var keyA = a.url || a.payload_token;
        var indexB = _.findIndex(listB, (b, indexB) => {
            var keyB = b.url || b.payload_token;
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
