import _ from 'lodash';
import SockJS from 'sockjs-client';
import { Notifier, NotifierEvent } from './notifier.js';
import { delay } from '../utils/delay.js';

const defaultOptions = {
  reconnectionDelay: 1000,
  basePath: '/socket'
};

class WebsocketNotifier extends Notifier {
  constructor(options) {
    super();
    this.options = Object.assign({ ...defaultOptions }, options);
    this.socket = null;
    this.notificationPermitted = false;
    this.reconnectionCount = 0;
    this.recentMessages = [];
  }

  activate() {
    if (!this.notificationPermitted) {
      // ask user for permission to show notification
      this.requestNotificationPermission();
    }
  }

  deactivate() {
    this.disconnect();
  }

  /**
   * Connect to server
   *
   * @param  {string} address
   *
   * @return {boolean}
   */
  async connect(address) {
    let { reconnectionDelay } = this.options;

    if (this.address === address) {
      return false;
    }
    this.disconnect();
    this.address = address;

    // keep trying to connect until the effort is abandoned (i.e. user
    // goes to a different server)
    for (;;) {
      try {
        let socket = await this.createSocket(address);
        if (this.address !== address) {
          socket.close();
          return false;
        }
        socket.onmessage = (evt) => {
          if (this.socket !== socket) {
            return;
          }
          let msg = parseJSON(evt.data);
          let notification = this.unpack(msg);
          let event;
          if (notification.type === 'change') {
            event = new NotifierEvent('notify', this, {
              changes: notification.changes
            });
          } else if (notification.type === 'alert') {
            this.showAlert(notification.alert);
          } else if (notification.type === 'connection') {
            event = new NotifierEvent('connection', this, {
              connection: notification.connection
            });
          } else if (notification.type === 'revalidation') {
            event = new NotifierEvent('revalidation', this);
          }
          if (event) {
            this.triggerEvent(event);
          }
          this.saveMessage(msg);
        };
        socket.onclose = async () => {
          if (this.socket !== socket) {
            return;
          }

          console.log('Disconnect');
          let event = new NotifierEvent('disconnect', this);
          this.triggerEvent(event);

          // we're still supposed to be connected
          // try to reestablish connection
          this.socket = null;
          this.address = '';
          let connected = await this.connect(address);
          if (connected) {
            this.reconnectionCount += 1;
            console.log('Connection reestablished');
          }
        };
        this.socket = socket;
        return true;
      } catch (err) {
        //console.error(err);
        await delay(reconnectionDelay);
        if (this.address !== address) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Close web-socket connection
   */
  disconnect() {
    if (this.socket) {
      let socket = this.socket;
      this.socket = null;
      this.reconnectionCount = 0;
      socket.close();

      let event = new NotifierEvent('disconnect', this);
      this.triggerEvent(event);
    }
    this.address = '';
  }

  /**
   * Create a SockJS socket
   *
   * @param  {string} address
   *
   * @return {SockJS}
   */
  createSocket(address) {
    let url = address + this.options.basePath;
    return new Promise((resolve, reject) => {
      let socket = new SockJS(url);
      let isFulfilled = false;
      socket.onopen = (evt) => {
        if (!isFulfilled) {
          isFulfilled = true;
          resolve(socket);
        }
      };
      socket.onclose = () => {
        if (!isFulfilled) {
          // neither onopen() or onerror() was called
          reject(new Error('Unable to establish a connection'));
        }
      };
      socket.onerror = (evt) => {
        if (!isFulfilled) {
          isFulfilled = true;
          reject(new Error(evt.message));
        }
      };
    });
  }

  /**
   * Display an alert popup
   *
   * @param  {Object} alert
   */
  showAlert(alert) {
    if (this.notificationPermitted) {
      let options = {};
      if (alert.profile_image) {
        options.icon = alert.profile_image;
      } else {
        options.icon = this.options.defaultProfileImage;
      }
      if (alert.message) {
        options.body = alert.message;
      } else if (alert.attached_image) {
        // show attach image only if there's no text
        options.image = alert.attached_image;
      }
      options.lang = alert.locale;
      let notification = new Notification(alert.title, options);
      notification.addEventListener('click', () => {
        let evt = new NotifierEvent('alert', this, { alert });
        this.triggerEvent(evt);
        notification.close();
      });
    }
  }

  requestNotificationPermission() {
    try {
      Notification.requestPermission((status) => {
        if (status === 'granted') {
          this.notificationPermitted = true;
        }
      });
    } catch (err) {
    }
  }
}


function parseJSON(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    return {};
  }
}

export {
  WebsocketNotifier as default,
  WebsocketNotifier,
};
