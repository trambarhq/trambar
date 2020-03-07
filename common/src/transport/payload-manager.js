import _ from 'lodash';
import { EventEmitter, GenericEvent } from 'relaks-event-emitter';
import { BlobStream } from './blob-stream.js';
import { Payload } from './payload.js';
import { performHTTPRequest } from './http-request.js';
import { CordovaFile } from './cordova-file.js';
import { initializeBackgroundTransfer, } from './background-file-transfer.js';
import { generateToken } from '../utils/random-token.js';
import { HTTPError, FileError } from '../errors.js';
import { delay } from '../utils/delay.js';

const defaultOptions = {
  uploadURL: null,
  streamURL: null,
};

class PayloadManager extends EventEmitter {
  constructor(options) {
    super();
    this.active = false;
    this.options = _.defaults({}, options, defaultOptions);
    this.payloads = [];
    this.streams = [];
    this.initialized = false;
    this.progressInterval = undefined;
  }

  activate() {
    if (!this.active) {
      if (!this.initialized) {
        initializeBackgroundTransfer();
        this.initialized = true;
      }
      this.active = true;

      if (this.onConnectivity) {
        this.onConnectivity();
        this.connectivityPromise = null;
      }
      this.restartPayloads(this.payloads);
      this.progressInterval = setInterval(() => {
        this.updatePayloadsBackendProgress();
      }, 10000);
    }
  }

  deactivate() {
    if (this.active) {
      this.active = false;

      this.pausePayloads(this.payloads);
      this.progressInterval = clearInterval(this.progressInterval);
    }
  }

  /**
   * Add a payload
   *
   * @param  {Object} destination
   * @param  {String} type
   *
   * @return {Payload}
   */
  add(destination, type) {
    let id = generateToken();
    let payload = new Payload(id, destination, type);
    payload.onAttachment = this.handleAttachment;
    this.payloads.push(payload);
    return payload;
  }

  /**
   * Send blobs to server as they're added into a BlobStream
   *
   * @return {BlobStream}
   */
  stream(destination, options) {
    let id = generateToken();
    let url = this.getStreamURL(destination, id);
    let stream = new BlobStream(id, url);
    if (!this.active) {
      stream.suspend();
    }
    this.streams.push(stream);
    return stream;
  }

  /**
   * Start sending payloads
   *
   * @param  {Array<String>} ids
   */
  dispatch(ids) {
    let payloads = _.filter(this.payloads, (payload) => {
      return _.includes(ids, payload.id);
    });
    this.dispatchPayloads(payloads);
  }

  /**
   * Cancel payloads
   *
   * @param  {Array<String>} ids
   */
  abandon(ids) {
    let payloads = _.filter(this.payloads, (payload) => {
      return _.includes(ids, payload.id);
    });
    if (!_.isEmpty(payloads)) {
      for (let payload of payloads) {
        payload.cancel();
      }
      _.pullAll(this.payloads, payloads);
      this.triggerEvent(new PayloadManagerEvent('change', this));
    }
  }

  /**
   * Obtain progress about a bunch of payloads
   *
   * @param  {Array<String>} ids
   * @param  {Object|undefined} destination
   *
   * @return {Object|null}
   */
  inquire(ids, destination) {
    if (_.isEmpty(ids)) {
      return null;
    }
    let payloads = _.filter(this.payloads, (payload) => {
      return _.includes(ids, payload.id) && payload.type !== 'unknown';
    });
    if (payloads.length < ids.length) {
      // some payloads are not there, either because they were sent by
      // another browser or a page refresh occurred
      for (let id of ids) {
        let payload = _.find(this.payloads, { id });
        if (!payload) {
          // recreate it (if we know the destination)
          if (destination) {
            payload = new Payload(id, destination, 'unknown');
            this.payloads.push(payload);
          }
        }
      }
      return { action: 'unknown', progress: undefined };
    }

    // see if uploading is complete
    let uploadingSize = 0;
    let uploadingProgress = 0;
    for (let payload of payloads) {
      uploadingSize += payload.getSize();
      uploadingProgress += payload.getUploaded();
    }
    uploadingProgress = (uploadingSize > 0) ? Math.round(uploadingProgress / uploadingSize * 100) : 100;
    if (uploadingProgress < 100) {
      return {
        action: 'uploading',
        progress: uploadingProgress
      };
    } else {
      if (_.some(payloads, { failed: true })) {
        return {
          action: 'failed',
        };
      }

      // maybe a web-site preview is being rendered
      let renderingPayloads = _.filter(payloads, (payload) => {
        return payload.type === 'web-site';
      });
      if (_.some(renderingPayloads, { completed: false })) {
        let renderingProgress = _.round(_.sum(_.map(renderingPayloads, (payload) => {
          return payload.processed / renderingPayloads.length;
        })));
        return {
          action: 'rendering',
          progress: Math.round(renderingProgress),
        }
      };

      // uploading is done--see if transcoding is occurring at the backend
      let transcodingPayloads = _.filter(payloads, (payload) => {
        return payload.type === 'video' || payload.type === 'audio';
      });
      if (_.some(transcodingPayloads, { completed: false })) {
        let transcodingProgress = _.round(_.sum(_.map(transcodingPayloads, (payload) => {
          return payload.processed / transcodingPayloads.length;
        })));
        return {
          action: 'transcoding',
          progress: Math.round(transcodingProgress),
        };
      }
    }
    return null;
  }

  /**
   * Return the number of files and bytes remaining
   *
   * @return {Object|null}
   */
  getUploadProgress() {
    let bytes = 0;
    let files = 0;
    for (let payload of this.payloads) {
      if (payload.started) {
        if (!payload.failed && !payload.sent) {
          files += payload.getRemainingFiles();
          bytes += payload.getRemainingBytes();
        }
      }
    }
    return (files > 0) ? { files, bytes } : null;
  }

  /**
   * Obtain URL for uploading a file or posting a request
   *
   * @param  {Payload} payload
   * @param  {String} part
   *
   * @return {String}
   */
  getUploadURL(payload, part) {
    let { uploadURL } = this.options;
    if (!uploadURL) {
      throw new Error('Upload URL is not specified');
    }
    if (uploadURL instanceof Function) {
      return uploadURL(payload.destination, payload.id, payload.type, part.name);
    } else {
      let url = uploadURL;
      url += (url.indexOf('?') === -1) ? '?' : '&';
      let queryVars = [
        `id=${payload.id}`,
        `type=${payload.type}`,
        `part=${part}`,
      ];
      url += queryVars.join('&');
      return url;
    }
  }

  /**
   * Obtain URL for streaming a file to remote server
   *
   * @param  {Object} destination
   * @param  {String} id
   *
   * @return {String}
   */
  getStreamURL(destination, id) {
    let { streamURL } = this.options;
    if (!streamURL) {
      throw new Error('Stream URL is not specified');
    }
    if (streamURL instanceof Function) {
      return streamURL(destination, id);
    } else {
      let url = uploadURL;
      url += (url.indexOf('?') === -1) ? '?' : '&';
      let queryVars = [
        `id=${id}`,
      ];
      url += queryVars.join('&');
      return url;
    }
  }

  /**
   * Acquire permission for payloads and send them
   *
   * @param  {Array<Payload>} payloads
   */
  async dispatchPayloads(payloads) {
    let payloadGroups = separatePayloads(payloads);
    for (let payloadGroup of payloadGroups) {
      let { destination, payloads } = payloadGroup;
      let acquired = await this.acquirePermission(destination, payloads);
      if (acquired) {
        for (let payload of payloads) {
          this.sendPayload(payload);
        }
        this.triggerEvent(new PayloadManagerEvent('change', this));
      }
    }
  }

  /**
   * Update backend progress of payloads
   *
   * @param  {Object|null} destination
   *
   * @return {Promise}
   */
  async updatePayloadsBackendProgress(destination) {
    if (!this.active) {
      return false;
    }
    let inProgressPayloads = _.filter(this.payloads, {
      sent: true,
      completed: false,
    });
    let payloadGroups = separatePayloads(inProgressPayloads);
    for (let payloadGroup of payloadGroups) {
      if (!destination || _.isEqual(payloadGroup.destination, destination)) {
        let updated = await this.requestBackendUpdate(payloadGroup);
        if (updated) {
          this.triggerEvent(new PayloadManagerEvent('change', this));
        }
      }
    }
  }

  /**
   * Emit a "permission" event in expectance of a listener performing the
   * necessary action to gain permission for uploading a file
   *
   * @param  {Object} destination
   * @param  {Array<Payloads>} payloads
   *
   * @return {Promise}
   */
  async acquirePermission(destination, payloads) {
    let unapprovedPayloads = _.filter(payloads, { approved: false });
    if (_.isEmpty(unapprovedPayloads)) {
      return;
    }
    // set approved to true immediately to prevent it being sent again
    for (let payload of unapprovedPayloads) {
      payload.approved = true;
    }
    try {
      let event = new PayloadManagerEvent('permission', this, {
        destination,
        payloads: unapprovedPayloads
      });
      this.triggerEvent(event);
      await event.waitForDecision();
      // default action is to proceed with the upload
      if (!event.defaultPrevented) {
        return true;
      } else {
        return false;
      }
    } catch (err) {
      for (let payload of unapprovedPayloads) {
        // set it back to false
        payload.approved = false;
        payload.error = err;
      }
      return false;
    }
  }

  /**
   * Emit a "backendprogress" event in expectance of a listener updating
   * the payloads with progress information from the backend
   *
   * @param  {Object} payloadGroup
   *
   * @return {Promise}
   */
  async requestBackendUpdate(payloadGroup) {
    try {
      let event = new PayloadManagerEvent('backendprogress', this, payloadGroup);
      this.triggerEvent(event);
      await event.waitForDecision();
      return event.defaultPrevented;
    } catch (err) {
      return false;
    }
  }

  /**
   * Resolve immediately if active = true, otherwise wait for resume()
   * to be called
   *
   * @return {Promise}
   */
  async waitForConnectivity() {
    if (this.active) {
      return;
    }
    if (!this.connectivityPromise) {
      this.connectivityPromise = new Promise((resolve, reject) => {
        this.onConnectivity = resolve;
      });
    }
    return this.connectivityPromise;
  }

  /**
   * Send the payload
   *
   * @param  {Payload} payload
   *
   * @return {Promise}
   */
  async sendPayload(payload) {
    if (payload.started) {
      return;
    }
    if (!payload.approved) {
      throw new HTTPError(403);
    }
    payload.started = true;
    payload.uploadStartTime = (new Date).toISOString();
    for (let part of payload.parts) {
      let retryInterval = 1000;
      while (!part.sent && !payload.canceled) {
        try {
          await this.waitForConnectivity();
          let response = await this.sendPayloadPart(payload, part);
          part.sent = true;
          this.triggerEvent(new PayloadManagerEvent('uploadpart', this, {
            destination: payload.destination,
            payload,
            part,
            response,
          }));
        } catch (err) {
          if (err.statusCode >= 400 && err.statusCode <= 499) {
            throw err;
          }
          // wait a bit then try again
          retryInterval = Math.min(retryInterval * 2, 10 * 1000);
          await delay(retryInterval);
        }
      }
    }
    payload.sent = true;
    payload.uploadEndTime = (new Date).toISOString();
    if (payload.onComplete) {
      payload.onComplete(new PayloadManagerEvent('complete', payload, {
        destination: payload.destination,
      }));
    }
    this.triggerEvent(new PayloadManagerEvent('uploadcomplete', this, {
      destination: payload.destination,
      payload
    }));
    this.triggerEvent(new PayloadManagerEvent('change', this));
  }

  /**
   * Send a part of the payload
   *
   * @param  {Payload} payload
   * @param  {Object} part
   *
   * @return {Promise}
   */
  async sendPayloadPart(payload, part) {
    if (part.stream) {
      return this.sendPayloadStream(payload, part);
    } else if (part.blob) {
      return this.sendPayloadBlob(payload, part);
    } else if (part.cordovaFile) {
      return this.sendPayloadCordovaFile(payload, part);
    } else if (part.url) {
      return this.sendPayloadURL(payload, part);
    }
  }

  /**
   * Send a blob in the payload to remote server
   *
   * @param  {Payload} payload
   * @param  {Object} part
   *
   * @return {Promise}
   */
  async sendPayloadBlob(payload, part) {
    let url = this.getUploadURL(payload, part);
    let blob = part.blob;
    let formData = new FormData;
    formData.append('file', blob);
    for (let [ name, value ] of _.entries(part.options)) {
      formData.append(name, value);
    }
    let options = {
      responseType: 'json',
      onUploadProgress: (evt) => {
        if (evt.lengthComputable) {
          this.updatePayloadProgress(payload, part, evt.loaded / evt.total)
        }
      },
    };
    part.uploaded = 0;
    part.promise = performHTTPRequest('POST', url, formData, options);
    let res = await part.promise;
    return res;
  }

  /**
   * Send a local file in the payload to remote server
   *
   * @param  {Payload} payload
   * @param  {Object} part
   *
   * @return {Promise<Object>}
   */
  async sendPayloadCordovaFile(payload, part) {
    let url = this.getUploadURL(payload, part);
    let file = part.cordovaFile;
    let index = _.indexOf(this.parts, part);
    let token = `${this.id}-${index + 1}`;
    part.uploaded = 0;
    part.promise = new Promise((resolve, reject) => {
      let options ={
        onSuccess: (upload) => {
          this.updatePayloadProgress(payload, part, 1);
          resolve(upload.serverResponse);
        },
        onError: (err) => {
          reject(err);
        },
        onProgress: (upload) => {
          this.updatePayloadProgress(payload, part, upload.progress / 100);
        },
      };
      performBackgroundTransfer(token, file.fullPath, url, options);
    });
    part.promise.cancel = () => {
      cancelBackgroundTransfer(token);
    };
    let res = await part.promise;
    if (!(res instanceof Object)) {
      // plugin didn't automatically decode JSON response
      try {
        res = JSON.parse(res);
      } catch(err) {
        res = {};
      }
    }
    return res;
  }

  /**
   * Send a stream ID to remote server
   *
   * @param  {Payload} payload
   * @param  {Object} part
   *
   * @return {Promise<Object>}
   */
  async sendPayloadStream(payload, part) {
    let url = this.getUploadURL(payload, part);
    let stream = part.stream;
    stream.resume();
    stream.onProgress = (evt) => {
      this.updatePayloadProgress(payload, part, evt.loaded / evt.total)
    };
    // start the stream first and wait for the first chunk to be sent
    await stream.start();
    let options = {
      responseType: 'json',
      contentType: 'json',
    };
    return performHTTPRequest('POST', url, { stream: stream.id }, options);
  }

  /**
   * Send a URL to remote server
   *
   * @param  {Payload} payload
   * @param  {Object} part
   *
   * @return {Promise<Object>}
   */
  sendPayloadURL(payload, part) {
    let url = this.getUploadURL(payload, part);
    let options = {
      responseType: 'json',
      contentType: 'json',
    };
    let body = _.extend({ url: part.url }, part.options);
    part.promise = performHTTPRequest('POST', url, body, options);
    return part.promise;
  }

  /**
   * Cancel a payload
   *
   * @param  {Payload} payload
   *
   * @return {Promise}
   */
  async cancelPayload(payload) {
    if (payload.started) {
      if (!payload.completed) {
        if (!payload.failed && !payload.canceled) {
          payload.canceled = true;
          for (let part of payload.parts) {
            if (!part.sent) {
              await this.cancelPart(payload, part);
            }
          }
        }
      }
    }
    return false;
  }

  /**
   * Cancel a part of the payload
   *
   * @param  {Payload} payload
   * @param  {Object} part
   *
   * @return {Promise}
   */
  cancelPayloadPart(payload, part) {
    if (part.stream) {
      return this.cancelStream(payload, part);
    } else if (part.blob) {
      return this.cancelBlob(payload, part);
    } else if (part.cordovaFile) {
      return this.cancelCordovaFile(payload, part);
    } else if (part.url) {
      return this.cancelURL(payload, part);
    }
  };

  /**
   * Cancel stream upload
   *
   * @param  {Payload} payload
   * @param  {Object} part
   *
   * @return {Promise}
   */
  async cancelPayloadStream(payload, part) {
    try {
      part.stream.cancel();
    } catch (err) {
    }
  };

  /**
   * Cancel file upload
   *
   * @param  {Payload} payload
   * @param  {Object} part
   *
   * @return {Promise}
   */
  async cancelPayloadBlob(payload, part) {
    try {
      if (part.promise && part.promise.isPending()) {
        return part.promise.cancel();
      }
    } catch (err) {
    }
  }

  /**
   * Cancel file upload
   *
   * @param  {Payload} payload
   * @param  {Object} part
   *
   * @return {Promise}
   */
  async cancelPayloadCordovaFile(payload, part) {
    try {
      let index = _.indexOf(this.parts, part);
      let token = `${payload.id}-${index + 1}`;
      cancelBackgroundTransfer(token)
    } catch (err) {
    }
  }

  /**
   * Cancel sending of URL
   *
   * @param  {Payload} payload
   * @param  {Object} part
   *
   * @return {Promise}
   */
  async cancelPayloadURL(payload, part) {
    try {
      if (part.promise && part.promise.isPending()) {
        part.promise.cancel();
      }
    } catch (err) {
    }
  }

  /**
   * Pause stream uploading
   *
   * @param  {Array<Payload>} payloads
   */
  pausePayloads(payloads) {
    for (let payload of payloads) {
      if (payload.started) {
        for (let part of payload.parts) {
          if (part.stream) {
            if (!part.stream.finished) {
              part.stream.suspend();
            }
          }
        }
      }
    }
  }

  /**
   * Restart stream uploading
   *
   * @param  {Array<Payload>} payloads
   */
  restartPayloads(payloads) {
    for (let payload of payloads) {
      if (payload.started) {
        for (let part of payload.parts) {
          if (part.stream) {
            if (!part.stream.finished) {
              part.stream.resume();
            }
          }
        }
      }
    }
  }

  /**
   * Update progress of a given part and trigger change event
   *
   * @param  {Object} part
   * @param  {Number} completed
   */
  updatePayloadProgress(payload, part, completed) {
    if (completed > 0) {
      part.uploaded = Math.round(part.size * completed);
      if (this.active) {
        if (payload.onProgress) {
          payload.onProgress(new PayloadManagerEvent('progress', payload, {
            loaded: payload.getUploaded(),
            total: payload.getSize(),
            lengthComputable: true,
          }));
        }
        this.triggerEvent(new PayloadManagerEvent('change', this));
      }
    }
  }

  /**
   * Relay attachment events to listener
   *
   * @param  {Object} evt
   */
  handleAttachment = (evt) => {
    let { part, target } = evt;
    this.triggerEvent(new PayloadManagerEvent('attachment', this, {
      payload: target,
      part,
    }));
  }
}

/**
 * Group payloads by destination
 *
 * @param  {Array<Payload>} payloads
 *
 * @return {Array<Object>}
 */
function separatePayloads(payloads) {
  let groups = [];
  for (let payload of payloads) {
    let group = _.find(groups, (group) => {
      return _.isEqual(group.destination, payload.destination);
    });
    if (group) {
      group.payloads.push(payload);
    } else {
      group = {
        destination: payload.destination,
        payloads: [ payload ],
      };
      groups.push(group);
    }
  }
  return groups;
}

class PayloadManagerEvent extends GenericEvent {
}

export {
  PayloadManager as default,
  PayloadManager,
  PayloadManagerEvent,
};
