var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Moment = require('moment');
var BlobStream = require('transport/blob-stream');
var Payload = require('transport/payload');

var Database = require('data/database');
var Route = require('routing/route');

// widgets
var Diagnostics = require('widgets/diagnostics');
var DiagnosticsSection = require('widgets/diagnostics-section');

module.exports = React.createClass({
    displayName: 'PayloadManager',
    propTypes: {
        hasConnection: PropTypes.bool,
        database: PropTypes.instanceOf(Database),
        route: PropTypes.instanceOf(Route),

        onChange: PropTypes.func,
    },

    /**
     * Return default props
     *
     * @return {Object}
     */
    getDefaultProps: function() {
        return {
            hasConnection: true,
        };
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        var lists = {
            payloads: [],
            streams: [],
        };
        _.assign(this, lists);
        return lists;
    },

    /**
     * Update an instance variable that's mirrored in the state
     *
     * @param  {String} name
     * @param  {Function} f
     */
    updateList: function(name, f) {
        var prevList = this[name];
        var nextList = f(prevList);
        this[name] = nextList;
        var state = {};
        state[name] = nextList;
        this.setState(state);
    },

    /**
     * Add a payload
     *
     * @param  {String} type
     *
     * @return {Payload}
     */
    add: function(type) {
        var params = this.props.route.parameters;
        var payload = new Payload(params.address, params.schema || 'global', type);
        payload.onProgress = this.handleUploadProgress;
        payload.onComplete = this.handleUploadComplete;
        this.updateList('payloads', (before) => {
            return _.concat(before, payload);
        });
        return payload;
    },

    /**
     * Send blobs to server as they're added into a BlobStream
     *
     * @return {BlobStream}
     */
    stream: function() {
        var params = this.props.route.parameters;
        var stream = new BlobStream(params.address);
        if (!this.props.hasConnection) {
            stream.suspend();
        }
        this.updateList('streams', (before) => {
            return _.concat(before, stream);
        });
        return stream;
    },

    /**
     * Start sending payloads
     *
     * @param  {Array<String>} tokens
     */
    dispatch: function(tokens) {
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
    },

    /**
     * Obtain progress about a bunch of payloads
     *
     * @param  {Array<String>} tokens
     *
     * @return {Object|null}
     */
    inquire: function(tokens) {
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
    },

    /**
     * Create a task object for each payload
     *
     * @param  {String} schema
     * @param  {String} action
     * @param  {Object} options
     *
     * @return {Promise}
     */
    acquirePermission: function(payloads) {
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
    },

    /**
     * Fire initial onChange event upon receiving a database object
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate: function(prevProps, prevState) {
        if (!prevProps.database && this.props.database) {
            this.triggerChangeEvent();
        }
        if (prevProps.database !== this.props.database || prevState.payloads !== this.state.payloads) {
            if (this.props.route) {
                this.updateBackendProgress();
            }
        }
        if (prevProps.hasConnection !== this.props.hasConnection) {
            _.each(this.streams, (stream) => {
                if (this.props.hasConnection) {
                    stream.resume();
                } else {
                    stream.suspend();
                }
            });
        }
    },

    updateBackendProgress: function() {
        var params = this.props.route.parameters;
        var inProgressPayloads = _.filter(this.payloads, {
            sent: true,
            completed: false,
            address: params.address,
            schema: params.schema || 'global',
        });
        if (!_.isEmpty(inProgressPayloads)) {
            var db = this.props.database.use({ schema: params.schema, by: this });
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
     * Called when progress has been made on uploading files
     *
     * @param  {Object} evt
     */
    handleUploadProgress: function(evt) {
        this.triggerChangeEvent();
    },

    /**
     * Render diagnostics
     *
     * @return {ReactElement}
     */
    render: function() {
        var payloads = this.state.payloads;
        var unsentPayloads = _.filter(payloads, { sent: false });
        var inTransitPayloads = _.filter(payloads, { sent: true, completed: false, failed: false });
        var failedPayloads = _.filter(payloads, { sent: true, failed: true });
        var completedPayloads = _.filter(payloads, { completed: true });
        return (
            <Diagnostics type="payload-manager">
                <DiagnosticsSection label="Unsent payloads" hidden={_.isEmpty(unsentPayloads)}>
                    {_.map(unsentPayloads, this.renderPayload)}
                </DiagnosticsSection>
                <DiagnosticsSection label="Payloads in-transit" hidden={_.isEmpty(inTransitPayloads)}>
                    {_.map(inTransitPayloads, this.renderPayload)}
                </DiagnosticsSection>
                <DiagnosticsSection label="Failed payloads" hidden={_.isEmpty(failedPayloads)}>
                    {_.map(failedPayloads, this.renderPayload)}
                </DiagnosticsSection>
                <DiagnosticsSection label="Completed payloads" hidden={_.isEmpty(completedPayloads)}>
                    {_.map(completedPayloads, this.renderPayload)}
                </DiagnosticsSection>
            </Diagnostics>
        );
    },

    /**
     * Render diagnostics for a payload
     *
     * @param  {Payload} payload
     * @param  {Number} index
     *
     * @return {ReactElement}
     */
    renderPayload: function(payload, index) {
        return (
            <div key={index}>
                <div>{payload.type} ({payload.token})</div>
                <ol>
                    {_.map(payload.parts, this.renderPayloadPart)}
                </ol>
            </div>
        );
    },

    /**
     * Render diagnostics for a part of a payload
     *
     * @param  {Object} part
     * @param  {Number} index
     *
     * @return {ReactElement}
     */
    renderPayloadPart: function(part, index) {
        var type;
        var description = part.supplemental || 'main contents';
        if (part.blob || part.cordovaFile) {
            type = 'File';
        } else if (part.stream) {
            type = 'Stream';
        } else if (part.url) {
            type = 'URL'
        }
        var uploaded;
        if (part.size > 0) {
            uploaded = (
                <span style={{ float: 'right' }}>
                    {part.uploaded}/{part.size}
                </span>
            );
        }
        return (
            <li key={index}>
                {type} - {description} {uploaded}
            </li>
        );
    },
});
