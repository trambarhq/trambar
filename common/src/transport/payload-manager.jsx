var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Moment = require('moment');
var HTTPRequest = require('transport/http-request');
var BlobStream = require('transport/blob-stream');
var BlobManager = require('transport/blob-manager');
var CordovaFile = require('utils/cordova-file');
var FileError = require('errors/file-error');
var Async = require('async-do-while');

var Database = require('data/database');
var Route = require('routing/route');

module.exports = React.createClass({
    displayName: 'PayloadManager',
    propTypes: {
        database: PropTypes.instanceOf(Database),
        route: PropTypes.instanceOf(Route),

        onChange: PropTypes.func,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            payloads: [],
        };
    },

    /**
     * Create a payload of files needed by a res
     *
     * @param  {String} schema
     * @param  {Object} res
     *
     * @return {Promise<Number>}
     */
    queue: function(schema, res) {
        // see what action need to be perform for the resource
        var action = this.getAction(res);
        if (!action) {
            return Promise.resolve(null);
        }
        var address = this.props.route.parameters.address;
        var options = {};
        // create a task object on the server-side to track
        // backend processing of the payload
        return this.createTask(schema, action, options).then((task) => {
            var progress = {};
            setInitialProgress(progress, res, 'file');
            setInitialProgress(progress, res, 'poster_file');
            setInitialProgress(progress, res, 'stream');
            var payload = {
                payload_id: task.id,
                action: task.action,
                token: task.token,
                start: Moment(),
                transferProgress: progress,
                backendProgress: 0,
                address: address,
                schema: schema,
                promise: null,

                file: res.file,
                poster_file: res.poster_file,
                stream: res.stream,
                url: res.url,
                external_url: res.external_url,
                external_poster_url: res.external_poster_url,
                filename: res.filename,
            };
            var payloads = _.concat(this.state.payloads, payload);
            this.setState({ payloads }, () => {
                this.triggerChangeEvent();
            });
            return payload.payload_id;
        })
    },

    /**
     * Return the action that a resource requires
     *
     * @param  {Object} res
     *
     * @return {String|undefined}
     */
    getAction: function(res) {
        switch (res.type) {
            case 'image':
                if (!res.url) {
                    if (res.file) {
                        // a local file
                        return 'image-upload';
                    } else if (res.external_url) {
                        // a file at cloud-storage provider
                        return 'image-copy';
                    }
                }
                break;
            case 'audio':
                if (!res.url) {
                    if (res.stream) {
                        return 'audio-upload-transcode';
                    } else if (res.file) {
                        return 'audio-upload-transcode';
                    } else if (res.external_url) {
                        return 'audio-copy-transcode';
                    }
                }
            break;
            case 'video':
                if (!res.url) {
                    if (res.stream) {
                        return 'video-upload-transcode';
                    } else if (res.file) {
                        return 'video-upload-transcode';
                    } else if (res.external_url) {
                        return 'video-copy-transcode';
                    }
                }
                break;
            case 'website':
                if (!res.poster_url) {
                    if (res.url) {
                        return 'website-poster-generate';
                    }
                }
                break;
        }
    },

    /**
     * Create a task object for tracking progress of upload and backend
     * processing
     *
     * @param  {String} schema
     * @param  {String} action
     * @param  {Object} options
     *
     * @return {Promise<Task>}
     */
    createTask: function(schema, action, options) {
        var db = this.props.database.use({ schema, by: this });
        return db.start().then((userId) => {
            var task = {
                action: action,
                options: options,
                user_id: userId,
            };
            return db.saveOne({ table: 'task' }, task);
        });
    },

    /**
     * Look for a payload
     *
     * @param  {String} schema
     * @param  {Object} criteria
     *
     * @return {Object}
     */
    find: function(schema, criteria) {
        if (!this.props.route) {
            return null;
        }
        // try each criterium until one matches
        var address = this.props.route.parameters.address;
        return _.find(this.state.payloads, (payload) => {
            if (payload.address === address && payload.schema === schema) {
                return _.some(criteria, (value, key) => {
                    return (payload[key] === value);
                });
            }
        });
    },

    /**
     * Begin sending a previously queued payload
     *
     * @param  {String} schema
     * @param  {Number} payloadId
     */
    send: function(schema, payloadId) {
        var payload = this.find(schema, { payload_id: payloadId });
        if (!payload) {
            return;
        }
        if (payload.promise) {
            // already started
            return;
        }
        var promiseF = this.sendStream(payload, 'stream')
                    || this.sendBlob(payload, 'file')
                    || this.sendCordovaFile(payload, 'file')
                    || this.sendURL(payload, 'external_url');
        var promiseP = this.sendBlob(payload, 'poster_file')
                    || this.sendCordovaFile(payload, 'poster_file')
                    || this.sendURL(payload, 'external_poster_url');
        payload.promise = Promise.all([ promiseF, promiseP ]);
        return;
    },

    /**
     * Send a blob in the payload to remote server
     *
     * @param  {Object} payload
     * @param  {String} propName
     *
     * @return {Promise|null}
     */
    sendBlob: function(payload, propName) {
        var fileURL = payload[propName];
        var blob = BlobManager.get(fileURL);
        if (!(blob instanceof Blob)) {
            return null;
        }
        var payloadId = payload.payload_id;
        var address = payload.address;
        var url = this.getDestinationURL(payload, propName);
        var formData = new FormData;
        formData.set('file', blob);
        var options = {
            responseType: 'json',
            attributes: { name: propName, payloadId: payloadId },
            onUploadProgress: this.handleUploadProgress,
        };
        return HTTPRequest.fetch('POST', url, formData, options).then((res) => {
            // associate remote URL with blob
            var url = res.url || res.poster_url;
            if (url) {
                BlobManager.associate(blob, `${address}${url}`);
            }
            return res;
        });
    },

    /**
     * Send a local file in the payload to remote server
     *
     * @param  {Object} payload
     * @param  {String} propName
     *
     * @return {Promise|null}
     */
    sendCordovaFile: function(payload, propName) {
        if (process.env.PLATFORM !== 'cordova') {
            return null;
        }
        var fileURL = payload[propName];
        var file = BlobManager.get(fileURL);
        if (!(file instanceof CordovaFile)) {
            return null;
        }
        var payloadId = payload.payload_id;
        var address = payload.address;
        var url = this.getDestinationURL(payload, propName);
        var options = {
            fileKey: 'file',
            fileName: file.name,
            mimeType: file.type,
            attributes: { name: propName, payloadId: payloadId },
            onUploadProgress: this.handleUploadProgress,
        };
        return uploadWithPlugin(file.fullPath, url, options).then((res) => {
            var url = res.url || res.poster_url;
            if (url) {
                BlobManager.associate(blob, `${address}${url}`);
            }
            return res;
        });
    },

    /**
     * Initiate stream transfer and send stream id to remote server
     *
     * @param  {Object} payload
     * @param  {String} propName
     *
     * @return {Promise|null}
     */
    sendStream: function(payload, propName) {
        var stream = payload[propName];
        if (!(stream instanceof BlobStream)) {
            return null;
        }

        // start the stream before we send the form data
        stream.attributes = { name: propName, payloadId: payload.payload_id };
        stream.onProgress = this.handleUploadProgress;
        return this.stream(payload.stream).then((streamId) => {
            var url = this.getDestinationURL(payload, propName);
            var formData = new FormData;
            formData.set('stream', streamId);
            var options = { responseType: 'json' };
            return HTTPRequest.fetch('POST', url, formData, options);
        });
    },

    /**
     * Send URL of remote file to remote server
     *
     * @param  {Object} payload
     * @param  {String} propName
     *
     * @return {Promise|null}
     */
    sendURL: function(payload, propName) {
        var payloadURL = payload[propName];
        if (!payloadURL) {
            return null;
        }
        var payloadId = payload.id;
        var url = this.getDestinationURL(payload, propName);
        var formData = new FormData;
        formData.set('url', payloadURL);
        var options = { responseType: 'json' };
        return HTTPRequest.fetch('POST', url, formData, options);
    },

    /**
     * Return URL for uploading the given payload
     *
     * @param  {Object} payload
     * @param  {String} propName
     *
     * @return {String}
     */
    getDestinationURL: function(payload, propName) {
        var schema = payload.schema;
        var url = payload.address;
        var id = payload.payload_id;
        switch (payload.action) {
            case 'image-upload':
            case 'image-copy':
                url += `/media/images/upload/${schema}/${id}`;
                break;
            case 'video-copy-transcode':
            case 'video-upload-transcode':
                if (propName === 'poster_file' || propName === 'external_poster_url') {
                    url += `/media/videos/poster/${schema}/${id}`;
                } else {
                    url += `/media/videos/upload/${schema}/${id}`;
                }
                break;
            case 'audio-copy-transcode':
            case 'audio-upload-transcode':
                if (propName === 'poster_file' || propName === 'external_poster_url') {
                    url += `/media/audios/poster/${schema}/${id}`;
                } else {
                    url += `/media/audios/upload/${schema}/${id}`;
                }
                break;
            case 'website-poster-generate':
                url += `/media/html/poster/${schema}/${id}`;
                break;
            default:
                return;
        }
        url += `?token=${payload.token}`;
        return url;
    },

    /**
     * Send blobs to server as they're added into a BlobStream
     *
     * @param  {BlobStream} stream
     *
     * @return {Promise<Number>}
     */
    stream: function(stream) {
        var params = this.props.route.parameters;
        if (stream.id) {
            // already started
            return Promise.resolve(stream.id);
        }
        return new Promise((resolve, reject) => {
            var attempts = 1;
            var failureCount = 0;
            var done = false;
            var uploadedChunkSize = 0;
            Async.do(() => {
                // get the next unsent part and send it
                return stream.pull().then((blob) => {
                    var url = `${params.address}/media/stream`;
                    if (stream.id) {
                        // append to existing stream
                        url += `/${stream.id}`;
                    }
                    var formData = new FormData;
                    if (blob) {
                        formData.append('file', blob);
                    } else {
                        // the server recognize that an empty payload means we've
                        // reached the end of the stream
                        done = true;
                    }
                    var options = {
                        responseType: 'json',
                        onUploadProgress: (evt) => {
                            if (blob) {
                                // evt.loaded and evt.total are encoded sizes,
                                // which are slightly larger than the blob size
                                var bytesSentFromChunk = (evt.total) ? Math.round(blob.size * (evt.loaded / evt.total)) : 0;
                                var transferred = uploadedChunkSize + bytesSentFromChunk;
                                stream.report(transferred);
                            }
                        },
                    };
                    return HTTPRequest.fetch('POST', url, formData, options).then((response) => {
                        if (!stream.id) {
                            stream.id = response.id;
                            // resolve promise when stream is obtained
                            resolve(stream.id);
                        }
                        if (blob) {
                            stream.finalize(blob);
                            uploadedChunkSize += blob.size;
                        }
                    });
                }).catch((err) => {
                    if (++failureCount < attempts) {
                        // wait five seconds then try again
                        return Promise.delay(5000);
                    } else {
                        if (!stream.id) {
                            reject(err);
                        }
                        throw err;
                    }
                });
            });
            Async.while(() => { return !done });
            Async.end().catch((err) => {
                stream.abandon(err);
            });
        });
    },

    /**
     * Update property of payload, using a callback function
     *
     * @param  {Number} payloadId
     * @param  {Function} f
     *
     * @return {null}
     */
     updatePayload: function(payloadId, f) {
         var payloads = _.slice(this.state.payloads);
         var index = _.findIndex(payloads, { payload_id: payloadId });
         if (index === -1) {
             return;
         }
         var payload = payloads[index] = _.cloneDeep(payloads[index]);
         f(payload);
         this.setState({ payloads }, () => {
             this.triggerChangeEvent();
         });
         return null;
     },

    /**
     * Update backend progress of payloads
     */
    updateProgress: function() {
        var db = this.props.database.use({ by: this })
        // in theory, there could be payloads going to different servers and schema
        // only update those that belong to the currently selected server
        var payloads = _.filter(this.state.payloads, (payload) => {
            if (payload.address === db.context.address) {
                // and only those that aren't done
                if (payload.backendProgress !== 100) {
                    return true;
                }
            }
        });
        var payloadsBySchema = _.groupBy(payloads, 'schema');
        var schemas = _.keys(payloadsBySchema);
        var changed = false;
        return Promise.each(schemas, (schema) => {
            var schemaPayloads = payloadsBySchema[schema];
            var taskIds = _.map(schemaPayloads, 'payload_id');
            var criteria = { id: taskIds };
            return db.find({ table: 'task', schema, criteria }).then((tasks) => {
                // go through each payload and see which needs to be updated
                payloads = _.map(payloads, (payload) => {
                    if (_.includes(schemaPayloads, payload)) {
                        var task = _.find(tasks, { id: payload.payload_id });
                        if (task) {
                            if (task.completion !== payload.backendProgress) {
                                var payloadAfter = _.clone(payload);
                                payloadAfter.backendProgress = task.completion;
                                changed = true;
                                return payloadAfter;
                            }
                        }
                    }
                    return payload;
                });
            });
        }).then(() => {
            if (changed) {
                this.setState({ payloads }, () => {
                    this.triggerChangeEvent();
                });
                // returning null in case handler creates dangling promise
                return null;
            }
        });
    },

    /**
     * Return the current upload progress
     *
     * @return {Object|null}
     */
    getUploadProgress: function() {
        var files = 0;
        var bytes = 0;
        _.each(this.state.payloads, (payload) => {
            _.each(payload.transferProgress, (progress) => {
                if (progress.loaded < progress.total) {
                    files++;
                    bytes += Math.max(0, progress.total - progress.loaded);
                }
            });
        });
        return (files > 0) ? { files, bytes } : null;
    },

    /**
     * Render component
     *
     * @return {null}
     */
    render: function() {
        return null;
    },

    /**
     * Fire initial onChange event upon receiving a database object
     *
     * @param  {Object} prevProps
     */
    componentDidUpdate: function(prevProps) {
        if (!prevProps.database && this.props.database) {
            this.triggerChangeEvent();
        }
        if (prevProps.database !== this.props.database) {
            this.updateProgress();
        }
    },

    /**
     * Inform parent component that changes concerning the payloads
     * have occurred (progress made or error encountered)
     */
    triggerChangeEvent: function() {
        if (this.props.onChange) {
            this.props.onChange({
                type: 'change',
                target: this,
            });
        }
    },

    /**
     * Called when some progress has been made on uploading a file
     *
     * @param  {Event} evt
     */
    handleUploadProgress: function(evt) {
        var attributes = evt.target.attributes;
        var name = attributes.name;
        var payloadId = attributes.payloadId;
        this.updatePayload(payloadId, (payload) => {
            payload.transferProgress[name] = _.pick(evt, 'loaded', 'total');
        });
    }
});

if (process.env.PLATFORM === 'cordova') {
    /**
     * Upload file with Cordova FileTransfer plugin
     *
     * @param  {String} fileURL
     * @param  {String} remoteURL
     * @param  {Object} options
     *
     * @return {Promise}
     */
    var uploadWithPlugin = function(fileURL, remoteURL, options) {
        return new Promise((resolve, reject) => {
            var encodedURL = encodeURI(remoteURL);
            var fileUploadOptions = new FileUploadOptions();
            _.assign(fileUploadOptions, _.omit(options, 'attributes', 'onUploadProgress'));
            var fileTransfer = new FileTransfer();
            var successCB = resolve;
            var errorCB = (err) => {
                reject(new FileError(err))
            };

            if (options.onUploadProgress) {
                fileTransfer.onprogress = (evt) => {
                    evt = _.clone(evt);
                    evt.target = {
                        attributes: options.attributes,
                    };
                    options.onUploadProgress(evt);
                };
            }
            fileTransfer.upload(fileURL, encodedURL, successCB, errorCB, fileUploadOptions);
        });
    }
}

function setInitialProgress(progress, res, propName) {
    var file = res[propName];
    if (file && file.size > 0) {
        progress[propName] = { loaded: 0, total: file.size };
    }
}
