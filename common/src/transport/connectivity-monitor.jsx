var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;

// widgets
var Diagnostics = require('widgets/diagnostics');
var DiagnosticsSection = require('widgets/diagnostics-section');

module.exports = React.createClass({
    displayName: 'ConnectivityMonitor',
    propTypes: {
        inForeground: PropTypes.bool,
        onChange: PropTypes.func,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            online: this.isOnline(),
            type: this.getConnectionType(),
        };
    },

    /**
     * Return true if there's network connection
     *
     * @return {Boolean}
     */
    isOnline: function() {
        if (process.env.PLATFORM === 'cordova') {
            var connection = getNetworkAPI();
            return (connection.type !== 'none');
        } else {
            return navigator.onLine;
        }
    },

    /**
     * Return the connection type
     *
     * @return {String}
     */
    getConnectionType: function() {
        var connection = getNetworkAPI();
        if (process.env.PLATFORM === 'cordova') {
            return connection.type;
        } else {
            return (connection) ? connection.effectiveType : 'unknown';
        }
    },

    /**
     * Attach handlers
     */
    componentWillMount: function() {
        if (process.env.PLATFORM === 'cordova') {
            document.addEventListener('online',  this.handleBrowserOnline);
            document.addEventListener('offline', this.handleBrowserOffline);
        } else {
            window.addEventListener('online',  this.handleBrowserOnline);
            window.addEventListener('offline', this.handleBrowserOffline);
            var connection = getNetworkAPI();
            if (connection) {
                connection.addEventListener('typechange', this.handleConnectionTypeChange);
            }
        }
        if (navigator.getBattery) {
            navigator.getBattery().then((battery) => {
                battery.addEventListener('levelchange', this.handleBatteryChange);
                battery.addEventListener('chargingchange', this.handleBatteryChange);
                this.setState({
                    battery: _.pick(battery, 'charging', 'level')
                });
            });
        }
    },

    /**
     * Handle Android quirk
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        console.log(nextProps.inForeground);
        if (this.props.inForeground !== nextProps.inForeground) {
            if (/Android/.test(navigator.userAgent)) {
                // on Android, we can lose connectivity after running in the
                // background for a while when the device is in battery saving
                // mode
                if (nextProps.inForeground) {
                    clearTimeout(this.offlineTimeout);
                    var online = this.isOnline();
                    if (!this.state.online && online) {
                        this.setState({ online: true }, () => {
                            this.triggerChangeEvent(this.state.online, this.state.type);
                        });
                    }
                } else {
                    this.offlineTimeout = setTimeout(() => {
                        if (this.state.online) {
                            if (this.state.battery && this.state.battery.level < 0.2) {
                                this.setState({ online: false }, () => {
                                    this.triggerChangeEvent(this.state.online, this.state.type);
                                });
                            }
                        }
                    }, 30 * 1000);
                }
            }

            if (nextProps.inForeground) {
                // check connectivity on resume
                var online = this.isOnline();
                if (this.state.online !== online) {
                    this.setState({ online }, () => {
                        this.triggerChangeEvent(true, type);
                    });
                }
            }
        }
    },

    /**
     * Trigger event on mount
     */
    componentDidMount: function() {
        this.triggerChangeEvent(this.state.online, this.state.type);
    },

    /**
     * Remove handlers
     *
     * @return {[type]}
     */
    componentWillUnmount: function() {
        if (process.env.PLATFORM === 'cordova') {
            document.removeEventListener('online',  this.handleBrowserOnline);
            document.removeEventListener('offline', this.handleBrowserOffline);
        } else {
            window.removeEventListener('online',  this.handleBrowserOnline);
            window.removeEventListener('offline', this.handleBrowserOffline);
            var connection = getNetworkAPI();
            if (connection) {
                connection.removeEventListener('typechange', this.handleConnectionTypeChange);
            }
        }
        if (navigator.getBattery) {
            navigator.getBattery().then((battery) => {
                battery.removeEventListener('levelchange', this.handleBatteryChange);
                battery.removeEventListener('chargingchange', this.handleBatteryChange);
            });
        }
    },

    /**
     * Inform parent component that an alert was clicked
     *
     * @param  {Boolean} online
     * @param  {String} type
     */
    triggerChangeEvent: function(online, type) {
        if (this.props.onChange) {
            this.props.onChange({
                type: 'alertclick',
                target: this,
                online,
                type,
            })
        }
    },

    /**
     * Called when the browser detects that it has lost connectivity
     *
     * @param  {Event} evt
     */
    handleBrowserOffline: function(evt) {
        this.setState({ online: false }, () => {
            this.triggerChangeEvent(false, this.state.type);
        });
    },

    /**
     * Called when the browser detects that it once again has connectivity
     *
     * @param  {Event} evt
     */
    handleBrowserOnline: function(evt) {
        var type = this.getConnectionType();
        this.setState({ online: true, type }, () => {
            this.triggerChangeEvent(true, type);
        });
    },

    /**
     * Called when the browser detects a change in connection type
     *
     * @param  {Event} evt
     */
    handleConnectionTypeChange: function(evt) {
        var type = this.getConnectionType();
        this.setState({ type });
        this.triggerChangeEvent(this.state.online, type);
    },

    /**
     * Called when battery status changes
     *
     * @param  {Event} evt
     */
    handleBatteryChange: function(evt) {
        this.setState({
            battery: _.pick(evt.target, 'charging', 'level')
        });
    },

    /**
     * Render diagnostics
     *
     * @return {ReactElement}
     */
    render: function() {
        return (
            <Diagnostics type="connectivity-monitor">
                <DiagnosticsSection label="Connection">
                    <div>Online: {this.state.online ? 'yes' : 'no'}</div>
                    <div>Type: {this.state.type}</div>
                </DiagnosticsSection>
            </Diagnostics>
        );
    },
});

function getNetworkAPI() {
    return navigator.connection || navigator.mozConnection || navigator.webkitConnection;
}
