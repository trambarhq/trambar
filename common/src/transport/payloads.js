var Promise = require('bluebird');

module.exports = Payloads;

function Payloads(payloadManager) {
    this.get = function(res) {
        return payloadManager.get(res);
    };

    this.queue = function(res) {
        return payloadManager.queue(res);
    };

    this.find = function(criteria) {
        return payloadManager.find(criteria);
    },

    this.send = function(payloadId) {
        return payloadManager.send(payloadId);
    };

    this.abort = function(payloadId) {
        return payloadManager.abort(payloadId);
    };

    this.stream = function(stream) {
        return payloadManager.stream(stream);
    };

    /**
     * Reattach blobs that were filtered out when objects are saved
     *
     * @param  {Object} object
     */
    this.reattach = function(object) {
        var resources = _.get(object, 'details.resources', []);
        _.each(resources, (res) => {
            // these properties also exist in the corresponding payload objects
            // find payload with one of them
            var criteria = _.pick(res, 'payload_id', 'url', 'poster_url');
            var payload = this.find(criteria);
            if (payload) {
                // add properties that are blobs
                _.forIn(payload, (value, name) => {
                    if (value instanceof Blob) {
                        res[name] = value;
                    }
                });
            }
        });
    };

    /**
     * Scan an object's resource array and queue blobs for uploading
     *
     * @param  {Object} object
     *
     * @return {Promise}
     */
    this.prepare = function(object) {
        var resources = _.get(object, 'details.resources', []);
        return Promise.each(resources, (res) => {
            if (!res.payload_id) {
                // acquire a task id for each attached resource
                return this.queue(res).then((payloadId) => {
                    if (payloadId) {
                        res.payload_id = payloadId;
                    }
                });
            }
        });
    };

    /**
     * Scan an object's resource array and upload any blobs to the server
     *
     * @param  {Object} object
     *
     * @return {Promise}
     */
    this.dispatch = function(object) {
        var resources = _.get(object, 'details.resources', []);
        var payloadIds = _.filter(_.map(resources, 'payload_id'));
        return Promise.each(payloadIds, (payloadId) => {
            this.send(payloadId);
            return null;
        });
    };
}
