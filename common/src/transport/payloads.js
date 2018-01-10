var _ = require('lodash');
var Promise = require('bluebird');

module.exports = Payloads;

function Payloads(payloadManager) {
    this.payloadManager = payloadManager;
    this.uploading = this.payloadManager.getUploadProgress();
}

/**
 * Create a payload of files needed by a res
 *
 * @param  {String} schema
 * @param  {Object} res
 *
 * @return {Promise<Number>}
 */
Payloads.prototype.queue = function(schema, res) {
    return this.payloadManager.queue(schema, res);
};

/**
 * Look for a payload
 *
 * @param  {String} schema
 * @param  {Object} criteria
 *
 * @return {Object}
 */
Payloads.prototype.find = function(schema, criteria) {
    return this.payloadManager.find(schema, criteria);
};

/**
 * Begin sending a previously queued payload
 *
 * @param  {String} schema
 * @param  {Number} payloadId
 */
Payloads.prototype.send = function(schema, payloadId) {
    return this.payloadManager.send(schema, payloadId);
};

/**
 * Send blobs to server as they're added into a BlobStream
 *
 * @param  {BlobStream} stream
 *
 * @return {Promise<Number>}
 */
Payloads.prototype.stream = function(stream) {
    return this.payloadManager.stream(stream);
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
Payloads.prototype.prepare = function(schema, object, options) {
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
Payloads.prototype.dispatch = function(schema, object) {
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
Payloads.prototype.inquire = function(schema, object) {
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
    var overallSize  = 0;
    var overallTransferred = 0;
    var payloadSizes = {};
    var payloadTransferred = {};
    _.each(payloads, (payload) => {
        var payloadId = payload.payload_id;
        var total = 0, loaded = 0;
        _.each(payload.transferProgress, (progress, name) => {
            total += progress.total;
            loaded += progress.loaded;
        });
        payloadSizes[payloadId] = total;
        payloadTransferred[payloadId] = loaded;
        overallSize += total;
        overallTransferred += loaded;
    });
    var progress = Math.round(overallTransferred / overallSize * 100) || 0;
    var action = 'uploading';
    if (progress >= 100) {
        // uploading is done--see if transcoding is occurring at the backend
        var transcodingPayloads = _.filter(payloads, (payload) => {
            return /transcode/.test(payload.action);
        });
        if (_.isEmpty(transcodingPayloads)) {
            return null;
        }
        var transcodingSize = _.sum(_.map(transcodingPayloads, (payload) => {
            return payloadSizes[payload.payload_id];
        }));
        var transcodingProgress = _.sum(_.map(transcodingPayloads, (payload) => {
            // scale the progress based on file size
            var payloadSize = payloadSizes[payload.payload_id];
            var weight = payloadSize / transcodingSize;
            return payload.backendProgress * weight;
        }));
        progress = Math.round(transcodingProgress);
        action = 'transcoding';
    }
    return { action, progress };
};
