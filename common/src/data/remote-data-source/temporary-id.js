/**
 * Return a temporary id that can be used to identify an uncommitted object
 *
 * @return {number}
 */
function allocateTempoaryID() {
  const newTemporaryID = lastTemporaryID + 0.000000001;
  lastTemporaryID = newTemporaryID;
  return newTemporaryID;
}

let lastTemporaryID = 0;

export {
  allocateTempoaryID,
};
