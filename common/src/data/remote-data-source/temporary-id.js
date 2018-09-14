/**
 * Return a temporary id that can be used to identify an uncommitted object
 *
 * @return {Number}
 */
function allocate() {
    let newTemporaryId = lastTemporaryId + 0.000000001;
    lastTemporaryId = newTemporaryId;
    return newTemporaryId;
}

let lastTemporaryId = 0;

export {
    allocate,
};
