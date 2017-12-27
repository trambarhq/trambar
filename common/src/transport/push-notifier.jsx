var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Async = require('async-do-while');
var HTTPRequest = require('transport/http-request');

module.exports = React.createClass({
    displayName: 'PushNotifier',
    propTypes: {
        serverAddress: PropTypes.string,
        relayAddress: PropTypes.string,
        initialReconnectionDelay: PropTypes.number,
        maximumReconnectionDelay: PropTypes.number,

        onConnect: PropTypes.func,
        onDisconnect: PropTypes.func,
        onNotify: PropTypes.func,
        onAlertClick: PropTypes.func,
    },

    statics: {
        isAvailable: function() {
            return (process.env.PLATFORM !== 'mobile');
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
        // TODO: obtain actual information from Cordova plugin
        return {
            pushNetwork: 'fcm',
            registrationId: 'test-id:0000000000000',
            deviceDetails: { test: 1 },
            info: null,
        };
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
                 this.register(this.props.relayAddress, this.props.serverAddress, this.state.registrationId);
             }
        }
    },

    /**
     * Connect to server
     *
     * @param  {String} relayAddress
     * @param  {String} serverAddress
     * @param  {String} registrationId
     *
     * @return {Boolean}
     */
    register: function(relayAddress, serverAddress, registrationId) {
        // track registration attempt with an object
        var attempt = this.registrationAttempt;
        if (attempt) {
            if (attempt.relayAddress === relayAddress
             && attempt.serverAddress === serverAddress
             && attempt.registrationId === registrationId) {
                // already connecting to server
                return attempt.promise;
            }
        }
        attempt = this.registrationAttempt = { relayAddress, serverAddress, registrationId };
        this.setState({ info: null, registered: false });

        var registered = false;
        var delay = this.props.initialReconnectionDelay;
        var maximumDelay = this.props.maximumReconnectionDelay;

        // keep trying to connect until the effort is abandoned (i.e. user
        // goes to a different server)
        Async.do(() => {
            var url = `${_.trimEnd(relayAddress, '/')}/register`;
            var payload = {
                network: this.state.pushNetwork,
                registration_id: registrationId,
                details: this.state.deviceDetails,
                address: serverAddress,
            };
            var options = {
                responseType: 'json',
                contentType: 'json',
            };
            return HTTPRequest.fetch('POST', url, payload, options).then((info) => {
                if (attempt === this.registrationAttempt) {
                    this.registrationAttempt = null;
                    this.setState({ info: _.omit(info, 'token'), registered: true });
                    this.triggerConnectEvent(info.token);
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
     * Notify parent component that a change event was received
     *
     * @param  {String} address
     * @param  {Object} changes
     */
    triggerNotifyEvent: function(address, changes) {
        if (this.props.onNotify) {
            this.props.onNotify({
                type: 'notify',
                target: this,
                address,
                changes,
            });
        }
    },

    /**
     * Notify parent component that a connection was established
     *
     * @param  {String} address
     * @param  {String} token
     */
    triggerConnectEvent: function(address, token) {
        if (this.props.onConnect) {
            this.props.onConnect({
                type: 'connect',
                target: this,
                address,
                token,
            });
        }
    },

    /**
     * Notify parent component that a connection was lost
     */
    triggerDisconnectEvent: function() {
        if (this.props.onDisconnect) {
            this.props.onDisconnect({
                type: 'disconnect',
                target: this,
                address,
            });
        }
    },

    /**
     * Inform parent component that an alert was clicked
     *
     * @param  {String} address
     * @param  {Object} alert
     */
    triggerAlertClickEvent: function(address, alert) {
        if (this.props.onAlertClick) {
            this.props.onAlertClick({
                type: 'alertclick',
                target: this,
                address,
                alert,
            })
        }
    },

    render: function() {
        return null;
    },
});
