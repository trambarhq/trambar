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
     * @param  {Object} res
     * @param  {Object} options
     *
     * @return {Promise<Object>}
     */
    queue: function(res, options) {
        // see what action need to be perform for the resource
        var action = this.getAction(res);
        if (!action) {
            return Promise.resolve(null);
        }

        // create a task object on the server-side to track
        // backend processing of the payload
        return this.createTask(action, options).then((task) => {
            var params = _.pick(res, 'file', 'poster_file', 'stream', 'external_url', 'external_poster_url', 'url');
            var payload = _.assign({
                payload_id: task.id,
                action: task.action,
                token: task.token,
                start: Moment(),
                transferred: 0,
                total: 0,
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
                    } else if (res.stream) {
                        // a file stream in earlier
                        return 'copy image';
                    } else if (res.external_url) {
                        // a file at cloud-storage provider
                        return 'copy image';
                    }
                }
                break;
            case 'audio':
                if (!res.url) {
                    if (res.file instanceof Blob) {
                        return 'upload and transcode audio';
                    } else if (res.external_url) {
                        return 'copy and transcode audio';
                    } else if (res.stream) {
                        return 'copy and transcode audio';
                    }
                }
            break;
            case 'video':
                if (!res.url) {
                    if (res.file instanceof Blob) {
                        return 'upload and transcode video';
                    } else if (res.external_url) {
                        return 'copy and transcode video';
                    } else if (res.stream) {
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
     * @param  {String} action
     * @param  {Object} options
     *
     * @return {Promise<Task>}
     */
    createTask: function(action, options) {
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: params.schema, by: this });
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
     * @param  {Object} criteria
     *
     * @return {Object}
     */
    find: function(criteria) {
        // try each criterium until one matches
        var result;
        var keys = _.keys(criteria);
        _.each(keys, (key) => {
            result = _.find(this.state.payloads, _.pick(criteria, key));
            return !result;
        });
        return result;
    },

    /**
     * Begin sending a previously queued payload
     *
     * @param  {Number} payloadId
     */
    send: function(payloadId) {
        var payload = _.find(this.state.payloads, { payload_id: payloadId });
        if (!payload) {
            return;
        }
        if (payload.promise) {
            // already started
            return;
        }
        var options = {
            responseType: 'json',
            onProgress: (evt) => {
                this.updatePayloadStatus(payloadId, {
                    transferred: evt.loaded,
                    total: evt.total
                });
            },
        };
        var formData = this.getFormData(payload);
        var url = this.getUrl(payload);
        //console.log('Uploading to ' + url);
        var promise = HttpRequest.fetch('POST', url, formData, options).then((response) => {
            var state = _.assign({ done: true }, response);
            this.updatePayloadStatus(payloadId, state);
        });
        payload.promise = promise;
        return;
    },

    /**
     * Create an instance of FormData for uploading the given payload
     *
     * @param  {Object} payload
     *
     * @return {FormData}
     */
    getFormData: function(payload) {
        var formData = new FormData;
        var params = _.pick(payload, 'file', 'poster_file', 'stream', 'external_url', 'external_poster_url', 'url');
        _.forIn(params, (value, name) => {
            if (value instanceof BlobStream) {
                value = value.id;
            }
            formData.append(name, value);
        });
        return formData;
    },

    /**
     * Return URL for uploading the given payload
     *
     * @param  {Object} payload
     *
     * @return {String}
     */
    getUrl: function(payload) {
        var params = this.props.route.parameters;
        var schema = params.schema;
        var url = params.address;
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
     */
    stream: function(stream) {
        var params = this.props.route.parameters;
        var attempts = 1;
        var failureCount = 0;
        var done = false;
        var chunk = 1;
        Async.do(() => {
            // get the next unsent part and send it
            return stream.pull().then((blob) => {
                var url = `${params.address}/media/stream`;
                if (stream.id) {
                    // append to existing stream
                    url += `/${stream.id}`;
                }
                var payload = new FormData;
                if (blob) {
                    payload.append('file', blob);
                } else {
                    // the server recognize that an empty payload means we've
                    // reached the end of the stream
                    done = true;
                }
                var options = { responseType: 'json' };
                console.log(`Sending chunk ${chunk++}`);
                return HttpRequest.fetch('POST', url, payload, options).then((response) => {
                    if (!stream.id) {
                        stream.id = response.id;
                    }
                    if (blob) {
                        stream.finalize(blob);
                    }
                });
            }).catch((err) => {
                if (++failureCount < attempts) {
                    // wait five seconds then try again
                    return Promise.delay(5000);
                } else {
                    throw err;
                }
            });
        });
        Async.while(() => { return !done });
        Async.end().catch((err) => {
            stream.abandon(err);
        });
    },

    /**
     * Update progress of file payload
     *
     * @param  {Number} payloadId
     * @param  {Object} props
     */
    updatePayloadStatus: function(payloadId, props) {
        var payloads = _.map(this.state.payloads, (p) => {
            return (p.payload_id === payloadId) ? _.assign({}, p, props) : p;
        });
        this.setState({ payloads }, () => {
            this.triggerChangeEvent();
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
