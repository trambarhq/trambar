import _ from 'lodash';
import Promise from 'bluebird';
import React from 'react', PropTypes = React.PropTypes;
import SockJS from 'sockjs-client';
import Async from 'async-do-while';
import NotificationUnpacker from 'transport/notification-unpacker';
import EventEmitter from 'utils/event-emitter';

import Locale from 'locale/locale';

const defaultOptions = {
    basePath: '/srv/socket',
    online: true,
    initialReconnectionDelay: 500,
    maximumReconnectionDelay: 30000,
};

class WebsocketNotifier extends EventEmitter {
    constructor(options) {
        this.options = _.defaults({}, options, defaultOptions);
        this.socket = null;
        this.notificationPermitted = false;
        this.reconnectionCount = 0;
        this.recentMessages = [];
    }

    initialize() {
        // ask user for permission to show notification
        requestNotificationPermission().then(() => {
            this.setState({ notificationPermitted: true })
        }).catch((err) => {
        })
    }

    /**
     * Wait for props.online to become true
     *
     * @return {Promise}
     */
    waitForConnectivity() {
        if (this.props.online) {
            return Promise.resolve();
        } else {
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

    /**
     * Connect to server
     *
     * @param  {String} serverAddress
     *
     * @return {Boolean}
     */
    connect(serverAddress) {
        // track connection attempt with an object
        var attempt = this.connectionAttempt;
        if (attempt) {
            if (attempt.serverAddress === serverAddress) {
                // already connecting to server
                return attempt.promise;
            }
        }
        attempt = this.connectionAttempt = { serverAddress };

        var connected = false;
        var delay = this.props.initialReconnectionDelay;
        var maximumDelay = this.props.maximumReconnectionDelay;

        // keep trying to connect until the effort is abandoned (i.e. user
        // goes to a different server)
        Async.do(() => {
            return this.createSocket(serverAddress).then((socket) => {
                if (attempt === this.connectionAttempt) {
                    socket.onmessage = (evt) => {
                        if (this.socket === socket) {
                            var msg = parseJSON(evt.data);
                            var payload = _.assign({ address: serverAddress }, msg);
                            var notification = NotificationUnpacker.unpack(payload);
                            if (notification.type === 'change') {
                                this.triggerNotifyEvent(notification.changes);
                            } else if (notification.type === 'alert') {
                                this.showAlert(notification.alert);
                            } else if (notification.type === 'connection') {
                                socket.id = notification.connection.token;
                                this.triggerConnectEvent(notification.connection);
                            } else if (notification.type === 'revalidation') {
                                this.triggerRevalidateEvent(notification.revalidation);
                            }

                            this.recentMessages.unshift(msg);
                            if (this.recentMessages.length > 10) {
                               this.recentMessages.splice(10);
                            }
                        }
                    };
                    socket.onclose = () => {
                        if (this.socket === socket) {
                            // we're still supposed to be connected
                            // try to reestablish connection
                            this.socket = null;
                            this.connect(serverAddress).then((connected) => {
                                if (connected) {
                                    this.reconnectionCount += 1;
                                    console.log('Connection reestablished');
                                }
                            });

                            if (this.options.serverAddress === serverAddress) {
                                console.log('Disconnect');
                                this.triggerDisconnectEvent();
                            }
                        }
                    };
                    this.socket = socket;
                }
                connected = true;
            }).catch((err) => {
                delay *= 2;
                if (delay > maximumDelay) {
                    delay = maximumDelay;
                }
                console.log(`Connection attempt in ${delay}ms: ${serverAddress}`);
                return Promise.delay(delay);
            });
        });
        Async.while(() => {
            if (attempt === this.connectionAttempt) {
                return !connected;
            } else {
                return false;
            }
        });
        Async.return(() => {
            this.connectionAttempt = null;
            return connected;
        });
        attempt.promise = Async.end();
        return attempt.promise;
    }

    /**
     * Close web-socket connection
     */
    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
            this.reconnectionCount = 0;
        }
    }

    /**
     * Create a SockJS socket
     *
     * @param  {String} serverAddress
     *
     * @return {Promise<SockJS>}
     */
    createSocket(serverAddress) {
        var basePath = this.props.basePath;
        return this.waitForConnectivity().then(() => {
            return new Promise((resolve, reject) => {
                var url = `${serverAddress}${basePath}`;
                var socket = new SockJS(url);
                var isFulfilled = false;
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
        });
    }

    /**
     * Display an alert popup
     *
     * @param  {Object} alert
     */
    showAlert(alert) {
        if (this.notificationPermitted) {
            var options = {};
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
            options.lang = _.get(this.props.locale, 'languageCode');
            var notification = new Notification(alert.title, options);
            notification.addEventListener('click', () => {
                this.triggerAlertClickEvent(alert);
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
