import _ from 'lodash';
import Promise from 'bluebird';
import Moment from 'moment';
import Async from 'async-do-while';
import HTTPRequest from 'transport/http-request';
import NotificationUnpacker from 'transport/notification-unpacker';
import EventEmitter, { GenericEvent } from 'utils/event-emitter';

var defaultOptions = {
    initialReconnectionDelay: 500,
    maximumReconnectionDelay: 30000,
    platforms: {
        android: {},
        ios: {
            alert: true,
            badge: true,
            sound: true,
        },
        windows: {},
    },
};

class PushNotifier extends EventEmitter {
    constructor(options) {
        super();
        this.currentNotificationId = null;
        this.searchEndTimeout = null;
        this.backgroundTaskTimeout = null;
        this.registrationId = null;
        this.registrationType = null;
        this.pushRelayResponse = null;
        this.recentMessages = [];
    }

    initialize() {
        if ((typeof(PushNotification) !== 'undefined')) {

        }

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
    }

    shutdown() {
        if (pushNotification) {
            pushNotification.off('registration', this.handleRegistration);
            pushNotification.off('notification', this.handleNotification);
            pushNotification.off('error', this.handleError);
        }
        if (cordova.platformId === 'windows') {
            document.removeEventListener('activated', this.handleActivation);
        }
    }

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
    register(relayAddress, serverAddress, registrationId, registrationType) {
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
    }

    /**
     * Send registration to push relay
     *
     * @param  {String} url
     * @param  {Object} payload
     *
     * @return {Object}
     */
    sendRegistration(url, payload) {
        var options = {
            responseType: 'json',
            contentType: 'json',
        };
        return this.waitForConnectivity().then(() => {
            return HTTPRequest.fetch('POST', url, payload, options);
        });
    }

    /**
     * Called when plugin has successful register the device
     *
     * @param  {Object} data
     */
    handleRegistration = (data) => {
        var id = data.registrationId;
        var type = _.toLower(data.registrationType);
        if (!type) {
            // the type is missing for WNS
            if (/windows/.test(id)) {
                type = 'wns';
            }
        }
        isDebugMode().then((debug) => {
            if (type === 'apns' && debug) {
                type += '-sb';  // use sandbox
            }
            this.setState({ registrationId: id, registrationType: type });
        });
    }

    /**
     * Called when a notification is received
     *
     * @param  {Object} data
     */
    handleNotificationRecord = (data) => {
        // store data received in a list for diagnostic purpose
        this.recentMessages.unshift(data);
        if (this.recentMessages.length > 10) {
           this.recentMessages.splice(10);
        }
    }

    getNotificationHandler() {
        if (cordova.platformId === 'android' || cordova.platformId === 'ios') {
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
            signalBackgroundTaskCompletion(notId);
        } else if (cordova.platformId === 'windows') {
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
        }
    }

    /**
     * Called when activating app after running in background on Windows
     *
     * @param  {Object} context
     */
    handleActivation = (context) => {
        var launchArgs = context.args;
        if (launchArgs) {
            var payload = JSON.parse(launchArgs);
            var notification = NotificationUnpacker.unpack(payload);
            if (notification) {
                if (notification.type === 'alert') {
                    var alert = notification.alert;
                    var evt = new PushNotifierEvent(this, 'alert', { alert });
                    this.triggerEvent(evt);
                }
            }
        }
    }

    /**
     * Called when an error occured
     *
     * @param  {Error} err
     */
    handleError = (err) => {
        console.log(err);
    }

    /**
     * Wait for to become true
     *
     * @return {Promise}
     */
    waitForConnectivity() {
        if (this.offlineMode) {
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
    }
}

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

function isDebugMode() {
    return new Promise((resolve, reject) => {
        try {
            cordova.plugins.IsDebug.getIsDebug((isDebug) => {
                resolve(isDebug);
            }, (err) => {
                resolve(false);
            });
        } catch (err) {
            resolve(false);
        }
    });
}
