import { performHTTPRequest } from './http-request.js';
import { promiseSelf } from '../utils/promise-self.js';
import { delay } from '../utils/delay.js';

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
    this.initialChunkPromise = null;
    this.resumptionPromise = null;
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
    const blobs = this.parts.map(p => p.blob);
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
    this.options = { ...this.options, ...options };
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
    let unsent = this.parts.find(p => !p.sent);
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
   * @return {Blob}
   */
  async pull() {
    const unsent = this.parts.find(p => !p.sent);
    if (unsent) {
      return unsent.blob;
    } else {
      if (this.closed) {
        return null;
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
    const part = this.parts.find(p => p.blob === blob);
    if (part) {
      part.sent = true;
    }
    if (this.waitResult) {
      const unsent = this.parts.find(p => !p.sent);
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
   */
  async wait() {
    if (this.closed) {
      if (this.error) {
        throw this.error;
      }
      const unsent = this.parts.find(p => !p.sent);
      if (!unsent) {
        return;
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
   * @param  {number} chunkSize
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
      this.suspended = true;
      this.resumptionPromise = promiseSelf();
    }
  }

  /**
   * Indicate connectivity has been regained
   */
  resume() {
    if (this.suspended) {
      let promise = this.resumptionPromise;
      this.suspended = false;
      this.resumptionPromise = null;
      promise.resolve();
    }
  }

  /**
   * Start streaming data to remote server
   *
   * @return {Object}
   */
  async start() {
    if (!this.initialChunkPromise) {
      // send the first chunk and return that promise
      this.initialChunkPromise = this.sendNextChunk(0);

      // send the remaining chunks without waiting for them to finish
      this.sendRemainingChunks();
    }
    return this.initialChunkPromise;
  }

  /**
   * Wait for initial chunk to get sent then send all chunks
   */
  async sendRemainingChunks() {
    await this.initialChunkPromise;
    try {
      let index = 1;
      while (!this.finished) {
        await this.sendNextChunk(index++);
      }

      if (this.onComplete) {
        this.onComplete({
          type: 'complete',
          target: this,
        });
      }
    } catch (err) {
      // send abort request
      let formData = new FormData;
      formData.append('abort', 1);
      try {
        await performHTTPRequest('POST', this.url, formData);
      } catch (err) {
        // ignore error
      }
      if (this.onError) {
        this.onError(err);
      }
    }
  }

  /**
   * Send the next chunk
   *
   * @param  {number}  index
   *
   * @return {Object|undefined}
   */
  async sendNextChunk(index) {
    let transferredBefore = this.transferred;
    let lastError = null;
    let successful = false;
    let unrecoverable = false;
    let more = true;
    let retryInterval = 1000;
    let result;
    for (let attempt = 0; attempt < 10 && !successful && !unrecoverable; attempt++) {
      try {
        if (this.suspended) {
          await this.resumptionPromise;
        }
        if (this.canceled) {
          throw new Error('Operation canceled');
        }

        const blob = await this.pull();
        if (!this.started) {
          this.started = true;
        }
        const options = { responseType: 'json' };
        const formData = new FormData;
        if (blob) {
          formData.append('file', blob);
          formData.append('chunk', index);
          if (index === 0) {
            if (this.options) {
              for (let [ name, value ] of Object.entries(this.options)) {
                formData.append(name, value);
              }
            }
          }
          options.onUploadProgress = (evt) => {
            // evt.loaded and evt.total are encoded sizes, which are slightly larger than the blob size
            const bytesSentFromChunk = Math.round(blob.size * (evt.loaded / evt.total));
            if (bytesSentFromChunk) {
              this.transferred = transferredBefore + bytesSentFromChunk;
              if (this.onProgress) {
                this.onProgress({
                  type: 'progress',
                  target: this,
                  loaded: this.transferred,
                  total: this.size,
                  lengthComputable: this.closed,
                });
              }
            }
          };
        } else {
          // the server recognize that an empty payload means we've
          // reached the end of the stream
          more = false;
        }
        // save the promise so we can cancel
        this.chunkPromise = performHTTPRequest('POST', this.url, formData, options);
        result = await this.chunkPromise;
        this.finalize(blob);
        successful = true;
      } catch (err) {
        lastError = err;

        // fail immediately if it's a HTTP 4XX error
        if (err.statusCode >= 400 && err.statusCode <= 499 && err.statusCode !== 429) {
          unrecoverable = true;
        } else if (err instanceof TypeError) {
          unrecoverable = true;
        } else if (this.canceled) {
          unrecoverable = true;
        } else {
          // try again after a delay
          retryInterval = Math.min(retryInterval * 2, 30 * 1000);
          await delay(retryInterval);
        }
      }
      this.chunkPromise = null;
    }
    if (lastError) {
      // restore the original amount
      this.transferred = transferredBefore;
      throw lastError;
    }
    if (!more) {
      this.finished = true;
    }
    return result;
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
        if (this.suspended) {
          this.resume();
        }
      }
    }
  }
}

/**
 * Return an object containing a promise and its resolve/reject functions
 *
 * @return {Object}
 */
function deferResult() {
  const props = {};
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
