var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var SockJS = require('sockjs-client');

var Locale = require('locale/locale');

module.exports = React.createClass({
    displayName: 'WebsocketNotifier',
    propTypes: {
        locale: PropTypes.instanceOf(Locale),
        onNotify: PropTypes.func,
        onNotificationClick: PropTypes.func,
    },

    statics: {
        isAvailable: function() {
            return true;
        }
    },

    getInitialState: function() {
        return {
            url: '',
            socket: null,
        };
    },

    connect: function(protocol, server, token) {
        var url = `${protocol}://${server}/socket`;
        if (this.state.url === url) {
            return Promise.resolve(true);
        }
        // close previous socket
        if (this.state.socket) {
            this.state.socket.close();
            this.setState({ socket: null, url: '' });
        }
        // create an object to track the connection attempt
        var attempt = this.connectionAttempt;
        if (attempt) {
            if (attempt.url === url) {
                // already connecting to URL
                return attempt.promise;
            }
        }
        attempt = this.connectionAttempt = {};
        attempt.url = url;
        attempt.promise = new Promise((resolve, reject) => {
            var socket = new SockJS(url);
            socket.onopen = (evt) => {
                if (attempt === this.connectionAttempt) {
                    // send authorization token and locale
                    var locale = _.get(this.props.locale, 'languageCode', 'en');
                    var payload = {
                        authorization: { token, locale },
                    };
                    socket.send(JSON.stringify(payload));
                    this.setState({ socket, url }, () => {
                        this.connectionAttempt = undefined;
                        resolve(true);
                    });
                } else {
                    // earlier attempt was abandoned
                    socket.close();
                    reject(new Error('Connection abandoned'));
                }
            };
            socket.onmessage = (evt) => {
                var object = parseJSON(evt.data);
                if (object.changes) {
                    this.triggerNotifyEvent(object.changes);
                } else if (object.alert) {
                    this.showNotificationMessage(object.alert);
                }
            };
            socket.onclose = (evt) => {
                // neither onopen() or onerror() was called
                if (!attempt.promise.isFulfilled()) {
                    reject(new Error('Unable to establish a connection'));
                    this.connectionAttempt = undefined;
                }
                if (this.state.socket === socket) {
                    this.setState({ socket: null, url: '' });
                }
            };
            socket.onerror = (evt) => {
                if (attempt === this.connectionAttempt) {
                    this.connectionAttempt = undefined;
                }
                reject(new Error(evt.message));
            };
        });
        return attempt.promise;
    },

    triggerNotifyEvent: function(changes) {
        if (this.props.onNotify) {
            this.props.onNotify({
                type: 'notify',
                target: this,
                changes: changes
            });
        }
    },

    showNotificationMessage: function(msg) {

    },

    render: function() {
        return (
            <div></div>
        );
    },
});

function parseJSON(text) {
    try {
        return JSON.parse(text);
    } catch (err) {
    }
}
