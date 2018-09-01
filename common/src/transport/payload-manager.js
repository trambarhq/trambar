import _ from 'lodash';
import Promise from 'bluebird';
import Moment from 'moment';
import BlobStream from 'transport/blob-stream';
import Payload from 'transport/payload';
import BackgroundFileTransfer from 'transport/background-file-transfer';
import EventEmitter from 'utils/event-emitter';

import Database from 'data/database';
import Route from 'routing/route';

class PayloadManager extends EventEmitter {
    constructor(options) {
        super(options);
        this.payloads = [];
        this.streams = [];
    }

    initialize() {
        if (process.env.PLATFORM === 'cordova') {
            BackgroundFileTransfer.initialize();
        }
    }

    /**
     * Add a payload
     *
     * @param  {String} type
     * @param  {Object|undefined} destination
     *
     * @return {Payload}
     */
    add(type, destination) {
        // the payload goes to the server and schema indicated by the current
        // route unless specified otherwise
        if (!destination) {
            destination = {};
        }
        var params = this.props.route.parameters;
        var address = destination.address || params.address;
        var schema = destination.schema || params.schema || 'global';
        var payload = new Payload(address, schema, type);
        payload.onUploadProgress = this.handleUploadProgress;
        payload.onUploadComplete = this.handleUploadComplete;
        this.payloads.push(payload);
        return payload;
    }

    /**
     * Send blobs to server as they're added into a BlobStream
     *
     * @return {BlobStream}
     */
    stream() {
        var params = this.props.route.parameters;
        var stream = new BlobStream(params.address);
        if (!this.props.online) {
            stream.suspend();
        }
        this.streams.push(stream);
        return stream;
    }

    /**
     * Start sending payloads
     *
     * @param  {Array<String>} tokens
     */
    dispatch(tokens) {
        var payloads = _.filter(this.payloads, (payload) => {
            return _.includes(tokens, payload.token);
        });
        if (!_.isEmpty(payloads)) {
            this.acquirePermission(payloads).then(() => {
                _.each(payloads, (payload) => {
                    payload.send();
                });
                return null;
            }).then(() => {
                this.triggerChangeEvent();
            });
        }
    }

    /**
     * Cancel payloads
     *
     * @param  {Array<String>} tokens
     */
    abandon(tokens) {
        var payloads = _.filter(this.payloads, (payload) => {
            return _.includes(tokens, payload.token);
        });
        if (!_.isEmpty(payloads)) {
            _.each(payloads, (payload) => {
                payload.cancel();
            });
            _.pullAll(this.payloads, payloads);
            this.triggerChangeEvent();
        }
    }

    /**
     * Obtain progress about a bunch of payloads
     *
     * @param  {Array<String>} tokens
     *
     * @return {Object|null}
     */
    inquire(tokens) {
        if (_.isEmpty(tokens)) {
            return null;
        }
        var payloads = _.filter(this.payloads, (payload) => {
            return _.includes(tokens, payload.token);
        });
        if (payloads.length < tokens) {
            setImmediate(() => {
                // some payloads are not there, either because they were sent by
                // another browser or a page refresh occurred
                var params = this.props.route.parameters;
                var missing = [];
                _.each(tokens, (token) => {
                    var payload = _.find(this.payloads, { token });
                    if (!payload) {
                        // recreate it
                        missing.push(new Payload(params.address, params.schema, 'unknown', token));
                    }
                });
                this.updateList('payloads', (before) => {
                    return _.concat(before, missing);
                })
            });
            return { action: 'unknown', progress: undefined };
        }

        // see if uploading is complete
        var uploadingSize = 0;
        var uploadingProgress = 0;
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
            var renderingPayloads = _.filter(payloads, (payload) => {
                return payload.type === 'web-site';
            });
            if (_.some(renderingPayloads, { completed: false })) {
                var renderingProgress = 0;
                _.each(transcodingPayloads, (payload) => {
                    renderingProgress += payload.processed;
                });
                renderingProgress = Math.round(renderingProgress / _.size(renderingPayloads));
                return {
                    action: 'rendering',
                    progress: renderingProgress,
                }
            };

            // uploading is done--see if transcoding is occurring at the backend
            var transcodingPayloads = _.filter(payloads, (payload) => {
                return payload.type === 'video' || payload.type === 'audio';
            });
            if (_.some(transcodingPayloads, { completed: false })) {
                var transcodingProgress = 0;
                _.each(transcodingPayloads, (payload) => {
                    transcodingProgress += payload.processed;
                });
                transcodingProgress = Math.round(transcodingProgress / _.size(transcodingPayloads));
                return {
                    action: 'transcoding',
                    progress: transcodingProgress,
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
        var bytes = 0;
        var files = 0;
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
     * Create a task object for each payload
     *
     * @param  {String} schema
     * @param  {String} action
     * @param  {Object} options
     *
     * @return {Promise}
     */
    acquirePermission(payloads) {
        var unapprovedPayloads = _.filter(payloads, { approved: false });
        if (_.isEmpty(unapprovedPayloads)) {
            return Promise.resolve();
        }
        var db = this.props.database.use({ by: this });
        return db.start().then((userId) => {
            var schema;
            var tasks = _.map(unapprovedPayloads, (payload) => {
                schema = payload.schema;
                // place the status of each part in the options column
                var status = {}
                _.each(payload.parts, (part) => {
                    status[part.name] = false;
                });
                return {
                    token: payload.token,
                    action: payload.action,
                    options: status,
                    user_id: userId,
                };
            });
            return db.save({ schema, table: 'task' }, tasks).then((tasks) => {
                _.each(payloads, (payload) => {
                    payload.approved = true;
                });
            }).catch((err) => {
                _.each(payloads, (payload) => {
                    payload.failed = true;
                });
            });
        });
    }

    /**
     * Query remote database for progress information
     */
    updateBackendProgress() {
        var params = this.props.route.parameters;
        var schema = params.schema || 'global';
        var inProgressPayloads = _.filter(this.payloads, {
            sent: true,
            completed: false,
            address: params.address,
            schema: schema,
        });
        if (!_.isEmpty(inProgressPayloads)) {
            var db = this.props.database.use({ schema, by: this });
            db.start().then((userId) => {
                var criteria = {
                    token: _.map(inProgressPayloads, 'token'),
                    user_id: userId
                };
                return db.find({ table: 'task', criteria }).then((tasks) => {
                    var changed = false;
                    _.each(tasks, (task) => {
                        var payload = _.find(inProgressPayloads, { token: task.token });
                        if (payload) {
                            if (payload.updateBackendStatus(task)) {
                                changed = true;
                            }
                        }
                    });
                    if (changed) {
                        this.triggerChangeEvent();
                    }
                });
            });
        }
    }

    /**
     * Called when progress has been made on uploading files
     *
     * @param  {Object} evt
     */
    handleUploadProgress = (evt) => {
        this.triggerChangeEvent();
    }

    /**
     * Called when uploading has finished
     *
     * @param  {Object} evt
     */
    handleUploadComplete = (evt) => {
        this.triggerChangeEvent();
    }
}
