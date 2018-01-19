var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Async = require('async-do-while');
var HTTPRequest = require('transport/http-request');

// widgets
var Diagnostics = require('widgets/diagnostics');
var DiagnosticsSection = require('widgets/diagnostics-section');

module.exports = React.createClass({
    displayName: 'PushNotifier',
    propTypes: {
        serverAddress: PropTypes.string,
        relayAddress: PropTypes.string,
        initialReconnectionDelay: PropTypes.number,
        maximumReconnectionDelay: PropTypes.number,

        onConnect: PropTypes.func,
        onDisconnect: PropTypes.func,
        onNotify: PropTypes.func,
        onAlertClick: PropTypes.func,
    },

    statics: {
        isAvailable: function() {
            return true;
        }
    },

    /**
     * Return default props
     *
     * @return {Object}
     */
    getDefaultProps: function() {
        return {
            initialReconnectionDelay: 500,
            maximumReconnectionDelay: 30000,
        };
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            registrationId: null,
            registrationType: null,
            pushRelayResponse: null,
            recentMessages: [],
        };
    },

    componentDidMount: function() {
        if (!pushNotification) {
            var params = {
                android: {},
                ios: {
                    alert: true,
                    badge: true,
                    sound: true,
                },
                windows: {},
            };
            pushNotification = PushNotification.init(params);
        }
        pushNotification.on('registration', this.handleRegistration);
        pushNotification.on('notification', this.handleNotification);
        pushNotification.on('error', this.handleError);
   },

    /**
     * Change the registration when relay changes or server changes
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate: function(prevProps, prevState) {
        if (prevProps.serverAddress !== this.props.serverAddress
         || prevProps.relayAddress !== this.props.relayAddress
         || prevState.registrationId !== this.state.registrationId) {
             if (this.props.relayAddress && this.state.registrationId) {
                 this.register(this.props.relayAddress, this.props.serverAddress, this.state.registrationId, this.state.registrationType);
             }
        }
    },

    /**
     * Register device at push relay
     *
     * @param  {String} relayAddress
     * @param  {String} serverAddress
     * @param  {String} registrationId
     * @param  {String} registrationType
     *
     * @return {Boolean}
     */
    register: function(relayAddress, serverAddress, registrationId, registrationType) {
        // track registration attempt with an object
        var attempt = { relayAddress, serverAddress, registrationId, registrationType };
        if (_.isEqual(this.registrationAttempt, attempt)) {
            // already connecting to server
            return this.registrationAttempt.promise;
        }
        this.registrationAttempt = attempt;
        this.setState({ pushRelayResponse: null });

        var registered = false;
        var delay = this.props.initialReconnectionDelay;
        var maximumDelay = this.props.maximumReconnectionDelay;

        relayAddress = _.trimEnd(relayAddress, '/');
        // keep trying to connect until the effort is abandoned (i.e. user
        // goes to a different server)
        Async.do(() => {
            var url = `${relayAddress}/register`;
            var details = getDeviceDetails();
            var payload = {
                network: registrationType,
                registration_id: registrationId,
                details: details,
                address: serverAddress,
            };
            var options = {
                responseType: 'json',
                contentType: 'json',
            };
            return HTTPRequest.fetch('POST', url, payload, options).then((result) => {
                if (attempt === this.registrationAttempt) {
                    this.registrationAttempt = null;
                    this.setState({ pushRelayResponse: result });
                    var connection = {
                        method: registrationType,
                        relay: relayAddress,
                        token: result.token,
                        address: serverAddress,
                        details: getDeviceDetails(),
                    };
                    this.triggerConnectEvent(connection);
                }
                registered = true;
                return null;
            }).catch((err) => {
                delay *= 2;
                if (delay > maximumDelay) {
                    delay = maximumDelay;
                }
                console.log(`Connection attempt in ${delay}ms: ${relayAddress}`);
                return Promise.delay(delay, null);
            });
        });
        Async.while(() => {
            if (attempt === this.registrationAttempt) {
                return !registered;
            } else {
                return false;
            }
        });
        Async.return(() => {
            this.registrationAttempt = null;
            return registered;
        });
        attempt.promise = Async.end();
        return attempt.promise;
    },

    /**
     * Notify parent component that a change event was received
     *
     * @param  {String} address
     * @param  {Object} changes
     */
    triggerNotifyEvent: function(address, changes) {
        if (this.props.onNotify) {
            this.props.onNotify({
                type: 'notify',
                target: this,
                address,
                changes,
            });
        }
    },

    /**
     * Notify parent component that a connection was established
     *
     * @param  {Object} connection
     */
    triggerConnectEvent: function(connection) {
        if (this.props.onConnect) {
            this.props.onConnect({
                type: 'connect',
                target: this,
                connection,
            });
        }
    },

    /**
     * Inform parent component that an alert was clicked
     *
     * @param  {String} address
     * @param  {Object} alert
     */
    triggerAlertClickEvent: function(address, alert) {
        if (this.props.onAlertClick) {
            this.props.onAlertClick({
                type: 'alertclick',
                target: this,
                address,
                alert,
            })
        }
    },

    /**
     * Called when plugin has successful register the device
     *
     * @param  {Object} data
     */
    handleRegistration: function(data) {
        this.setState({
            registrationId: data.registrationId,
            registrationType: _.toLower(data.registrationType),
        });
    },

    /**
     * Called when a notification is received
     *
     * @param  {Object} data
     */
    handleNotification: function(data) {
        var additionalData = data.additionalData || {};
        var address = additionalData.address;
        var changes = additionalData.changes;
        if (changes) {
            this.triggerNotifyEvent(address, changes);
        } else if (data.message) {
            if (!additionalData.foreground) {
                var alert = {
                    title: data.title,
                    message: data.message,
                    type: additionalData.type,
                    schema: additionalData.schema,
                    notification_id: parseInt(additionalData.notification_id),
                    reaction_id: parseInt(additionalData.reaction_id),
                    story_id: parseInt(additionalData.story_id),
                    user_id: parseInt(additionalData.user_id),
                };
                this.triggerAlertClickEvent(address, alert);
            }
        }
        var recentMessages = _.slice(this.state.recentMessages);
        recentMessages.unshift(data);
        if (recentMessages.length > 10) {
           recentMessages.splice(10);
        }
        this.setState({ recentMessages })
    },

    /**
     * Called when an error occured
     *
     * @param  {Error} err
     */
    handleError: function(err) {
        console.log(err);
    },

    /**
     * Render diagnostics
     *
     * @return {ReactElement}
     */
    render: function() {
        var relayToken = _.get(this.state.pushRelayResponse, 'token');
        return (
            <Diagnostics type="push-notifier">
                <DiagnosticsSection label="Registration">
                    <div>ID: {this.state.registrationId}</div>
                    <div>Network: {this.state.registrationType}</div>
                </DiagnosticsSection>
                <DiagnosticsSection label="Push relay">
                    <div>Address: {this.props.relayAddress}</div>
                    <div>Token: {relayToken}</div>
                </DiagnosticsSection>
                <DiagnosticsSection label="Recent messages">
                   {_.map(this.state.recentMessages, renderJSON)}
                </DiagnosticsSection>
            </Diagnostics>
        );
    },
});

var pushNotification;

/**
 * Return device details
 *
 * @return {Object}
 */
var getDeviceDetails = function() {
    var device = window.device;
    if (device) {
        return {
            manufacturer: _.capitalize(device.manufacturer),
            name: device.model,
        };
    }
    return {};
}

function renderJSON(object) {
    return <pre>{JSON.stringify(object, undefined, 4)}</pre>;
}
