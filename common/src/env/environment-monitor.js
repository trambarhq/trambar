import _ from 'lodash';
import Promise from 'bluebird';
import EventEmitter, { GenericEvent } from 'relaks-event-emitter';

class EnvironmentMonitor extends EventEmitter {
    constructor(options) {
        super();
        let viewport = document.body.parentNode;
        this.visible = true;
        this.online = isOnline();
        this.connectionType = getConnectionType();
        this.battery = {};
        this.screenWidth = screen.width;
        this.screenHeight = screen.height;
        this.viewportWidth = viewport.offsetWidth;
        this.viewportHeight = viewport.offsetHeight;
        this.devicePixelRatio = window.devicePixelRatio;
        this.webpSupport = isWebpSupported(),
        this.browser = detectBrowser();
        this.os = detectOS();
        this.date = getDate(new Date);
        if (this.os === 'android' || this.os === 'ios' || this.os === 'wp') {
            this.pointingDevice = 'touch';
        } else {
            this.pointingDevice = 'mouse';
        }
        this.dateCheckInterval = 0;
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

        let network = getNetworkAPI();
        toggleEventListener(network, 'typechange', this.handleConnectionTypeChange, enabled);

        getBattery().then((battery) => {
            if (battery) {
                toggleEventListener(battery, 'levelchange', this.handleBatteryChange, enabled);
                toggleEventListener(battery, 'chargingchange', this.handleBatteryChange, enabled);

                let { charging, level } = battery;
                this.battery = { charging, level };
            }
        });

        this.scheduleDateCheck(enabled);

        if (process.env.PLATFORM === 'cordova') {
            toggleEventListener(document, 'pause', this.handlePause, enabled);
            toggleEventListener(document, 'resume', this.handleResume, enabled);
        }
    }

    scheduleDateCheck(enabled) {
        if (this.dateCheckInterval) {
            clearInterval(this.dateCheckInterval);
            this.dateCheckInterval = 0;
        }
        let now = new Date;
        // let the handler at the beginning of a minute
        let millisec = now.getSeconds() * 1000 + now.getMilliseconds();
        setTimeout(() => {
            this.dateCheckInterval = setInterval(this.handleDateChange, 60 * 1000);
        }, 60 * 1000 - millisec + 50);
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
        let viewport = document.body.parentNode;
        this.screenWidth = screen.width;
        this.screenHeight = screen.height;
        this.viewportWidth = viewport.offsetWidth;
        this.viewportHeight = viewport.offsetHeight;
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

    handleDateChange = () => {
        let now = new Date;
        let date = getDate(now);
        if (date !== this.date) {
            this.date = date;
            this.triggerEvent(new EnvironmentMonitorEvent('change', this));
        }
        let sec = now.getSeconds();
        if (sec >= 5) {
            // interval has drifted--reschedule it
            this.scheduleDateCheck();
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
        let connection = getNetworkAPI();
        return (connection.type !== 'none');
    } else {
        return navigator.onLine;
    }
}

function getConnectionType() {
    let connection = getNetworkAPI();
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

let uaFragmentsBrowser = {
    firefox: 'Firefox',
    opera: 'Opera',
    ie: 'Trident',
    edge: 'Edge',
    chrome: 'Chrome',
    safari: 'Safari',
};

function detectBrowser() {
    let ua = navigator.userAgent;
    for (let name in uaFragmentsBrowser) {
        if (ua.indexOf(uaFragmentsBrowser[name]) > -1) {
            return name;
        }
    }
    return 'unknown';
}

let uaFragmentsOS = {
    wp: 'Windows Phone',
    windows: 'Windows',
    ios: 'iPhone OS',
    osx: 'OS X',
    android: 'Android',
    linux: 'Linux',
};

function detectOS() {
    let ua = navigator.userAgent;
    for (let name in uaFragmentsOS) {
        if (ua.indexOf(uaFragmentsOS[name]) > -1) {
            return name;
        }
    }
    return 'unknown';
}

function isWebpSupported() {
    let canvas = document.createElement('CANVAS');
    canvas.width = canvas.height = 1;
    if (canvas.toDataURL) {
        let url = canvas.toDataURL('image/webp');
        if (url.indexOf('image/webp') === 5) {
            return true;
        }
    }
    return false;
}

function getDate(date) {
    let s = date.toISOString();
    return s.substr(0, 10);
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
