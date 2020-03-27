export class Payloads {
  constructor(payloadManager, destination) {
    this.payloadManager = payloadManager;
    this.destination = destination;
    this.uploading = this.payloadManager.getUploadProgress();
  }

  /**
   * Add a new payload
   *
   * @param  {String} type
   *
   * @return {Payload}
   */
  add(type) {
    return this.payloadManager.add(this.destination, type);
  }

  /**
   * Create a stream
   *
   * @param  {Object|undefined} options
   *
   * @return {Stream}
   */
  stream(options) {
    return this.payloadManager.stream(this.destination, options);
  }

  /**
   * Scan an object's resource array and cancel any unfinished uploads
   *
   * @param  {Object} object
   *
   * @return {Promise}
   */
  abandon(object) {
    let ids = getPayloadIDs(object);
    return this.payloadManager.abandon(ids);
  }

  /**
   * Scan an object's resource array and upload any blobs to the server
   *
   * @param  {Object} object
   *
   * @return {Promise}
   */
  dispatch(object) {
    let ids = getPayloadIDs(object);
    return this.payloadManager.dispatch(ids);
  }

  /**
   * Scan an object's resource array and calculate the overall progress
   *
   * @param  {Object} object
   *
   * @return {Object|null}
   */
  inquire(object) {
    let ids = getPayloadIDs(object);
    return this.payloadManager.inquire(ids, this.destination);
  }

  /**
   * Cancel a payload
   *
   * @param  {String} id
   *
   * @return {Promise}
   */
  cancel(id) {
    return this.payloadManager.abandon([ id ]);
  }

  /**
   * Create a new instance of object with a destination overriding that indicated
   * by the current route
   *
   * @param  {Object} newDestination
   *
   * @return {Payloads}
   */
  override(newDestination) {
    const destination = { ...this.destination, ...newDestination };
    return new Payloads(this.payloadManager, destination);
  }
}

function getPayloadIDs(object) {
  let ids = [];
  if (object) {
    let details = object.details;
    if (details) {
      if (details.resources) {
        for (let res of details.resources) {
          if (res.payload_token) {
            ids.push(res.payload_token);
          }
        }
      } else if (details.payload_token) {
        ids.push(details.payload_token);
      }
    }
  }
  return ids;
}
