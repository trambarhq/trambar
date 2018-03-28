exports.allocate = allocate;

/**
 * Return a temporary id that can be used to identify an uncommitted object
 *
 * @return {Number}
 */
function allocate() {
    var newTemporaryId = lastTemporaryId + 0.000000001;
    lastTemporaryId = newTemporaryId;
    return newTemporaryId;
}

var lastTemporaryId = 0;
