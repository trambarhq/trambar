var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Moment = require('moment');
var HttpRequest = require('transport/http-request');
var BlobStream = require('transport/blob-stream');
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
            var params = _.pick(res, 'file', 'poster_file', 'stream', 'external_url', 'external_poster_url', 'url');
            var payload = _.assign({
                payload_id: task.id,
                action: task.action,
                token: task.token,
                start: Moment(),
                transferred: 0,
                total: 0,
                backendProgress: 0,
                address: address,
                schema: schema,
                promise: null
            }, params);
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
                    if (res.file instanceof Blob) {
                        // a local file
                        return 'upload image';
                    } else if (res.external_url) {
                        // a file at cloud-storage provider
                        return 'copy image';
                    }
                }
                break;
            case 'audio':
                if (!res.url) {
                    if (res.stream) {
                        return 'copy and transcode audio';
                    } else if (res.file instanceof Blob) {
                        return 'upload and transcode audio';
                    } else if (res.external_url) {
                        return 'copy and transcode audio';
                    }
                }
            break;
            case 'video':
                if (!res.url) {
                    if (res.stream) {
                        return 'copy and transcode video';
                    } else if (res.file instanceof Blob) {
                        return 'upload and transcode video';
                    } else if (res.external_url) {
                        return 'copy and transcode video';
                    }
                }
                break;
            case 'website':
                if (!res.poster_url) {
                    if (res.url) {
                        return 'generate website poster';
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
        var options = {
            responseType: 'json',
        };
        if (!payload.stream && payload.file) {
            // upload progress for streams is handled differently
            var file = payload.file;
            options.onUploadProgress = (evt) => {
                var bytesSent = (evt.total) ? Math.round(file.size * (evt.loaded / evt.total)) : 0;
                this.updatePayloadStatus(payloadId, {
                    transferred: bytesSent,
                    total: file.size,
                });
            };
        }
        var promise = this.createFormData(payload).then((formData) => {
            var url = this.getUrl(payload);
            return HttpRequest.fetch('POST', url, formData, options);
        });
        payload.promise = promise;
        return;
    },

    /**
     * Create an instance of FormData for uploading the given payload
     *
     * @param  {Object} payload
     *
     * @return {Promise<FormData>}
     */
    createFormData: function(payload) {
        var props = {};
        // main contents
        if (payload.stream) {
            // start the stream before we send the form data
            props.stream = this.stream(payload.stream);
        } else if (payload.file) {
            props.file = payload.file;
        } else if (payload.external_url) {
            props.external_url = payload.external_url;
        }
        // poster
        if (payload.poster_file) {
            props.poster_file = payload.poster_file;
        } else if (payload.external_poster_url) {
            props.external_poster_url = payload.external_poster_url;
        }
        // URL of website
        if (payload.url) {
            props.url = payload.url;
        }
        return Promise.props(props).then((props) => {
            return _.transform(props, (formData, value, name) => {
                formData.append(name, value);
            }, new FormData);
        });
    },

    /**
     * Return URL for uploading the given payload
     *
     * @param  {Object} payload
     *
     * @return {String}
     */
    getUrl: function(payload) {
        var schema = payload.schema;
        var url = payload.address;
        var id = payload.payload_id;
        switch (payload.action) {
            case 'upload image':
            case 'copy image':
                url += `/media/images/upload/${schema}/${id}`;
                break;
            case 'copy and transcode video':
            case 'upload and transcode video':
                url += `/media/videos/upload/${schema}/${id}`;
                break;
            case 'copy and transcode audio':
            case 'upload and transcode audio':
                url += `/media/audios/upload/${schema}/${id}`;
                break;
            case 'generate website poster':
                url += `/media/html/screenshot/${schema}/${id}`;
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
                    };
                    if (blob) {
                        options.onUploadProgress = (evt) => {
                            var payload = _.find(this.state.payloads, { stream });
                            if (payload) {
                                // evt.loaded and evt.total are encoded sizes,
                                // which are slightly larger than the blob size
                                var bytesSent = (evt.total) ? Math.round(blob.size * (evt.loaded / evt.total)) : 0;
                                this.updatePayloadStatus(payload, {
                                    transferred: uploadedChunkSize + bytesSent,
                                    total: stream.size,
                                });
                            }
                        };
                    }
                    return HttpRequest.fetch('POST', url, formData, options).then((response) => {
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
     * Update status of file payload, using info from response
     *
     * @param  {Object} payload
     * @param  {Object} props
     */
    updatePayloadStatus: function(payload, props) {
        var payloads = _.slice(this.state.payloads);
        var index = _.indexOf(payloads, payload);
        if (index === -1) {
            return;
        }
        payload = _.assign({}, payload, props);
        payloads[index] = payload;
        this.setState({ payloads }, () => {
            this.triggerChangeEvent();
        });
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
                        if (task && task.completion !== payload.backendProgress) {
                            var payloadAfter = _.clone(payload);
                            payloadAfter.backendProgress = task.completion;
                            changed = true;
                            return payloadAfter;
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
});
