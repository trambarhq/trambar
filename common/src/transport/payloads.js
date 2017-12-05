var Promise = require('bluebird');

module.exports = Payloads;

function Payloads(payloadManager) {
    this.uploading = payloadManager.getUploadProgress();

    /**
     * Create a payload of files needed by a res
     *
     * @param  {String} schema
     * @param  {Object} res
     *
     * @return {Promise<Number>}
     */
    this.queue = function(schema, res) {
        return payloadManager.queue(schema, res);
    };

    /**
     * Look for a payload
     *
     * @param  {String} schema
     * @param  {Object} criteria
     *
     * @return {Object}
     */
    this.find = function(schema, criteria) {
        return payloadManager.find(schema, criteria);
    },

    /**
     * Begin sending a previously queued payload
     *
     * @param  {String} schema
     * @param  {Number} payloadId
     */
    this.send = function(schema, payloadId) {
        return payloadManager.send(schema, payloadId);
    };

    /**
     * Send blobs to server as they're added into a BlobStream
     *
     * @param  {BlobStream} stream
     *
     * @return {Promise<Number>}
     */
    this.stream = function(stream) {
        return payloadManager.stream(stream);
    };

    /**
     * Reattach blobs that were filtered out when objects are saved
     *
     * @param  {String} schema
     * @param  {Object} object
     */
    this.reattach = function(schema, object) {
        var resources = _.get(object, 'details.resources', []);
        _.each(resources, (res) => {
            // these properties also exist in the corresponding payload objects
            // find payload with one of them
            var criteria = _.pick(res, 'payload_id', 'url', 'poster_url');
            var payload = this.find(schema, criteria);
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
     * @param  {String} schema
     * @param  {Object} object
     * @param  {Object} options
     *
     * @return {Promise}
     */
    this.prepare = function(schema, object, options) {
        var resources = _.get(object, 'details.resources', []);
        return Promise.each(resources, (res) => {
            if (!res.payload_id) {
                // acquire a task id for each attached resource
                var typeOptions = _.get(options, res.type);
                return this.queue(schema, res, typeOptions).then((payloadId) => {
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
     * @param  {String} schema
     * @param  {Object} object
     *
     * @return {Promise}
     */
    this.dispatch = function(schema, object) {
        var resources = _.get(object, 'details.resources', []);
        var payloadIds = _.filter(_.map(resources, 'payload_id'));
        return Promise.each(payloadIds, (payloadId) => {
            this.send(schema, payloadId);
            return null;
        });
    };

    /**
     * Scan an object's resource array and calculate the overall progress
     *
     * @param  {String} schema
     * @param  {Object} object
     *
     * @return {Object|null}
     */
    this.inquire = function(schema, object) {
        // find the payloads
        var resources = _.get(object, 'details.resources', []);
        var payloads = [];
        _.each(resources, (res) => {
            if (res.payload_id) {
                var payload = this.find(schema, { payload_id: res.payload_id });
                if (payload) {
                    payloads.push(payload)
                }
            }
        });
        if (_.isEmpty(payloads)) {
            return null;
        }
        // see if the files are still be uploaded
        var overallSize = _.sum(_.map(payloads, 'total'));
        var overallTransferred = _.sum(_.map(payloads, 'transferred'));
        var progress = Math.round(overallTransferred / overallSize * 100) || 0;
        var action = 'uploading';
        if (progress === 100) {
            // uploading is done--see if transcoding is occurring at the backend
            var transcodingPayloads = _.filter(payloads, (payload) => {
                return /transcode/.test(payload.action);
            });
            if (_.isEmpty(transcodingPayloads)) {
                return null;
            }
            var transcodingSize = _.sum(_.map(transcodingPayloads, 'total'));
            var transcodingProgress = _.sum(_.map(transcodingPayloads, (payload) => {
                // scale the progress based on file size
                var weight = payload.total / transcodingSize;
                return payload.backendProgress * weight;
            }));
            progress = Math.round(transcodingProgress);
            action = 'transcoding';
        }
        return { action, progress };
    };
}
