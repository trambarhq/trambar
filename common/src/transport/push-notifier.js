import { Notifier, NotifierEvent } from './notifier.js';
import { performHTTPRequest } from './http-request.js';
import { promiseSelf } from '../utils/promise-self.js';
import { delay } from '../utils/delay.js';

const defaultOptions = {
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

export class PushNotifier extends Notifier {
  constructor(options) {
    super();
    this.options = { ...defaultOptions, ...options };
    this.registrationID = null;
    this.registrationType = null;
    this.relayAddress = '';
    this.relayToken = '';
    this.networkRegistrationPromise = promiseSelf();
  }

  activate() {
    if ((typeof(PushNotification) !== 'undefined')) {
      if (!pushNotification) {
        pushNotification = PushNotification.init(this.options.platforms);
      }
      pushNotification.on('registration', this.handleRegistration);
      pushNotification.on('notification', this.handleNotification);
      pushNotification.on('error', this.handleError);

      if (cordova.platformId === 'windows') {
        document.addEventListener('activated', this.handleActivation);
      }
    } else {
      if (process.env.NODE_ENV !== 'production') {
        this.registrationID = '0'.repeat(64);
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

      if (cordova.platformId === 'windows') {
        document.removeEventListener('activated', this.handleActivation);
      }
    }
  }

  /**
   * Connect to push network and relay
   *
   * @param  {String} address
   * @param  {String} relayAddress
   *
   * @return {Promise<Boolean>}
   */
  async connect(address, relayAddress) {
    await this.registerAtPushNetwork();
    return this.registerAtPushRelay(address, relayAddress);
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
   * @param  {String} address
   * @param  {String} relayAddress
   *
   * @return {Promise<Boolean>}
   */
  async registerAtPushRelay(address, relayAddress) {
    const { initialReconnectionDelay, maximumReconnectionDelay } = this.options;
    let reconnectionDelay = initialReconnectionDelay;

    relayAddress = relayAddress.replace(/[\/\s]+$/, '');
    this.address = address;
    this.relayAddress = relayAddress;

    // keep trying to connect until the effort is abandoned (i.e. user
    // goes to a different server)
    for (;;) {
      try {
        const url = `${relayAddress}/register`;
        const details = getDeviceDetails();
        const payload = {
          network: this.registrationType,
          registration_id: this.registrationID,
          address,
          details,
        };
        const result = await this.sendRegistration(url, payload);
        if (this.address !== address || this.relayAddress !== relayAddress) {
          return false;
        }
        this.relayToken = result.token;
        const event = new NotifierEvent('connection', this, {
          connection: {
            method: this.registrationType,
            relay: this.relayAddress,
            token: this.relayToken,
            address,
            details,
          }
        });
        this.triggerEvent(event);
        return true;
      } catch (err) {
        console.error(err);
        reconnectionDelay *= 2;
        if (reconnectionDelay > maximumReconnectionDelay) {
          reconnectionDelay = maximumReconnectionDelay;
        }
        console.log(`Connection attempt in ${delay}ms: ${relayAddress}`);
        await delay(reconnectionDelay);
        if (this.address !== address || this.relayAddress !== relayAddress) {
          return false;
        }
      }
    }
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
    const options = { responseType: 'json', contentType: 'json' };
    return performHTTPRequest('POST', url, payload, options);
  }

  /**
   * Called when plugin has successful register the device
   *
   * @param  {Object} data
   */
  handleRegistration = async (data) => {
    const id = data.registrationId;
    const type = data.registrationType.toLowerCase();
    if (!type) {
      // the type is missing for WNS
      if (/windows/.test(id)) {
        type = 'wns';
      }
    }
    const debug = await isDebugMode();
    if (type === 'apns' && debug) {
      type += '-sb';  // use sandbox
    }
    this.registrationID = id;
    this.registrationType = type;
    this.networkRegistrationPromise.resolve();
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
    if (cordova.platformId === 'android') {
      const payload = data.additionalData;
      try {
        const notification = this.unpack(payload) || {};
        if (notification) {
          this.dispatchNotification(notification);
        }
        if (data.count !== undefined) {
          setApplicationIconBadgeNumber(data.count);
        }
      } catch (err) {
        console.error(err);
      }
    } else if (cordova.platformId === 'ios') {
      const payload = data.additionalData;
      const notID = payload.notId;
      try {
        const notification = this.unpack(payload) || {};
        if (notification) {
          this.dispatchNotification(notification);
        }
        if (data.count !== undefined) {
          setApplicationIconBadgeNumber(data.count);
        }
      } catch (err) {
        console.error(err);
      } finally {
        console.log(notID);
        signalBackgroundTaskCompletion(notID);
      }
    } else if (cordova.platformId === 'windows') {
      try {
        let notification;
        if (data.launchArgs) {
          // notification is clicked while app isn't running
          const payload = parseJSON(data.launchArgs);
          notification = this.unpack(payload);
        } else {
          // payload is stored as raw data
          const eventArgs = data.additionalData.pushNotificationReceivedEventArgs;
          if (eventArgs.notificationType === 3) { // raw
            const raw = eventArgs.rawNotification;
            const payload = parseJSON(raw.content);
            notification = this.unpack(payload);
          }
        }
        if (notification) {
          this.dispatchNotification(notification);
        }
      } catch (err) {
        console.error(err);
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
        event = new NotifierEvent('alert', this, {
          alert: notification.alert
        });
      }
    }
    if (event) {
      this.triggerEvent(event);
    }
  }

  /**
   * Called when activating app after running in background on Windows
   *
   * @param  {Object} context
   */
  handleActivation = (context) => {
    const launchArgs = context.args;
    if (launchArgs) {
      const payload = JSON.parse(launchArgs);
      const notification = this.unpack(payload);
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
function getDeviceDetails() {
  const device = window.device;
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
    const success = () => {};
    const failure = () => {};
    pushNotification.finish(success, failure, notID);
  }
}

function setApplicationIconBadgeNumber(count) {
  if (pushNotification) {
    const success = () => {};
    const failure = () => {};
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
  setApplicationIconBadgeNumber,
};
