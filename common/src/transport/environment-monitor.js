import _ from 'lodash';
import Promise from 'bluebird';
import EventEmitter from 'utils/event-emitter';

class EnvironmentMonitor extends EventEmitter {
    constructor(options) {
        super();
        this.inForeground = true;
        this.online = isOnline();
        this.connectionType = getConnectionType();
    }

    initialize() {
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
                this.battery = _.pick(battery, 'charging', 'level');
            });
        }
    }

    shutdown() {
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
    }

    /**
     * Called when the browser detects that it has lost connectivity
     *
     * @param  {Event} evt
     */
    handleBrowserOffline = (evt) => {
        this.online = false;
        this.triggerChangeEvent(false, this.state.type);
    },

    /**
     * Called when the browser detects that it once again has connectivity
     *
     * @param  {Event} evt
     */
    handleBrowserOnline = (evt) => {
        this.connectionType = getConnectionType();
        this.online = true;
        this.triggerChangeEvent(true, type);
    }

    /**
     * Called when the browser detects a change in connection type
     *
     * @param  {Event} evt
     */
    handleConnectionTypeChange = (evt) => {
        this.connectionType = getConnectionType();
        this.triggerChangeEvent(this.state.online, type);
    },

    /**
     * Called when battery status changes
     *
     * @param  {Event} evt
     */
    handleBatteryChange = (evt) => {
        this.battery = _.pick(evt.target, 'charging', 'level');
    }
}

/**
 * Return true if there's network connection
 *
 * @return {Boolean}
 */
function isOnline() {
    if (process.env.PLATFORM === 'cordova') {
        var connection = getNetworkAPI();
        return (connection.type !== 'none');
    } else {
        return navigator.onLine;
    }
}

function getConnectionType() {
    var connection = getNetworkAPI();
    if (process.env.PLATFORM === 'cordova') {
        return connection.type;
    } else {
        return (connection) ? connection.effectiveType : 'unknown';
    }
}

function getNetworkAPI() {
    return navigator.connection || navigator.mozConnection || navigator.webkitConnection;
}

function isActuallyAndroid() {
    var ua = navigator.userAgent;
    if (/Android/.test(ua)) {
        if (!/Edge/.test(ua)) {
            return true;
        }
    }
    return false;
}
