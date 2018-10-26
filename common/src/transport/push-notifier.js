import _ from 'lodash';
import Promise from 'bluebird';
import ManualPromise from 'utils/manual-promise';
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
        this.registrationID = null;
        this.registrationType = null;
        this.serverAddress = '';
        this.relayAddress = '';
        this.relayRegistrationPromise = null;
        this.networkRegistrationPromise = new ManualPromise;
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
        } else {
            if (process.env.NODE_ENV !== 'production') {
                this.registrationID = _.repeat('0', 64);
                this.registrationType = 'apns-sb';
                this.networkRegistrationPromise.resolve();
            } else {
                let err = new Error('Push notification plugin is missing');
                this.networkRegistrationPromise.reject(err);
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
     * Connect to push network and relay
     *
     * @param  {String} serverAddress
     * @param  {String} relayAddress
     *
     * @return {Promise<Boolean>}
     */
    connect(serverAddress, relayAddress) {
        return this.registerAtPushNetwork().then(() => {
            return this.registerAtPushRelay(serverAddress, relayAddress);
        });
    }

    /**
     * Register device at push network
     *
     * @return {Promise<Boolean>}
     */
    registerAtPushNetwork() {
        // events triggered by activate() will resolve this promise
        return this.networkRegistrationPromise;
    }

    /**
     * Register device at push relay
     *
     * @param  {String} relayAddress
     * @param  {String} serverAddress
     *
     * @return {Promise<Boolean>}
     */
    registerAtPushRelay(serverAddress, relayAddress) {
        if (this.serverAddress !== serverAddress && this.relayAddress !== relayAddress) {
            if (this.relayRegistrationPromise) {
                this.relayRegistrationPromise = null;
            }
        }
        if (this.relayRegistrationPromise) {
            return this.relayRegistrationPromise;
        }
        this.serverAddress = serverAddress;
        this.relayAddress = relayAddress;

        let registered = false;
        let delay = this.options.initialReconnectionDelay;
        let maximumDelay = this.options.maximumReconnectionDelay;

        relayAddress = _.trimEnd(relayAddress, '/');
        // keep trying to connect until the effort is abandoned (i.e. user
        // goes to a different server)
        Async.do(() => {
            let url = `${relayAddress}/register`;
            let details = getDeviceDetails();
            let payload = {
                network: this.registrationType,
                registration_id: this.registrationID,
                details: details,
                address: serverAddress,
            };
            return this.sendRegistration(url, payload).then((result) => {
                if (this.serverAddress === serverAddress && this.relayAddress === relayAddress) {
                    this.pushRelayResponse = result;
                    let event = new NotifierEvent('connection', this, {
                        connection: {
                            method: this.registrationType,
                            relay: relayAddress,
                            token: result.token,
                            address: serverAddress,
                            details: details,
                        }
                    });
                    this.triggerEvent(event);
                }
                registered = true;
                return null;
            }).catch((err) => {
                console.error(err);
                delay *= 2;
                if (delay > maximumDelay) {
                    delay = maximumDelay;
                }
                console.log(`Connection attempt in ${delay}ms: ${relayAddress}`);
                return Promise.delay(delay, null);
            });
        });
        Async.while(() => {
            if (this.serverAddress === serverAddress && this.relayAddress === relayAddress) {
                return !registered;
            } else {
                return false;
            }
        });
        Async.return(() => {
            return registered;
        });
        this.relayRegistrationPromise = Async.end();
        return this.relayRegistrationPromise;
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
            this.registrationID = id;
            this.registrationType = type;
            this.networkRegistrationPromise.resolve();
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
        if (!this.networkRegistrationPromise.isFulfilled()) {
            this.networkRegistrationPromise.reject(err);
        }
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
