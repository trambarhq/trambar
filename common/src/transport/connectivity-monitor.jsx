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
        var connection = getNetworkAPI();
        if (process.env.PLATFORM === 'cordova') {
            return {
                online: connection.type !== 'none',
                type: connection.type,
            };
        } else {
            return {
                online: navigator.onLine,
                type: (connection) ? connection.effectiveType : undefined,
            };
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
    },

    /**
     * Handle Android quirk
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (this.props.inForeground !== nextProps.inForeground) {
            if (/Android/.test(navigator.userAgent)) {
                // on Android, we can lose connectivity after running in the
                // background for a while when the device is in battery saving
                // mode
                if (nextProps.inForeground) {
                    clearTimeout(this.offlineTimeout);
                    if (!this.state.online && navigator.onLine) {
                        this.setState({ online: true }, () => {
                            this.triggerChangeEvent(this.state.online, this.state.type);
                        });
                    }
                } else {
                    this.offlineTimeout = setTimeout(() => {
                        if (this.state.online) {
                            this.setState({ online: false }, () => {
                                this.triggerChangeEvent(this.state.online, this.state.type);
                            });
                        }
                    }, 30 * 1000);
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
        this.setState({ online: false });
        this.triggerChangeEvent(false, this.state.type);
    },

    /**
     * Called when the browser detects that it once again has connectivity
     *
     * @param  {Event} evt
     */
    handleBrowserOnline: function(evt) {
        if (process.env.PLATFORM === 'cordova') {
            var connection = getNetworkAPI();
            this.setState({ online: true, type: connection.type });
            this.triggerChangeEvent(true, connection.type);
        } else {
            this.setState({ online: true });
            this.triggerChangeEvent(true, this.state.type);
        }
    },

    /**
     * Called when the browser detects a change in connection type
     *
     * @param  {Event} evt
     */
    handleConnectionTypeChange: function(evt) {
        if (process.env.PLATFORM !== 'browser') return;
        var type = evt.target.effectiveType;
        this.setState({ type });
        this.triggerChangeEvent(this.state.online, type);
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
