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
    return this.payloadManager.dispatch(tokens);
};

/**
 * Scan an object's resource array and calculate the overall progress
 *
 * @param  {Object} object
 *
 * @return {Object|null}
 */
Payloads.prototype.inquire = function(object) {
    var tokens = getPayloadTokens(object);
    return this.payloadManager.inquire(tokens);
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
