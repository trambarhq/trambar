var _ = require('lodash');
var Promise = require('bluebird');

module.exports = Payloads;

function Payloads(payloadManager) {
    this.payloadManager = payloadManager;
    //this.uploading = this.payloadManager.getUploadProgress();
}


/**
 * Add a new payload
 *
 * @param  {String} type
 *
 * @return {Payload}
 */
Payloads.prototype.add = function(type) {
    return this.payloadManager.add(type);
};

/**
 * Create a stream
 *
 * @return {Stream}
 */
Payloads.prototype.stream = function() {
    return this.payloadManager.stream();
};

/**
 * Scan an object's resource array and upload any blobs to the server
 *
 * @param  {Object} object
 *
 * @return {Promise}
 */
Payloads.prototype.dispatch = function(object) {
    var tokens = getPayloadTokens(object);
    return this.payloadManager.send(tokens);
};

/**
 * Scan an object's resource array and calculate the overall progress
 *
 * @param  {Object} object
 *
 * @return {Object|null}
 */
Payloads.prototype.inquire = function(object) {
    return null;
    var tokens = getPayloadTokens(object);

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

function getPayloadTokens(object) {
    var tokens = [];
    if (object) {
        var details = object.details;
        if (details) {
            if (details.resources) {
                _.each(details.resources, (res) => {
                    if (res.payload_token) {
                        tokens.push(res.payload_token);
                    }
                });
            } else if (details.payload_token) {
                tokens.push(details.payload_token);
            }
        }
    }
    return tokens;
}
