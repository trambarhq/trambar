import _ from 'lodash';
import Promise from 'bluebird';
import SockJS from 'sockjs-client';
import Async from 'async-do-while';
import Notifier, { NotifierEvent } from 'transport/notifier';

const defaultOptions = {
    reconnectionDelay: 1000,
    basePath: '/socket'
};

class WebsocketNotifier extends Notifier {
    constructor(options) {
        super();
        this.options = _.defaults({}, options, defaultOptions);
        this.socket = null;
        this.notificationPermitted = false;
        this.connectionPromise = null;
        this.reconnectionCount = 0;
        this.recentMessages = [];
    }

    activate() {
        if (!this.notificationPermitted) {
            // ask user for permission to show notification
            requestNotificationPermission().then(() => {
                this.notificationPermitted = true;
            }).catch((err) => {
            })
        }
    }

    deactivate() {
        this.disconnect();
    }

    /**
     * Connect to server
     *
     * @param  {String} address
     *
     * @return {Promise<Boolean>}
     */
    connect(address) {
        if (this.address !== address) {
            this.disconnect();
        }
        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        // keep trying to connect until the effort is abandoned (i.e. user
        // goes to a different server)
        let connected = false;
        let { reconnectionDelay } = this.options;
        let promise;
        Async.do(() => {
            return this.createSocket(address).then((socket) => {
                if (this.connectionPromise !== promise) {
                    // superceded by another call
                    return;
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
                socket.onclose = () => {
                    if (this.socket !== socket) {
                        return;
                    }
                    // we're still supposed to be connected
                    // try to reestablish connection
                    this.socket = null;
                    this.address = '';
                    this.connectionPromise = null;
                    this.connect(address).then((connected) => {
                        if (connected) {
                            this.reconnectionCount += 1;
                            console.log('Connection reestablished');
                        }
                    });

                    console.log('Disconnect');
                    let event = new NotifierEvent('disconnect', this);
                    this.triggerEvent(event);
                };
                this.socket = socket;
                this.address = address;
                connected = true;
            }).catch((err) => {
                return Promise.delay(reconnectionDelay);
            });
        });
        Async.while(() => {
            if (promise === this.connectionPromise) {
                return !connected;
            } else {
                return false;
            }
        });
        Async.return(() => {
            return connected;
        });
        promise = this.connectionPromise = Async.end();
        return promise;
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
        }
        this.connectionPromise = null;
        this.address = '';
    }

    /**
     * Create a SockJS socket
     *
     * @param  {String} address
     *
     * @return {Promise<SockJS>}
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
                let evt = new NotifierEvent(this, 'alert', { alert });
                this.triggerEvent(evt);
                notification.close();
            });
        }
    }
}

function requestNotificationPermission() {
    return new Promise((resolve, reject) => {
        Notification.requestPermission((status) => {
            if (status === 'granted') {
                resolve();
            } else {
                reject(new Error('Unable to gain permission'))
            }
        })
    });
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
