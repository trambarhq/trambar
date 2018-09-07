import _ from 'lodash';

class Payloads {
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
        var ids = getPayloadIds(object);
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
        var ids = getPayloadIds(object);
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
        var ids = getPayloadIds(object);
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
     * @param  {Object} destination
     *
     * @return {Payloads}
     */
    override(destination) {
        return new Payloads(this.payloadManager, destination);
    }
}

function getPayloadIds(object) {
    var ids = [];
    if (object) {
        var details = object.details;
        if (details) {
            if (details.resources) {
                _.each(details.resources, (res) => {
                    if (res.payload_id) {
                        ids.push(res.payload_id);
                    }
                });
            } else if (details.payload_id) {
                ids.push(details.payload_id);
            }
        }
    }
    return ids;
}

export {
    Payloads as default,
    Payloads,
};
