import _ from 'lodash';
import Promise from 'bluebird';
import * as HTTPRequest from 'transport/http-request';
import Async from 'async-do-while';

class BlobStream {
    constructor(id, url, options) {
        this.id = id;
        this.url = url;
        this.options = options;
        this.parts = [];
        this.closed = false;
        this.error = null;
        this.pullResult = null;
        this.waitResult = null;
        this.size = 0;
        this.started = false;
        this.canceled = false;
        this.finished = false;
        this.suspended = false;
        this.transferred = 0;
        this.promise = null;
        this.onProgress = null;
        this.onComplete = null;
        this.onError = null;
    }

    /**
     * Concatenate contents into a single blob
     *
     * @return {Blob}
     */
    toBlob() {
        let blobs = _.map(this.parts, 'blob');
        if (blobs.length > 1) {
            let type = blobs[0].type;
            return new Blob(blobs, { type });
        } else if (blobs.length === 1) {
            return blobs[0];
        } else {
            return new Blob;
        }
    }

    setOptions(options) {
        if (this.started) {
            throw new Error('Cannot set options once a stream has started');
        }
        this.options = _.assign({}, this.options, options);
    }

    /**
     * Push a blob into the stream
     *
     * @param  {Blob} blob
     */
    push(blob) {
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
    }

    /**
     * Indicate that there're no more blobs coming
     */
    close() {
        this.closed = true;
        let unsent = _.find(this.parts, { sent: false });
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
    }

    /**
     * Return the next part that hasn't been uploaded yet
     *
     * @return {Promise<Blob>}
     */
    pull() {
        let unsent = _.find(this.parts, { sent: false });
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
    }

    /**
     * Mark a part of the stream as sent
     *
     * @param  {Blob} blob
     */
    finalize(blob) {
        let part = _.find(this.parts, { blob });
        if (part) {
            part.sent = true;
        }
        if (this.waitResult) {
            let unsent = _.find(this.parts, { sent: false });
            if (!unsent && this.closed) {
                this.waitResult.resolve();
            }
        }
    }

    /**
     * Set error encountered while uploading the parts
     *
     * @param  {Error} error
     */
    abandon(err) {
        this.error = err;
        if (this.waitResult) {
            this.waitResult.reject(err);
        }
    }

    /**
     * Return when all parts have been uploaded
     *
     * @return {Promise}
     */
    wait() {
        if (this.closed) {
            if (this.error) {
                return Promise.reject(this.error);
            }
            let unsent = _.find(this.parts, { sent: false });
            if (!unsent) {
                return Promise.resolve();
            }
        }
        if (!this.waitResult) {
            this.waitResult = deferResult();
        }
        return this.waitResult.promise;
    }

    /**
     * Send contents of file through stream
     *
     * @param  {File} file
     * @param  {Number} chunkSize
     *
     * @return {BlobStream}
     */
    pipe(file, chunkSize) {
        if (!chunkSize) {
            chunkSize = 1 * 1024 * 1024;
        }
        let total = file.size;
        let type = file.type;
        for (let offset = 0; offset < total; offset += chunkSize) {
            let byteCount = Math.min(chunkSize, total - offset);
            let chunk = file.slice(offset, offset + byteCount, type);
            this.push(chunk);
        }
        this.close();
        return this;
    }

    /**
     * Indicate there's no connectivity
     */
    suspend() {
        if (!this.suspended) {
            this.suspended = false;
        }
    }

    /**
     * Indicate connectivity has been regained
     */
    resume() {
        if (this.suspended) {
            this.suspended = false;
            if (this.onConnectivity) {
                let f = this.onConnectivity;
                this.onConnectivity = null;
                this.connectivityPromise = null;
                f();
            }
        }
    }

    /**
     * Resolve immediately if suspended = false, otherwise wait for resume()
     * to be called
     *
     * @return {Promise}
     */
    waitForConnectivity() {
        if (!this.suspended) {
            return Promise.resolve();
        }
        if (!this.connectivityPromise) {
            this.connectivityPromise = new Promise((resolve, reject) => {
                this.onConnectivity = resolve;
            });
        }
        return this.connectivityPromise;
    }

    /**
     * Start streaming data to remote server
     */
    start() {
        if (this.promise) {
            return this.promise;
        }
        this.promise = this.waitForConnectivity().then(() => {
            this.started = true;
            return new Promise((resolve, reject) => {
                let attempts = 10;
                let failureCount = 0;
                let done = false;
                let uploadedChunkSize = 0;
                let chunkIndex = 0;
                let delay = 1000;
                Async.do(() => {
                    // get the next unsent part and send it
                    return this.waitForConnectivity().then(() => {
                        return this.pull().then((blob) => {
                            if (this.canceled) {
                                throw new Error('Stream was canceled');
                            }
                            let formData = new FormData;
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
                            let options = {
                                responseType: 'json',
                                onUploadProgress: (evt) => {
                                    if (blob) {
                                        // evt.loaded and evt.total are encoded sizes, which are slightly larger than the blob size
                                        let bytesSentFromChunk = Math.round(blob.size * (evt.loaded / evt.total));
                                        if (bytesSentFromChunk) {
                                            this.updateProgress(uploadedChunkSize + bytesSentFromChunk);
                                        }
                                    }
                                },
                            };
                            this.chunkPromise = HTTPRequest.fetch('POST', this.url, formData, options);
                            return this.chunkPromise.then((response) => {
                                if (blob) {
                                    this.finalize(blob);
                                    uploadedChunkSize += blob.size;
                                }
                                if (chunkIndex === 0) {
                                    // resolve promsie after sending first chunk
                                    resolve();
                                }
                                chunkIndex++;
                            }).finally(() => {
                                this.chunkPromise = null;
                            });
                        }).catch((err) => {
                            if (!this.canceled) {
                                // don't immediately fail unless it's a HTTP error
                                if (!(err.statusCode >= 400 && err.statusCode <= 499 && err.statusCode !== 429)) {
                                    if (++failureCount < attempts) {
                                        // try again after a delay
                                        delay = Math.min(delay * 2, 30 * 1000);
                                        return Promise.delay(delay);
                                    }
                                }
                            }
                            throw err;
                        });
                    });
                });
                Async.while(() => { return !done });
                Async.end().then(() => {
                    this.finished = true;
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
                    } else {
                        // send abort request
                        let formData = new FormData;
                        formData.append('abort', 1);
                        return HTTPRequest.fetch('POST', this.url, formData).catch((err) => {
                            // ignore error
                        }).finally(() => {
                            if (this.onError) {
                                this.onError(err);
                            }
                        });
                    }
                });
            });
        });
        return this.promise;
    }

    /**
     * Cancel a stream
     */
    cancel() {
        if (!this.canceled) {
            if (!this.finished) {
                this.canceled = true;
                if (this.chunkPromise && this.chunkPromise.isPending()) {
                    this.chunkPromise.cancel();
                }
            }
        }
    }

    /**
     * Report upload progress
     *
     * @param  {Number} transferred
     */
    updateProgress(transferred) {
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
    }
}

/**
 * Return an object containing a promise and its resolve/reject functions
 *
 * @return {Object}
 */
function deferResult() {
    let props = {};
    props.promise = new Promise((resolve, reject) => {
        props.resolve = resolve;
        props.reject = reject;
    });
    return props;
}

export {
    BlobStream as default,
    BlobStream,
};
