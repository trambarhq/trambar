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
        searching: PropTypes.bool,

        onConnect: PropTypes.func,
        onDisconnect: PropTypes.func,
        onNotify: PropTypes.func,
        onAlertClick: PropTypes.func,
    },

    statics: {
        isAvailable: function() {
            return (typeof(PushNotification) !== 'undefined');
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

    /**
     * Wait for database queries to end or time limit to be reached
     *
     * @param  {Number} limit
     *
     * @return {Promise}
     */
    waitForSearchIdling: function(limit) {
        return new Promise((resolve, reject) => {
            var timeout;
            var onSearchIdling = () => {
                resolve();
                this.onSearchIdling = null;
                clearTimeout(timeout);
            };
            // ensure it's trigger within a given amount of time
            timeout = setTimeout(onSearchIdling, limit);
            if (this.onSearchIdling) {
                // call the previous handler
                this.onSearchIdling();
            }
            this.onSearchIdling = onSearchIdling;
        });
    },

    /**
     * Check if database queries have finished
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (this.props.searching && !nextProps.searching) {
            if (this.onSearchIdling) {
                this.onSearchIdling();
            }
        }
    },

    /**
     * Initialize plugin and attach handlers
     */
    componentDidMount: function() {
        if (!pushNotification) {
            if (typeof(PushNotification) === 'undefined') {
                return;
            }
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

        if (cordova.platformId === 'windows') {
            document.addEventListener('activated', this.handleActivation);
        }
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
     * Clean up on unmount
     */
    componentWillUnmount: function() {
        if (pushNotification) {
            pushNotification.off('registration', this.handleRegistration);
            pushNotification.off('notification', this.handleNotification);
            pushNotification.off('error', this.handleError);
        }
        if (cordova.platformId === 'windows') {
            document.removeEventListener('activated', this.handleActivation);
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
        var id = data.registrationId;
        var type = _.toLower(data.registrationType);
        if (!type) {
            // the type is missing for WNS
            if (/windows/.test(id)) {
                type = 'wns';
            }
        }
        this.setState({ registrationId: id, registrationType: type });
    },

    /**
     * Called when a notification is received
     *
     * @param  {Object} data
     */
    handleNotification: function(data) {
        if (cordova.platformId === 'windows') {
            // handle WNS response separately
            this.handleWNSNotification(data);
        } else {
            // GCM and APNS responses are sufficiently normalized
            this.handleGCMNotification(data);
        }

        // store data received in a list for diagnostic purpose
        var recentMessages = _.slice(this.state.recentMessages);
        recentMessages.unshift(data);
        if (recentMessages.length > 10) {
           recentMessages.splice(10);
        }
        this.setState({ recentMessages })
    },

    /**
     * Handle notification on Android and iOS
     *
     * @param  {Object} data
     */
    handleGCMNotification: function(data) {
        var additionalData = data.additionalData;
        var address = additionalData.address;
        var changes = additionalData.changes;
        if (changes) {
            this.triggerNotifyEvent(address, changes);

            this.waitForSearchIdling(10 * 1000).then(() => {
                signalBackgroundProcessCompletion(data.notId);
            });
        } else if (data.message) {
            // if notification was received in the background, the event is
            // triggered when the user clicks on the notification
            if (!additionalData.foreground) {
                var alert = recreateAlert(additionalData);
                this.triggerAlertClickEvent(address, alert);
                signalBackgroundProcessCompletion(data.notId);
            }
        }
    },

    /**
     * Handle notification on Windows
     *
     * @param  {Object} data
     */
    handleWNSNotification: function(data) {
        if (data.launchArgs) {
            // notification is clicked while app isn't running
            var additionalData = JSON.parse(data.launchArgs);
            var address = additionalData.address;
            var alert = recreateAlert(additionalData);
            this.triggerAlertClickEvent(address, alert);
        } else {
            var eventArgs = data.additionalData.pushNotificationReceivedEventArgs;
            if (eventArgs.notificationType === 3) { // raw
                var raw = eventArgs.rawNotification;
                var additionalData = JSON.parse(raw.content);
                var address = additionalData.address;
                var changes = additionalData.changes;
                if (changes) {
                    this.triggerNotifyEvent(address, changes);
                }
            }
        }
    },

    /**
     * Called when activating app after running in background on Windows
     *
     * @param  {Object} context
     */
    handleActivation: function(context) {
        var launchArgs = context.args;
        if (launchArgs) {
            var additionalData = JSON.parse(launchArgs);
            var address = additionalData.address;
            var alert = recreateAlert(additionalData);
            this.triggerAlertClickEvent(address, alert);
        }
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

function renderJSON(object, i) {
    return <pre key={i}>{JSON.stringify(object, undefined, 4)}</pre>;
}

function recreateAlert(additionalData) {
    return {
        title: '',
        message: '',
        type: additionalData.type,
        schema: additionalData.schema,
        notification_id: parseInt(additionalData.notification_id),
        reaction_id: parseInt(additionalData.reaction_id),
        story_id: parseInt(additionalData.story_id),
        user_id: parseInt(additionalData.user_id),
    };
}

function signalBackgroundProcessCompletion(notId) {
    if (pushNotification && notId) {
        if (cordova.platformId === 'ios') {
            pushNotification.finish(notId);
        }
    }
}
