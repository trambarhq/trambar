var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var SockJS = require('sockjs-client');
var Async = require('async-do-while');

var Locale = require('locale/locale');

module.exports = React.createClass({
    displayName: 'WebsocketNotifier',
    propTypes: {
        initialReconnectionDelay: PropTypes.number,
        maximumReconnectionDelay: PropTypes.number,

        locale: PropTypes.instanceOf(Locale),

        onNotify: PropTypes.func,
        onAlertClick: PropTypes.func,
    },

    statics: {
        // TODO
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
            protocol: '',
            server: '',
            socket: null,
            showingAlert: false,
        };
    },

    /**
     * Connection to server
     *
     * @param  {String} protocol
     * @param  {String} server
     * @param  {String} token
     *
     * @return {Promise<Boolean>}
     */
    connect: function(protocol, server, token) {
        if (this.state.protocol === protocol && this.state.server === server) {
            return Promise.resolve(true);
        }
        // close previous socket
        if (this.state.socket) {
            // store socket in variable as state might change in meantime
            var socket = this.state.socket;
            this.setState({ socket: null, protocol: '', server: '' }, () => {
                socket.close();
            });
        }

        // create an object to track the connection attempt
        var attempt = this.connectionAttempt;
        if (attempt) {
            if (attempt.server === server) {
                // already connecting to server
                return attempt.promise;
            }
        }
        attempt = this.connectionAttempt = { server };

        var connected = false;
        var delay = this.props.initialReconnectionDelay;
        var maximumDelay = this.props.maximumReconnectionDelay;

        // keep trying to connect until the effort is abandoned (i.e. user
        // goes to a different server)
        Async.do(() => {
            return this.createSocket(protocol, server, token).then((socket) => {
                if (attempt === this.connectionAttempt) {
                    // send authorization token and locale
                    var locale = _.get(this.props.locale, 'languageCode', 'en');
                    var payload = {
                        authorization: { token, locale },
                    };
                    socket.send(JSON.stringify(payload));

                    socket.onmessage = (evt) => {
                        if (this.state.socket === socket) {
                            var object = parseJSON(evt.data);
                            if (object.changes) {
                                this.triggerNotifyEvent(object.changes);
                            } else if (object.alert) {
                                this.showAlert(object.alert);
                            }
                        }
                    };
                    socket.onclose = () => {
                        if (this.state.socket === socket) {
                            // we're still supposed to be connected
                            // try to reestablish connection
                            this.setState({ socket: null, server: '' }, () => {
                                this.connect(protocol, server, token);
                            });
                        }
                    };
                    this.setState({ socket, protocol, server });
                }
                connected = true;
            }).catch((err) => {
                delay *= 2;
                if (delay > maximumDelay) {
                    delay = maximumDelay;
                }
                //console.log(`Connection attempt in ${delay}ms: ${server}`)
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
            return connected;
        });
        attempt.promise = Async.end();
        return attempt.promise;
    },

    createSocket: function(protocol, server, token) {
        //console.log('Connecting to ' + server);
        return new Promise((resolve, reject) => {
            var url = `${protocol}//${server}/socket`;
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
    },

    triggerNotifyEvent: function(changes) {
        if (this.props.onNotify) {
            this.props.onNotify({
                type: 'notify',
                target: this,
                protocol: this.state.protocol,
                server: this.state.server,
                changes: changes
            });
        }
    },

    triggerAlertClickEvent: function(alert) {
        if (this.props.onAlertClick) {
            this.props.onAlertClick({
                type: 'alertclick',
                target: this,
                alert,
            })
        }
    },

    componentWillMount: function() {
        requestNotificationPermission().then(() => {
            this.setState({ showingAlert: true })
        }).catch((err) => {
        })
    },

    showAlert: function(alert) {
        if (this.state.showingAlert) {
            var options = {};
            var server = this.state.server;
            var protocol = this.state.protocol;
            if (alert.profile_image) {
                options.icon = `${protocol}//${server}${alert.profile_image}`;
            }
            if (alert.message) {
                options.body = alert.message;
            } else if (alert.attached_image) {
                // show attach image only if there's no text
                options.image = `${protocol}//${server}${alert.attached_image}`;
            }
            options.lang = this.props.locale.languageCode;
            var notification = new Notification(alert.title, options);
            notification.addEventListener('click', () => {
                this.triggerAlertClickEvent(alert);
                notification.close();
            });
        }
    },

    render: function() {
        return null;
    },
});

function parseJSON(text) {
    try {
        return JSON.parse(text);
    } catch (err) {
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
