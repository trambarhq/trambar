var _ = require('lodash');

module.exports = BlobStream;

function BlobStream() {
    this.parts = [];
    this.closed = false;
    this.error = null;
    this.pullResult = null;
    this.waitResult = null;
}

/**
 * Concatenate contents into a single blob
 *
 * @return {Blob}
 */
BlobStream.prototype.toBlob = function() {
    var blobs = _.map(this.parts, 'blob');
    if (blobs.length > 0) {
        var type = blobs[0].type;
        return new Blob(blobs, { type });
    } else {
        return new Blob;
    }
};

/**
 * Concatenate contents into a single blob
 *
 * @return {Array<String>}
 */
BlobStream.prototype.toURLArray = function() {
    return _.map(this.parts, 'url');
};

/**
 * Push a blob into the stream
 *
 * @param  {Blob} blob
 */
BlobStream.prototype.push = function(blob) {
    this.parts.push({
        blob,
        url: null,
    });
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
    if (this.pullResult) {
        this.pullResult.resolve(null);
        this.pullResult = null;
    }
    if (this.waitResult) {        
        var unsent = _.find(this.parts, { url: null });
        if (!unsent) {
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
    var unsent = _.find(this.parts, { url: null });
    if (unsent) {
        return Promise.resolve(unsent.blob);
    }
    if (!this.pullResult) {
        this.pullResult = deferResult();
    }
    return this.pullResult.promise;
};

/**
 * Associate a part with the URL returned by server
 *
 * @param  {Blob} blob
 * @param  {String} url
 */
BlobStream.prototype.finalize = function(blob, url) {
    var part = _.find(this.parts, { blob });
    if (part) {
        part.url = url;
    }
    if (this.waitResult) {
        var unsent = _.find(this.parts, { url: null });
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
        var unsent = _.find(this.parts, { url: null });
        if (!unsent) {
            return Promise.resolve();
        }
        if (this.error) {
            return Promise.reject(this.error);
        }
    }
    if (!this.waitResult) {
        this.waitResult = deferResult();
    }
    return this.waitResult.promise;
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
