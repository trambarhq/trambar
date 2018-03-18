var _ = require('lodash');
var Promise = require('bluebird');
var HTTPRequest = require('transport/http-request');
var RandomToken = require('utils/random-token');
var Async = require('async-do-while');

module.exports = BlobStream;

function BlobStream(address, options) {
    this.id = RandomToken.generate();
    this.address = address;
    this.options = options;
    this.parts = [];
    this.closed = false;
    this.error = null;
    this.pullResult = null;
    this.waitResult = null;
    this.size = 0;
    this.started = false;
    this.online = true;
    this.transferred = 0;
    this.promise = null;
    this.onProgress = null;
    this.onComplete = null;
}

/**
 * Concatenate contents into a single blob
 *
 * @return {Blob}
 */
BlobStream.prototype.toBlob = function() {
    var blobs = _.map(this.parts, 'blob');
    if (blobs.length > 1) {
        var type = blobs[0].type;
        return new Blob(blobs, { type });
    } else if (blobs.length === 1) {
        return blobs[0];
    } else {
        return new Blob;
    }
};

BlobStream.prototype.setOptions = function(options) {
    if (this.started) {
        throw new Error('Cannot set options once a stream has started');
    }
    this.options = _.assign({}, this.options, options);
};

/**
 * Push a blob into the stream
 *
 * @param  {Blob} blob
 */
BlobStream.prototype.push = function(blob) {
    if (process.env.NODE_ENV !== 'production') {
        if (this.closed) {
            console.warn('Pushing into a closed stream');
        }
    }
    this.parts.push({
        blob,
        sent: false,
    });
    this.size += blob.size;
    if (this.pullResult) {
        this.pullResult.resolve(blob);
        this.pullResult = null;
    }
};

/**
 * Indicate that there're no more blobs coming
 */
BlobStream.prototype.close = function() {
    this.closed = true;
    var unsent = _.find(this.parts, { sent: false });
    if (!unsent) {
        if (this.pullResult) {
            this.pullResult.resolve(null);
            this.pullResult = null;
        }
        if (this.waitResult) {
            this.waitResult.resolve();
            this.waitResult = null;
        }
    }
};

/**
 * Return the next part that hasn't been uploaded yet
 *
 * @return {Promise<Blob>}
 */
BlobStream.prototype.pull = function() {
    var unsent = _.find(this.parts, { sent: false });
    if (unsent) {
        return Promise.resolve(unsent.blob);
    } else {
        if (this.closed) {
            return Promise.resolve(null);
        }
    }
    if (!this.pullResult) {
        this.pullResult = deferResult();
    }
    return this.pullResult.promise;
};

/**
 * Mark a part of the stream as sent
 *
 * @param  {Blob} blob
 */
BlobStream.prototype.finalize = function(blob) {
    var part = _.find(this.parts, { blob });
    if (part) {
        part.sent = true;
    }
    if (this.waitResult) {
        var unsent = _.find(this.parts, { sent: false });
        if (!unsent && this.closed) {
            this.waitResult.resolve();
        }
    }
};

/**
 * Set error encountered while uploading the parts
 *
 * @param  {Error} error
 */
BlobStream.prototype.abandon = function(err) {
    this.error = err;
    if (this.waitResult) {
        this.waitResult.reject(err);
    }
};

/**
 * Return when all parts have been uploaded
 *
 * @return {Promise}
 */
BlobStream.prototype.wait = function() {
    if (this.closed) {
        if (this.error) {
            return Promise.reject(this.error);
        }
        var unsent = _.find(this.parts, { sent: false });
        if (!unsent) {
            return Promise.resolve();
        }
    }
    if (!this.waitResult) {
        this.waitResult = deferResult();
    }
    return this.waitResult.promise;
};

/**
 * Send contents of file through stream
 *
 * @param  {File} file
 * @param  {Number} chunkSize
 *
 * @return {BlobStream}
 */
BlobStream.prototype.pipe = function(file, chunkSize) {
    if (!chunkSize) {
        chunkSize = 1 * 1024 * 1024;
    }
    var total = file.size;
    var type = file.type;
    for (var offset = 0; offset < total; offset += chunkSize) {
        var byteCount = Math.min(chunkSize, total - offset);
        var chunk = file.slice(offset, offset + byteCount, type);
        this.push(chunk);
    }
    this.close();
    return this;
};

/**
 * Indicate there's no connectivity
 */
BlobStream.prototype.suspend = function(status) {
    if (this.online) {
        this.online = false;
    }
};

/**
 * Indicate connectivity has been regained
 */
BlobStream.prototype.resume = function() {
    if (!this.online) {
        this.online = true;
        if (this.onConnectivity) {
            var f = this.onConnectivity;
            this.onConnectivity = null;
            this.connectivityPromise = null;
            f();
        }
    }
};

/**
 * Resolve immediately if online = false, otherwise wait for resume()
 * to be called
 *
 * @return {Promise}
 */
BlobStream.prototype.waitForConnectivity = function() {
    if (this.online) {
        return Promise.resolve();
    }
    if (!this.connectivityPromise) {
        this.connectivityPromise = new Promise((resolve, reject) => {
            this.onConnectivity = resolve;
        });
    }
    return this.connectivityPromise;
};

/**
 * Start streaming data to remote server
 */
BlobStream.prototype.start = function() {
    if (!this.promise) {
        this.promise = this.waitForConnectivity().then(() => {
            this.started = true;
            return new Promise((resolve, reject) => {
                var attempts = 10;
                var failureCount = 0;
                var done = false;
                var uploadedChunkSize = 0;
                var chunkIndex = 0;
                var delay = 1000;
                Async.do(() => {
                    // get the next unsent part and send it
                    return this.waitForConnectivity().then(() => {
                        return this.pull().then((blob) => {
                            var url = `${this.address}/srv/media/stream/?id=${this.id}`;
                            var formData = new FormData;
                            if (blob) {
                                formData.append('file', blob);
                                formData.append('chunk', chunkIndex);
                                if (chunkIndex === 0) {
                                    _.each(this.options, (value, name) => {
                                        formData.append(name, value);
                                    });
                                }
                            } else {
                                // the server recognize that an empty payload means we've
                                // reached the end of the stream
                                done = true;
                            }
                            var options = {
                                responseType: 'json',
                                onUploadProgress: (evt) => {
                                    if (blob) {
                                        // evt.loaded and evt.total are encoded sizes, which are slightly larger than the blob size
                                        var bytesSentFromChunk = Math.round(blob.size * (evt.loaded / evt.total));
                                        if (bytesSentFromChunk) {
                                            this.updateProgress(uploadedChunkSize + bytesSentFromChunk);
                                        }
                                    }
                                },
                            };
                            return HTTPRequest.fetch('POST', url, formData, options).then((response) => {
                                if (blob) {
                                    this.finalize(blob);
                                    uploadedChunkSize += blob.size;
                                }
                                if (chunkIndex === 0) {
                                    // resolve promsie after sending first chunk
                                    resolve();
                                }
                                chunkIndex++;
                            });
                        }).catch((err) => {
                            // don't immediately fail unless it's a HTTP error
                            if (!(err.statusCode >= 400 && err.statusCode <= 499 && err.statusCode !== 429)) {
                                if (++failureCount < attempts) {
                                    // try again after a delay
                                    delay = Math.min(delay * 2, 30 * 1000);
                                    return Promise.delay(delay);
                                }
                            }
                            throw err;
                        });
                    });
                });
                Async.while(() => { return !done });
                Async.end().then(() => {
                    if (this.onComplete) {
                        this.onComplete({
                            type: 'complete',
                            target: this,
                        });
                    }
                }).catch((err) => {
                    this.abandon(err);
                    if (chunkIndex === 0) {
                        // didn't manage to initiate a stream at all
                        reject(err);
                    }
                });
            });
        })
    }
    return this.promise;
};

/**
 * Report upload progress
 *
 * @param  {Number} transferred
 */
BlobStream.prototype.updateProgress = function(transferred) {
    this.transferred = transferred;
    if (this.onProgress) {
        this.onProgress({
            type: 'progress',
            target: this,
            loaded: transferred,
            total: this.size,
            lengthComputable: this.closed,
        });
    }
};

/**
 * Return an object containing a promise and its resolve/reject functions
 *
 * @return {Object}
 */
function deferResult() {
    var props = {};
    props.promise = new Promise((resolve, reject) => {
        props.resolve = resolve;
        props.reject = reject;
    });
    return props;
}
