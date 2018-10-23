import _ from 'lodash';
import Promise from 'bluebird';
import Moment from 'moment';
import EventEmitter, { GenericEvent } from 'relaks-event-emitter';
import BlobStream from 'transport/blob-stream';
import Payload from 'transport/payload';
import * as HTTPRequest from 'transport/http-request';
import CordovaFile from 'transport/cordova-file';
import * as BackgroundFileTransfer from 'transport/background-file-transfer';
import * as RandomToken from 'utils/random-token';
import HTTPError from 'errors/http-error';
import FileError from 'errors/file-error';
import Async from 'async-do-while';

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
    }

    activate() {
        if (!this.active) {
            if (!this.initialized) {
                BackgroundFileTransfer.initialize();
                this.initialized = true;
            }
            this.active = true;

            if (this.onConnectivity) {
                this.onConnectivity();
                this.connectivityPromise = null;
            }
            this.restartPayloads(this.payloads);
        }
    }

    deactivate() {
        if (this.active) {
            this.active = false;

            this.pausePayloaders(this.payloads);
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
        let id = RandomToken.generate();
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
        let id = RandomToken.generate();
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
            _.each(payloads, (payload) => {
                payload.cancel();
            });
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
            return _.includes(ids, payload.id);
        });
        if (payloads.length < ids.length) {
            // some payloads are not there, either because they were sent by
            // another browser or a page refresh occurred
            _.each(ids, (id) => {
                let payload = _.find(this.payloads, { id });
                if (!payload) {
                    // recreate it (if we know the destination)
                    if (destination) {
                        payload = new Payload(id, destination, 'unknown');
                        this.payloads.push(payload);
                    }
                }
            });
            return { action: 'unknown', progress: undefined };
        }

        // see if uploading is complete
        let uploadingSize = 0;
        let uploadingProgress = 0;
        _.each(payloads, (payload) => {
            uploadingSize += payload.getSize();
            uploadingProgress += payload.getUploaded();
        });
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
        _.each(this.payloads, (payload) => {
            if (payload.started) {
                if (!payload.failed && !payload.sent) {
                    files += payload.getRemainingFiles();
                    bytes += payload.getRemainingBytes();
                }
            }
        });
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
    dispatchPayloads(payloads) {
        let payloadGroups = separatePayloads(payloads);
        _.each(payloadGroups, (payloadGroup) => {
            let { destination, payloads } = payloadGroup;
            this.acquirePermission(destination, payloads).then((acquired) => {
                if (acquired) {
                    _.each(payloads, (payload) => {
                        this.sendPayload(payload);
                    });
                    this.triggerEvent(new PayloadManagerEvent('change', this));
                }
                return null;
            });
        });
    }

    /**
     * Update backend progress of payloads
     *
     * @param  {Array<Payload>} payloads
     */
    updatePayloadsBackendProgress() {
        let payloadGroups = separatePayloads(payloads);
        _.each(payloadGroups, (payloadGroup) => {
            let { destination, payloads } = payloadGroup;
            this.requestBackendUpdate(destination, payloads).then((updated) => {
                if (updated) {
                    this.triggerEvent(new PayloadManagerEvent('change', this));
                }
                return null;
            });
        });
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
    acquirePermission(destination, payloads) {
        let unapprovedPayloads = _.filter(payloads, { approved: false });
        if (_.isEmpty(unapprovedPayloads)) {
            return Promise.resolve();
        }
        let event = new PayloadManagerEvent('permission', this, {
            destination,
            payloads: unapprovedPayloads
        });
        this.triggerEvent(event);
        return event.waitForDecision().then(() => {
            // default action is to proceed with the upload
            if (!event.defaultPrevented) {
                _.each(unapprovedPayloads, (payload) => {
                    payload.approved = true;
                });
                return true;
            } else {
                return false;
            }
        }).catch((err) => {
            _.each(unapprovedPayloads, (payload) => {
                payload.error = err;
            });
            return false;
        });
    }

    /**
     * Emit a "backendprogress" event in expectance of a listener updating
     * the payloads with progress information from the backend
     *
     * @param  {Object} destination
     * @param  {Array<Payloads>} payloads
     *
     * @return {Promise}
     */
    requestBackendUpdate(destination, payloads) {
        let inProgressPayloads = _.filter(this.payloads, {
            sent: true,
            completed: false,
        });
        let event = new PayloadManagerEvent('backendprogress', this, {
            destination,
            payloads: inProgressPayloads
        });
        this.triggerEvent(event);
        return event.waitForDecision().then(() => {
            return event.defaultPrevented;
        }).catch((err) => {
            return false;
        });
    }

    /**
     * Resolve immediately if active = true, otherwise wait for resume()
     * to be called
     *
     * @return {Promise}
     */
    waitForConnectivity() {
        if (this.active) {
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
     * Send the payload
     *
     * @param  {Payload} payload
     */
    sendPayload(payload) {
        if (payload.started) {
            return;
        }
        if (!payload.approved) {
            throw new HTTPError(403);
        }
        payload.started = true;
        payload.uploadStartTime = Moment().toISOString();
        Promise.each(payload.parts, (part) => {
            var sent = false;
            var attempts = 1;
            var delay = 1000;
            Async.do(() => {
                return this.waitForConnectivity().then(() => {
                    return this.sendPayloadPart(payload, part).then((response) => {
                        sent = part.sent = true;
                        this.triggerEvent(new PayloadManagerEvent('uploadpart', this, {
                            destination: payload.destination,
                            payload,
                            part,
                            response,
                        }));
                    }).catch((err) => {
                        if (err.statusCode >= 400 && err.statusCode <= 499) {
                            throw err;
                        }
                        // wait a bit then try again
                        delay = Math.min(delay * 2, 10 * 1000);
                        return Promise.delay(delay).then(() => {
                            if (!payload.canceled) {
                                attempts++;
                            }
                        });
                    });
                });
            });
            Async.while(() => {
                return !sent && !payload.canceled;
            });
            return Async.end();
        }).then(() => {
            payload.sent = true;
            payload.uploadEndTime = Moment().toISOString();
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
        });
    }

    /**
     * Send a part of the payload
     *
     * @param  {Payload} payload
     * @param  {Object} part
     *
     * @return {Promise}
     */
    sendPayloadPart(payload, part) {
        if (part.stream) {
            return this.sendPayloadStream(payload, part);
        } else if (part.blob) {
            return this.sendPayloadBlob(payload, part);
        } else if (part.cordovaFile) {
            return this.sendPayloadCordovaFile(payload, part);
        } else if (part.url) {
            return this.sendPayloadURL(payload, part);
        } else {
            return Promise.resolve();
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
    sendPayloadBlob(payload, part) {
        var url = this.getUploadURL(payload, part);
        var blob = part.blob;
        var formData = new FormData;
        formData.append('file', blob);
        _.each(part.options, (value, name) => {
            formData.append(name, value);
        });
        var options = {
            responseType: 'json',
            onUploadProgress: (evt) => {
                if (evt.lengthComputable) {
                    this.updatePayloadProgress(payload, part, evt.loaded / evt.total)
                }
            },
        };
        part.uploaded = 0;
        part.promise = HTTPRequest.fetch('POST', url, formData, options);
        return part.promise;
    }

    /**
     * Send a local file in the payload to remote server
     *
     * @param  {Payload} payload
     * @param  {Object} part
     *
     * @return {Promise<Object>}
     */
    sendPayloadCordovaFile(payload, part) {
        var url = this.getUploadURL(payload, part);
        var file = part.cordovaFile;
        return new Promise((resolve, reject) => {
            var index = _.indexOf(this.parts, part);
            var token = `${this.id}-${index + 1}`;
            var options ={
                onSuccess: (upload) => {
                    resolve(upload.serverResponse);
                },
                onError: (err) => {
                    reject(err);
                },
                onProgress: (upload) => {
                    if (evt.lengthComputable) {
                        this.updatePayloadProgress(payload, part, upload.progress / 100);
                    }
                },
            };

            BackgroundFileTransfer.send(token, file.fullPath, url, options);
            part.uploaded = 0;
        }).then((res) => {
            if (!(res instanceof Object)) {
                // plugin didn't automatically decode JSON response
                try {
                    res = JSON.parse(res);
                } catch(err) {
                    res = {};
                }
            }
            return res;
        });
    }

    /**
     * Send a stream ID to remote server
     *
     * @param  {Payload} payload
     * @param  {Object} part
     *
     * @return {Promise<Object>}
     */
    sendPayloadStream(payload, part) {
        var url = this.getUploadURL(payload, part);
        var stream = part.stream;
        stream.resume();
        stream.onProgress = (evt) => {
            this.updatePayloadProgress(payload, part, evt.loaded / evt.total)
        };
        // start the stream first and wait for the first chunk to be sent
        return stream.start().then(() => {
            var options = {
                responseType: 'json',
                contentType: 'json',
            };
            return HTTPRequest.fetch('POST', url, { stream: stream.id }, options);
        });
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
        var url = this.getUploadURL(payload, part);
        var options = {
            responseType: 'json',
            contentType: 'json',
        };
        var body = _.extend({ url: part.url }, part.options);
        part.promise = HTTPRequest.fetch('POST', url, body, options);
        return part.promise;
    }

    /**
     * Cancel a payload
     *
     * @param  {Payload} payload
     *
     * @return {Promise}
     */
    cancelPayload(payload) {
        if (payload.started) {
            if (!payload.completed) {
                if (!payload.failed && !payload.canceled) {
                    payload.canceled = true;
                    return Promise.each(payload.parts, (part) => {
                        if (!part.sent) {
                            return this.cancelPart(payload, part);
                        }
                    }).then(() => {
                        return true;
                    });
                }
            }
        }
        return Promise.resolve(false);
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
        } else {
            return Promise.resolve();
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
    cancelPayloadStream(payload, part) {
        return Promise.try(() => {
            return part.stream.cancel();
        }).catch((err) => {
        });
    };

    /**
     * Cancel file upload
     *
     * @param  {Payload} payload
     * @param  {Object} part
     *
     * @return {Promise}
     */
    cancelPayloadBlob(payload, part) {
        return Promise.try(() => {
            if (part.promise && part.promise.isPending()) {
                return part.promise.cancel();
            }
        }).catch((err) => {
        });
    }

    /**
     * Cancel file upload
     *
     * @param  {Payload} payload
     * @param  {Object} part
     *
     * @return {Promise}
     */
    cancelPayloadCordovaFile(payload, part) {
        return Promise.try(() => {
            var index = _.indexOf(this.parts, part);
            var token = `${payload.id}-${index + 1}`;
            return BackgroundFileTransfer.cancel(token);
        }).catch((err) => {
        });
    }

    /**
     * Cancel sending of URL
     *
     * @param  {Payload} payload
     * @param  {Object} part
     *
     * @return {Promise}
     */
    cancelPayloadURL(payload, part) {
        return Promise.try(() => {
            if (part.promise && part.promise.isPending()) {
                return part.promise.cancel();
            }
        }).catch((err) => {
        });
    }

    /**
     * Pause stream uploading
     *
     * @param  {Array<Payload>} payloads
     */
    pausePayloads(payloads) {
        _.each(payloads, (payload) => {
            if (payload.started) {
                _.each(payload.parts, (part) => {
                    if (part.stream) {
                        if (!part.stream.finished) {
                            part.stream.suspend();
                        }
                    }
                });
            }
        });
    }

    /**
     * Restart stream uploading
     *
     * @param  {Array<Payload>} payloads
     */
    restartPayloads(payloads) {
        _.each(payloads, (payload) => {
            if (payload.started) {
                _.each(payload.parts, (part) => {
                    if (part.stream) {
                        if (!part.stream.finished) {
                            part.stream.resume();
                        }
                    }
                });
            }
        });
    }

    /**
     * Update progress of a given part and trigger change event
     *
     * @param  {Object} part
     * @param  {Number} completed
     */
    updatePayloadProgress(payload, part, completed) {
        if (completed) {
            part.uploaded = Math.round(part.size * completed);
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
    _.each(payloads, (payload) => {
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
    })
    return groups;
}

class PayloadManagerEvent extends GenericEvent {
}

export {
    PayloadManager as default,
    PayloadManager,
    PayloadManagerEvent,
};
