var _ = require('lodash');
var Promise = require('bluebird');
var BlobStream = require('transport/blob-stream');
var BlobManager = require('transport/blob-manager');
var HTTPRequest = require('transport/http-request');
var HTTPError = require('errors/http-error');
var FileError = require('errors/file-error');
var RandomToken = require('utils/random-token');

if (process.env.PLATFORM === 'cordova') {
    var CordovaFile = require('utils/cordova-file');
}

module.exports = Payload;

function Payload(address, schema, type, token) {
    this.address = address;
    this.schema = schema;
    this.type = type;
    this.action = `add-${type}`;
    this.token = (!token) ? RandomToken.generate() : token;
    this.recreated = !!token;
    this.options = {};
    this.url = `payload:${this.token}`;
    this.processed = 0;
    this.promise = null;
    this.parts = [];
    this.approved = false;
    this.sent = !!token;
    this.failed = false;
    this.completed = false;
    this.uploadStartTime = null;
    this.uploadEndTime = null;
    this.processEndTime = null;
    this.onProgress = null;
};

/**
 * Return a URL to an image file that previously placed into a payload
 *
 * @param  {Object} res
 *
 * @return {String|null}
 */
Payload.getImageURL = function(res) {
    if (res.payload_token) {
        var name;
        switch (res.type) {
            case 'image':
                name = 'main';
                break;
            default:
                name = 'poster';
                break;
        }
        var url = `payload:${res.payload_token}/${name}`;
        return BlobManager.find(url);
    }
};

/**
 * Attach a file to a payload
 *
 * @param  {Blob|CordovaFile} file
 * @param  {String|undefined} name
 */
Payload.prototype.attachFile = function(file, name) {
    if (!name) {
        name = 'main';
    }
    var url = `payload:${this.token}/${name}`;
    // associate file with payload id so we can find it again
    BlobManager.associate(file, url);

    if (file instanceof Blob) {
        this.parts.push({
            blob: file,
            size: file.size,
            uploaded: 0,
            name
        });
    } else if (file instanceof CordovaFile && process.env.PLATFORM === 'cordova') {
        this.parts.push({
            cordovaFile: file,
            size: file.size,
            uploaded: 0,
            name
        });
    }
};

/**
 * Attach a stream to a payload
 *
 * @param  {BlobStream} stream
 * @param  {String|undefined} name
 */
Payload.prototype.attachStream = function(stream, name) {
    if (!name) {
        name = 'main';
    }
    this.parts.push({
        stream: stream,
        size: stream.size,
        uploaded: stream.transferred,
        name
    });
};

/**
 * Attach a URL to a payload
 *
 * @param  {BlobStream} stream
 * @param  {String|undefined} name
 */
Payload.prototype.attachURL = function(url, name) {
    this.parts.push({ url, name });
};

/**
 * Attach a part that generated from the main part (or some other part)
 *
 * @param  {String} source
 * @param  {String} name
 */
Payload.prototype.attachStep = function(source, name) {
    // add options to the source part
    var options;
    switch (name) {
        case 'poster':
            options = { generate_poster: true };
            break;
    }
    this.setPartOptions(options, source);
    this.parts.push({ name });
};

/**
 * Set options for a part
 *
 * @param  {Object} options
 * @param  {String|undefined} name
 */
Payload.prototype.setPartOptions = function(options, name) {
    if (!name) {
        name = 'main';
    }
    var part = _.find(this.parts, { name });
    if (!part) {
        throw new Error(`Unable to find part: ${name}`);
    }
    if (part.stream) {
        // options need to be applied to stream
        part.stream.setOptions(options);
    } else {
        part.options = _.assign({}, part.options, options);
    }
};

/**
 * Send the payload
 */
Payload.prototype.send = function() {
    if (this.sent) {
        return;
    }
    if (!this.approved) {
        throw new HTTPError(403);
    }
    this.sent = true;
    Promise.each(this.parts, (part) => {
        return this.sendPart(part);
    });
};

/**
 * Send a part of the payload
 *
 * @param  {Object} part
 *
 * @return {Promise}
 */
Payload.prototype.sendPart = function(part) {
    if (part.stream) {
        return this.sendStream(part);
    } else if (part.blob) {
        return this.sendBlob(part);
    } else if (part.cordovaFile && process.env.PLATFORM === 'cordova') {
        return this.sendCordovaFile(part);
    } else if (part.url) {
        return this.sendURL(part);
    } else {
        return Promise.resolve();
    }
};

/*
 * Send a blob in the payload to remote server
 *
 * @param  {Object} part
 *
 * @return {Promise}
 */
Payload.prototype.sendBlob = function(part) {
    var url = this.getDestinationURL(part.name);
    var blob = part.blob;
    var formData = new FormData;
    formData.set('file', blob);
    _.each(part.options, (value, name) => {
        formData.set(name, value);
    });
    var options = {
        responseType: 'json',
        onUploadProgress: (evt) => {
            this.updateProgress(part, evt.loaded / evt.total)
        },
    };
    return HTTPRequest.fetch('POST', url, formData, options).then((res) => {
        this.associateRemoteURL(res.url, blob);
        return res;
    });
};

/**
 * Send a local file in the payload to remote server
 *
 * @param  {Object} part
 *
 * @return {Promise<Object>}
 */
Payload.prototype.sendCordovaFile = function(part) {
    if (process.env.PLATFORM !== 'cordova') return;
    var url = this.getDestinationURL(part.name);
    var file = part.cordovaFile;
    return new Promise((resolve, reject) => {
        var encodedURL = encodeURI(remoteURL);
        var fileTransfer = new FileTransfer;
        fileTransfer.onprogress = (evt) => {
            this.updateProgress(part, evt.loaded / evt.total)
        };
        var successCB = (res) => {
            resolve(res);
        };
        var errorCB = (err) => {
            reject(new FileError(err))
        };
        var fileUploadOptions = _.assign(new FileUploadOptions, {
            fileKey: 'file',
            fileName: file.name,
            params: part.options,
            mimeType: file.type,
        });
        fileTransfer.upload(fileURL, encodedURL, successCB, errorCB, fileUploadOptions);
    }).then((res) => {
        this.associateRemoteURL(res.url, file);
        return res;
    });
};

/**
 * Send a stream ID to remote server
 *
 * @param  {Object} part
 *
 * @return {Promise<Object>}
 */
Payload.prototype.sendStream = function(part) {
    var url = this.getDestinationURL(part.name);
    var stream = part.stream;
    stream.onProgress = (evt) => {
        this.updateProgress(part, evt.loaded / evt.total)
    };
    // start the stream first and wait for the first chunk to be sent
    return stream.start().then(() => {
        var options = {
            responseType: 'json',
            contentType: 'json',
        };
        return HTTPRequest.fetch('POST', url, { stream: stream.id }, options);
    });
};

/**
 * Send JSON to remote server
 *
 * @param  {Object} part
 *
 * @return {Promise<Object>}
 */
Payload.prototype.sendURL = function(part) {
    var url = this.getDestinationURL(part.name);
    var options = {
        responseType: 'json',
        contentType: 'json',
    };
    var body = _.extend({ url: part.url }, part.options);
    return HTTPRequest.fetch('POST', url, body, options);
};

/**
 * Return the oversize of the payload
 *
 * @return {Number}
 */
Payload.prototype.getSize = function() {
    var sizes = _.map(this.parts, (part) => {
        return part.size || 0;
    });
    return _.sum(sizes);
};

/**
 * Return the number of bytes uploaded
 *
 * @return {Number}
 */
Payload.prototype.getUploaded = function() {
    var counts = _.map(this.parts, (part) => {
        return part.uploaded || 0;
    });
    return _.sum(counts);
};

/**
 * Return URL for uploading the given payload
 *
 * @param  {String} name
 *
 * @return {String}
 */
Payload.prototype.getDestinationURL = function(name) {
    var uri;
    switch (this.type) {
        case 'image':
            if (name === 'main') {
                uri = `/media/images/upload/${this.schema}/`;
            }
            break;
        case 'video':
            if (name === 'main') {
                uri = `/media/videos/upload/${this.schema}/`;
            } else if (name === 'poster') {
                uri = `/media/videos/poster/${this.schema}/`;
            }
            break;
        case 'audio':
            if (name === 'main') {
                uri = `/media/audios/upload/${this.schema}/`;
            } else if (name === 'poster') {
                uri = `/media/audios/poster/${this.schema}/`;
            }
            break;
        case 'website':
            if (name === 'poster') {
                url += `/media/html/poster/${this.schema}/`;
            }
            break;
    }
    return (uri) ? `${this.address}${uri}?token=${this.token}` : null;
};

/**
 * Update progress of a given part and trigger change event
 *
 * @param  {Object} part
 * @param  {Number} completed
 */
Payload.prototype.updateProgress = function(part, completed) {
    if (completed) {
        part.uploaded = Math.round(part.size * completed);
        if (this.onProgress) {
            this.onProgress({
                type: 'progress',
                target: this,
            });
        }
    }
};

/**
 * Update properties that track backend processing with data from backend
 *
 * @param  {Object} task
 *
 * @return {Boolean}
 */
Payload.prototype.updateBackendStatus = function(task) {
    var changed = false;
    if (this.type === 'unknown') {
        // restore type and action
        this.action = task.action;
        this.type = _.replace(this.action, /^add\-/, '');
        changed = true;
    }
    if (this.processed !== task.completion) {
        this.processed = task.completion;
        changed = true;
    }
    if (this.processEndTime !== task.etime) {
        this.processEndTime = task.etime;
        changed = true;
    }
    if (task.failed && !this.failed) {
        this.failed = true;
        changed = true;
    }
    return changed;
}

/**
 * Associate a remote URL with a blob so we don't need to download the file again
 * when the need arises
 *
 * @param  {String} url
 * @param  {Blob|CordovaFile} blob
 */
Payload.prototype.associateRemoteURL = function(url, blob) {
    if (url) {
        BlobManager.associate(blob, this.address + url);
    }
};
