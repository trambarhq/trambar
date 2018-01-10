var _ = require('lodash');

module.exports = BlobStream;

function BlobStream() {
    this.parts = [];
    this.closed = false;
    this.error = null;
    this.pullResult = null;
    this.waitResult = null;
    this.id = null;
    this.size = 0;
    this.onProgress = null;
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

/**
 * Return the stream id
 *
 * @return {String}
 */
BlobStream.prototype.toJSON = function() {
    return this.id;
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
};

/**
 * Report upload progress
 *
 * @param  {Number} transferred
 */
BlobStream.prototype.report = function(transferred) {
    if (this.onProgress) {
        this.onProgress({
            type: 'progress',
            target: this,
            loaded: transferred,
            total: this.size,
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
