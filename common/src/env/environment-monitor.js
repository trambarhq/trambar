import _ from 'lodash';
import Promise from 'bluebird';
import EventEmitter, { GenericEvent } from 'utils/event-emitter';

class EnvironmentMonitor extends EventEmitter {
    constructor(options) {
        super();
        this.visible = true;
        this.online = isOnline();
        this.connectionType = getConnectionType();
        this.battery = {};
        this.screenWidth = screen.width;
        this.screenHeight = screen.height;
        this.devicePixelRatio = window.devicePixelRatio;
        this.webpSupport = isWebpSupported(),
        this.browser = detectBrowser();
        this.os = detectOS();
        if (this.os === 'android' || this.os === 'ios' || this.os === 'wp') {
            this.pointingDevice = 'touch';
        } else {
            this.pointingDevice = 'mouse';
        }
    }

    activate() {
        this.monitor(true);
    }

    shutdown() {
        this.monitor(false);
    }

    monitor(enabled) {
        toggleEventListener(window, 'resize', this.handleWindowResize, enabled);
        toggleEventListener(window, 'visibilitychange', this.handleVisibilityChange, enabled);
        toggleEventListener(window, 'mousemove', this.handleMouseEvent, enabled);
        toggleEventListener(window, 'mousedown', this.handleMouseEvent, enabled);
        toggleEventListener(window, 'touchstart', this.handleTouchEvent, enabled);

        toggleEventListener(window, 'online', this.handleOnline, enabled);
        toggleEventListener(window, 'offline', this.handleOffline, enabled);

        var network = getNetworkAPI();
        toggleEventListener(network, 'typechange', this.handleConnectionTypeChange, enabled);

        getBattery().then((battery) => {
            if (battery) {
                toggleEventListener.addEventListener(battery, 'levelchange', this.handleBatteryChange, enabled);
                toggleEventListener.addEventListener(battery, 'chargingchange', this.handleBatteryChange, enabled);

                let { charging, level } = battery;
                this.battery = { charging, level };
            }
        });

        if (process.env.PLATFORM === 'cordova') {
            toggleEventListener.addEventListener(document, 'pause', this.handlePause);
            toggleEventListener.addEventListener(document, 'resume', this.handleResume);
        }
    }

    /**
     * Called when the browser detects that it has lost connectivity
     *
     * @param  {Event} evt
     */
    handleOffline = (evt) => {
        this.online = false;
        this.triggerEvent(new EnvironmentMonitorEvent('change', this));
    }

    /**
     * Called when the browser detects that it once again has connectivity
     *
     * @param  {Event} evt
     */
    handleOnline = (evt) => {
        this.online = true;
        this.connectionType = getConnectionType();
        this.triggerEvent(new EnvironmentMonitorEvent('change', this));
    }

    /**
     * Called when Cordova application goes into background
     *
     * @param  {Event} evt
     */
    handlePause = (evt) => {
        if (process.env.PLATFORM !== 'cordova') return;
        this.visible = false;
        this.paused = true;
        this.triggerEvent(new EnvironmentMonitorEvent('change', this));
    }

    /**
     * Called when Cordova application comes into foreground again
     *
     * @param  {Event} evt
     */
    handleResume = (evt) => {
        if (process.env.PLATFORM !== 'cordova') return;
        this.visible = true;
        this.paused = false;
        this.triggerEvent(new EnvironmentMonitorEvent('change', this));
    }

    handleVisibilityChange = (evt) => {
        this.visible = (document.visibilityState === 'visible');
        this.triggerEvent(new EnvironmentMonitorEvent('change', this));
    }

    handleWindowResize = (evt) => {
        this.screenWidth = screen.width;
        this.screenHeight = screen.height;
        this.devicePixelRatio = window.devicePixelRatio;
        this.triggerEvent(new EnvironmentMonitorEvent('change', this));
    }

    /**
     * Called when the browser detects a change in connection type
     *
     * @param  {Event} evt
     */
    handleConnectionTypeChange = (evt) => {
        this.connectionType = getConnectionType();
        this.triggerEvent(new EnvironmentMonitorEvent('change', this));
    }

    /**
     * Called when battery status changes
     *
     * @param  {Event} evt
     */
    handleBatteryChange = (evt) => {
        let { charging, level} = evt.target;
        this.battery = { charging, level };
        this.triggerEvent(new EnvironmentMonitorEvent('change', this));
    }

    handleMouseEvent = (evt) => {
        if (this.pointingDevice !== 'mouse') {
            this.pointingDevice = 'mouse';
            this.triggerEvent(new EnvironmentMonitorEvent('change', this));
        }
    }

    handleTouchEvent = (evt) => {
        if (this.pointingDevice !== 'touch') {
            this.pointingDevice = 'touch';
            this.triggerEvent(new EnvironmentMonitorEvent('change', this));
        }
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

function getBattery() {
    if (navigator.getBattery) {
        return navigator.getBattery()
    } else {
        return Promise.resolve();
    }

}

var uaFragmentsBrowser = {
    firefox: 'Firefox',
    opera: 'Opera',
    ie: 'Trident',
    edge: 'Edge',
    chrome: 'Chrome',
    safari: 'Safari',
};

function detectBrowser() {
    var ua = navigator.userAgent;
    for (let name in uaFragmentsBrowser) {
        if (ua.indexOf(uaFragmentsBrowser[name]) > -1) {
            return name;
        }
    }
    return 'unknown';
}

var uaFragmentsOS = {
    wp: 'Windows Phone',
    windows: 'Windows',
    ios: 'iPhone OS',
    osx: 'OS X',
    android: 'Android',
    linux: 'Linux',
};

function detectOS() {
    var ua = navigator.userAgent;
    for (let name in uaFragmentsOS) {
        if (ua.indexOf(uaFragmentsOS[name]) > -1) {
            return name;
        }
    }
    return 'unknown';
}

function isWebpSupported() {
    var canvas = document.createElement('CANVAS');
    canvas.width = canvas.height = 1;
    if (canvas.toDataURL) {
        var url = canvas.toDataURL('image/webp');
        if (url.indexOf('image/webp') === 5) {
            return true;
        }
    }
    return false;
}

function toggleEventListener(emitter, type, func, enabled) {
    if (emitter) {
        if (enabled) {
            emitter.addEventListener(type, func);
        } else {
            emitter.removeEventListener(type, func);
        }
    }
}

class EnvironmentMonitorEvent extends GenericEvent{
}

export {
    EnvironmentMonitor as default,
    EnvironmentMonitor,
    EnvironmentMonitorEvent,
};
