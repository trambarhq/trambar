var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var React = require('react'), PropTypes = React.PropTypes;
var Async = require('async-do-while');
var HTTPRequest = require('transport/http-request');
var NotificationUnpacker = require('transport/notification-unpacker');

// widgets
var Diagnostics = require('widgets/diagnostics');
var DiagnosticsSection = require('widgets/diagnostics-section');

module.exports = React.createClass({
    displayName: 'PushNotifier',
    propTypes: {
        serverAddress: PropTypes.string,
        relayAddress: PropTypes.string,
        android: PropTypes.object.isRequired,
        ios: PropTypes.object.isRequired,
        windows: PropTypes.object.isRequired,
        initialReconnectionDelay: PropTypes.number,
        maximumReconnectionDelay: PropTypes.number,
        searching: PropTypes.bool,
        online: PropTypes.bool,

        onConnect: PropTypes.func,
        onDisconnect: PropTypes.func,
        onNotify: PropTypes.func,
        onAlertClick: PropTypes.func,
        onRevalidate: PropTypes.func,
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
            android: {},
            ios: {
                alert: true,
                badge: true,
                sound: true,
            },
            windows: {},
        };
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        this.currentNotificationId = null;
        this.searchEndTimeout = null;
        this.backgroundTaskTimeout = null;
        return {
            registrationId: null,
            registrationType: null,
            pushRelayResponse: null,
            recentMessages: [],
        };
    },

    /**
     * Wait for props.online to become true
     *
     * @return {Promise}
     */
    waitForConnectivity: function() {
        if (this.props.online) {
            return Promise.resolve();
        }
        if (!this.connectivityPromise) {
            this.connectivityPromise = new Promise((resolve, reject) => {
                // call function in componentWillReceiveProps
                this.onConnectivity = () => {
                    this.connectivityPromise = null;
                    this.onConnectivity = null;
                    resolve();
                };
            });
        }
        return this.connectivityPromise;
    },

    /**
     * Monitor prop changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        // check if database queries have finished
        if (this.props.searching !== nextProps.searching) {
            if (nextProps.searching) {
                if (this.searchEndTimeout) {
                    // we've started searching again
                    clearTimeout(this.searchEndTimeout);
                    this.searchEndTimeout = null;
                }
            } else {
                // if not search is initiated within 1 second, then stop
                // background processing
                this.searchEndTimeout = setTimeout(() => {
                    this.endBackgroundTask();
                    this.searchEndTimeout = null;
                }, 1000);
            }
        }
        if (!this.props.online && nextProps.online) {
            if (this.onConnectivity) {
                this.onConnectivity();
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
                android: this.props.android,
                ios: this.props.ios,
                windows: this.props.windows,
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
            return this.sendRegistration(url, payload).then((result) => {
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
     * Send registration to push relay
     *
     * @param  {String} url
     * @param  {Object} payload
     *
     * @return {Object}
     */
    sendRegistration: function(url, payload) {
        var options = {
            responseType: 'json',
            contentType: 'json',
        };
        return this.waitForConnectivity().then(() => {
            return HTTPRequest.fetch('POST', url, payload, options);
        });
    },

    /**
     * Notify parent component that a change event was received
     *
     * @param  {Object} changes
     */
    triggerNotifyEvent: function(changes) {
        if (this.props.onNotify) {
            this.props.onNotify({
                type: 'notify',
                target: this,
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
     * Notify parent component that we've received a cache revalidation request
     *
     * @param  {Object} revalidation
     */
    triggerRevalidateEvent: function(revalidation) {
        if (this.props.onRevalidate) {
            this.props.onRevalidate({
                type: 'revalidate',
                target: this,
                revalidation,
            });
        }
    },

    /**
     * Inform parent component that an alert was clicked
     *
     * @param  {Object} alert
     */
    triggerAlertClickEvent: function(alert) {
        if (this.props.onAlertClick) {
            this.props.onAlertClick({
                type: 'alertclick',
                target: this,
                alert,
            });
        }
    },

    /**
     * Set id of current notification and start a timer limiting amount of
     * time spent on background retrieval
     *
     * @param  {Number} notId
     */
    startBackgroundTask: function(notId) {
        if (this.currentNotificationId) {
            // clear the current one
            this.endBackgroundTask();
        }
        this.currentNotificationId = notId;
        if (!this.backgroundTaskTimeout) {
            this.backgroundTaskTimeout = setTimeout(() => {
                this.endBackgroundTask();
                this.backgroundTaskTimeout = null;
            }, 5000);
        }
    },

    /**
     * Signal background task associated with current notification is done or
     * is being forced to stop
     */
    endBackgroundTask: function() {
        if (this.currentNotificationId) {
            signalBackgroundTaskCompletion(this.currentNotificationId);
            this.currentNotificationId = null;
        }
    },

    /**
     * Immediately signal end of background task
     *
     * @param  {Number} notId
     */
    skipBackgroundTask: function(notId) {
        signalBackgroundTaskCompletion(notId);
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
        switch (cordova.platformId) {
            case 'android':
                this.handleGCMNotification(data);
                break;
            case 'ios':
                this.handleAPNSNotification(data);
                break;
            case 'windows':
                this.handleWNSNotification(data);
                breka;
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
     * Handle notification on Android
     *
     * @param  {Object} data
     */
    handleGCMNotification: function(data) {
        var payload = data.additionalData;
        var notification = NotificationUnpacker.unpack(payload) || {};
        if (notification.type === 'change') {
            this.triggerNotifyEvent(notification.changes);
        } else if (notification.type === 'revalidation') {
            this.triggerRevalidateEvent(notification.revalidation);
        } else if (notification.type === 'alert') {
            // if notification was received in the background, the event is
            // triggered when the user clicks on the notification
            if (!notification.alert.foreground) {
                this.triggerAlertClickEvent(notification.alert);
            }
        }
        if (data.count !== undefined) {
            setApplicationIconBadgeNumber(data.count);
        }
    },

    /**
     * Handle notification on iOS
     *
     * @param  {Object} data
     */
    handleAPNSNotification: function(data) {
        var payload = data.additionalData;
        var notId = payload.notId;
        var notification = NotificationUnpacker.unpack(payload) || {};
        if (notification.type === 'change') {
            this.triggerNotifyEvent(notification.changes);
            this.startBackgroundTask(notId);
        } else if (notification.type === 'revalidation') {
            this.triggerRevalidateEvent(notification.revalidation);
            this.startBackgroundTask(notId);
        } else if (notification.type === 'alert') {
            // if notification was received in the background, the event is
            // triggered when the user clicks on the notification
            if (!notification.alert.foreground) {
                this.triggerAlertClickEvent(notification.alert);
            }
            this.skipBackgroundTask(notId);
        } else {
            this.skipBackgroundTask(notId);
        }
        if (data.count !== undefined) {
            setApplicationIconBadgeNumber(data.count);
        }
    },

    /**
     * Handle notification on Windows
     *
     * @param  {Object} data
     */
    handleWNSNotification: function(data) {
        var notification;
        if (data.launchArgs) {
            // notification is clicked while app isn't running
            var payload = parseJSON(data.launchArgs);
            notification = NotificationUnpacker.unpack(payload);
        } else {
            // payload is stored as raw data
            var eventArgs = data.additionalData.pushNotificationReceivedEventArgs;
            if (eventArgs.notificationType === 3) { // raw
                var raw = eventArgs.rawNotification;
                var payload = parseJSON(raw.content);
                notification = NotificationUnpacker.unpack(payload);
            }
        }
        if (notification) {
            if (notification.type === 'change') {
                this.triggerNotifyEvent(notification.changes);
            } else if (notification.type === 'alert') {
                this.triggerAlertClickEvent(notification.alert);
            } else if (notification.type === 'revalidation') {
                this.triggerRevalidateEvent(notification.revalidation);
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
            var payload = JSON.parse(launchArgs);
            var notification = NotificationUnpacker.unpack(payload);
            if (notification) {
                if (notification.type === 'alert') {
                    this.triggerAlertClickEvent(notification.alert);
                }
            }
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
        var device = getDeviceDetails();
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
                <DiagnosticsSection label="Device">
                    <div>Manufacturer: {device.manufacturer}</div>
                    <div>Model: {device.name}</div>
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
            manufacturer: device.manufacturer,
            name: device.model,
        };
    }
    return {};
}

function renderJSON(object, i) {
    return <pre key={i}>{JSON.stringify(object, undefined, 4)}</pre>;
}

function parseJSON(text) {
    try {
        return JSON.parse(text);
    } catch (err) {
        return {};
    }
}

function signalBackgroundTaskCompletion(notId) {
    if (pushNotification) {
        if (cordova.platformId === 'ios') {
            var success = () => {};
            var failure = () => {};
            pushNotification.finish(success, failure, notId);
        }
    }
}

function setApplicationIconBadgeNumber(count) {
    if (pushNotification) {
        if (cordova.platformId === 'android' || cordova.platformId === 'ios') {
            var success = () => {};
            var failure = () => {};
            pushNotification.setApplicationIconBadgeNumber(success, failure, count);
        }
    }
}
