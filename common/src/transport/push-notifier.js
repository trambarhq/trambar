import _ from 'lodash';
import Promise from 'bluebird';
import Async from 'async-do-while';
import Notifier, { NotifierEvent } from 'transport/notifier';
import * as HTTPRequest from 'transport/http-request';

let defaultOptions = {
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

class PushNotifier extends Notifier {
    constructor(options) {
        super();
        this.options = _.defaults({}, options, defaultOptions);
        this.currentNotificationID = null;
        this.searchEndTimeout = null;
        this.backgroundTaskTimeout = null;
        this.registrationID = null;
        this.registrationType = null;
        this.pushRelayResponse = null;
    }

    activate() {
        if ((typeof(PushNotification) !== 'undefined')) {
            if (!pushNotification) {
                pushNotification = PushNotification.init(this.options.platforms);
            }
            pushNotification.on('registration', this.handleRegistration);
            pushNotification.on('notification', this.handleNotification);
            pushNotification.on('error', this.handleError);

            if (cordova.platformID === 'windows') {
                document.addEventListener('activated', this.handleActivation);
            }
        }
    }

    deactivate() {
        if (pushNotification) {
            pushNotification.off('registration', this.handleRegistration);
            pushNotification.off('notification', this.handleNotification);
            pushNotification.off('error', this.handleError);

            if (cordova.platformID === 'windows') {
                document.removeEventListener('activated', this.handleActivation);
            }
        }
    }

    /**
     * Register device at push relay
     *
     * @param  {String} relayAddress
     * @param  {String} serverAddress
     * @param  {String} registrationID
     * @param  {String} registrationType
     *
     * @return {Boolean}
     */
    register(relayAddress, serverAddress, registrationID, registrationType) {
        // track registration attempt with an object
        let attempt = { relayAddress, serverAddress, registrationID, registrationType };
        if (_.isEqual(this.registrationAttempt, attempt)) {
            // already connecting to server
            return this.registrationAttempt.promise;
        }
        this.registrationAttempt = attempt;
        this.pushRelayResponse = null;

        let registered = false;
        let delay = this.props.initialReconnectionDelay;
        let maximumDelay = this.props.maximumReconnectionDelay;

        relayAddress = _.trimEnd(relayAddress, '/');
        // keep trying to connect until the effort is abandoned (i.e. user
        // goes to a different server)
        Async.do(() => {
            let url = `${relayAddress}/register`;
            let details = getDeviceDetails();
            let payload = {
                network: registrationType,
                registration_id: registrationID,
                details: details,
                address: serverAddress,
            };
            return this.sendRegistration(url, payload).then((result) => {
                if (attempt === this.registrationAttempt) {
                    this.registrationAttempt = null;
                    this.pushRelayResponse = result;
                    let connection = {
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
        let options = {
            responseType: 'json',
            contentType: 'json',
        };
        return HTTPRequest.fetch('POST', url, payload, options);
    }

    /**
     * Called when plugin has successful register the device
     *
     * @param  {Object} data
     */
    handleRegistration = (data) => {
        let id = data.registrationID;
        let type = _.toLower(data.registrationType);
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
            this.setState({ registrationID: id, registrationType: type });
        });
    }

    /**
     * Called when a notification is received
     *
     * @param  {Object} notification
     */
    handleNotification = (data) => {
        // store data received in a list for diagnostic purpose
        this.recentMessages.unshift(data);
        if (this.recentMessages.length > 10) {
           this.recentMessages.splice(10);
        }
        if (cordova.platformID === 'android') {
            let payload = data.additionalData;
            let notification = NotificationUnpacker.unpack(payload) || {};
            if (notification) {
                this.dispatchNotification(notification);
            }
            if (data.count !== undefined) {
                setApplicationIconBadgeNumber(data.count);
            }
        } else if (cordova.platformID === 'ios') {
            let payload = data.additionalData;
            let notification = NotificationUnpacker.unpack(payload) || {};
            if (notification) {
                this.dispatchNotification(notification);
            }
            if (data.count !== undefined) {
                setApplicationIconBadgeNumber(data.count);
            }
            signalBackgroundTaskCompletion(notID);
        } else if (cordova.platformID === 'windows') {
            let notification;
            if (data.launchArgs) {
                // notification is clicked while app isn't running
                let payload = parseJSON(data.launchArgs);
                notification = NotificationUnpacker.unpack(payload);
            } else {
                // payload is stored as raw data
                let eventArgs = data.additionalData.pushNotificationReceivedEventArgs;
                if (eventArgs.notificationType === 3) { // raw
                    let raw = eventArgs.rawNotification;
                    let payload = parseJSON(raw.content);
                    notification = NotificationUnpacker.unpack(payload);
                }
            }
            if (notification) {
                this.dispatchNotification(notification);
            }
        }
    }

    dispatchNotification(notification) {
        let event;
        if (notification.type === 'change') {
            event = new NotifierEvent('notify', this, {
                changes: notification.changes
            });
        } else if (notification.type === 'revalidation') {
            event = new NotifierEvent('revalidation', this);
        } else if (notification.type === 'alert') {
            // if notification was received in the background, the event is
            // triggered when the user clicks on the notification
            if (!notification.alert.foreground) {
                event = new NotifierEvent(this, 'alert', {
                    alert: notification.alert
                });
            }
        }
        if (event) {
            this.triggerEvent(evt);
        }
    }

    /**
     * Called when activating app after running in background on Windows
     *
     * @param  {Object} context
     */
    handleActivation = (context) => {
        let launchArgs = context.args;
        if (launchArgs) {
            let payload = JSON.parse(launchArgs);
            let notification = NotificationUnpacker.unpack(payload);
            if (notification) {
                this.dispatchNotification(notification);
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
}

let pushNotification;

/**
 * Return device details
 *
 * @return {Object}
 */
let getDeviceDetails = function() {
    let device = window.device;
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

function signalBackgroundTaskCompletion(notID) {
    if (pushNotification) {
        let success = () => {};
        let failure = () => {};
        pushNotification.finish(success, failure, notID);
    }
}

function setApplicationIconBadgeNumber(count) {
    if (pushNotification) {
        let success = () => {};
        let failure = () => {};
        pushNotification.setApplicationIconBadgeNumber(success, failure, count);
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

export {
    PushNotifier as default,
    PushNotifier,
};
