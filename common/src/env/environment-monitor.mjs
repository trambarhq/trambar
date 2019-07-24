import _ from 'lodash';
import EventEmitter, { GenericEvent } from 'relaks-event-emitter';

class EnvironmentMonitor extends EventEmitter {
    constructor(options) {
        super();
        let viewport = document.body.parentNode;
        this.focus = true;
        this.visible = true;
        this.paused = false;
        this.online = navigator.onLine;
        this.connectionType = getConnectionType();
        this.battery = {};
        this.screenWidth = screen.width;
        this.screenHeight = screen.height;
        this.viewportWidth = viewport.clientWidth;
        this.viewportHeight = viewport.clientHeight;
        this.orientation = getOrientation();
        this.devicePixelRatio = window.devicePixelRatio;
        this.webpSupport = isWebpSupported();
        this.browser = detectBrowser();
        this.os = detectOS();
        this.date = getDate(new Date);
        if (typeof(cordova) === 'object') {
            this.platform = 'cordova';
        } else {
            this.platform = 'browser';
        }
        if (this.os === 'android' || this.os === 'ios' || this.os === 'wp') {
            this.pointingDevice = 'touch';
        } else {
            this.pointingDevice = 'mouse';
        }
        this.devices = [];
        if (this.platform === 'cordova') {
            this.recorders = getCordovaRecordingSupport();
        } else {
            this.recorders = [];
        }
        this.dateCheckInterval = 0;
    }

    activate() {
        this.monitor(true);
        if (this.platform !== 'cordova') {
            this.handleDeviceChange();
        }
    }

    shutdown() {
        this.monitor(false);
    }

    async monitor(enabled) {
        // monitor whether app is active
        if (this.platform === 'cordova') {
            toggleEventListener(document, 'pause', this.handlePause, enabled);
            toggleEventListener(document, 'resume', this.handleResume, enabled);
        } else {
            toggleEventListener(window, 'blur', this.handleWindowBlur, enabled);
            toggleEventListener(window, 'focus', this.handleWindowFocus, enabled);
        }

        // monitor screen size/orientation change
        toggleEventListener(window, 'resize', this.handleWindowResize, enabled);
        toggleEventListener(window, 'orientationchange', this.handleWindowResize, enabled);
        toggleEventListener(window, 'visibilitychange', this.handleVisibilityChange, enabled);

        // monitor pointing device
        toggleEventListener(window, 'mousemove', this.handleMouseEvent, enabled);
        toggleEventListener(window, 'mousedown', this.handleMouseEvent, enabled);
        toggleEventListener(window, 'touchstart', this.handleTouchEvent, enabled);

        // monitor network connectivity
        toggleEventListener(window, 'online', this.handleOnline, enabled);
        toggleEventListener(window, 'offline', this.handleOffline, enabled);
        let network = getNetworkAPI();
        toggleEventListener(network, 'typechange', this.handleConnectionTypeChange, enabled);

        // monitor for device changes
        toggleEventListener(navigator.mediaDevices, 'devicechange', this.handleDeviceChange, enabled);

        // monitor battery
        let battery = await getBattery();
        if (battery) {
            toggleEventListener(battery, 'levelchange', this.handleBatteryChange, enabled);
            toggleEventListener(battery, 'chargingchange', this.handleBatteryChange, enabled);

            let { charging, level } = battery;
            this.battery = { charging, level };
        }

        this.scheduleDateCheck(enabled);
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
        this.focused = false;
        this.visible = false;
        this.paused = true;
        this.online = navigator.onLine;
        this.triggerEvent(new EnvironmentMonitorEvent('change', this));
    }

    /**
     * Called when Cordova application comes into foreground again
     *
     * @param  {Event} evt
     */
    handleResume = (evt) => {
        setTimeout(() => {
            this.focused = true;
            this.visible = true;
            this.paused = false;
            this.online = navigator.onLine;
            this.triggerEvent(new EnvironmentMonitorEvent('change', this));
        }, 250);
    }

    /**
     * Called when user switches to another window
     *
     * @param  {Event} evt
     */
    handleWindowBlur = (evt) => {
        this.focus = false;
        this.triggerEvent(new EnvironmentMonitorEvent('change', this));
    }

    /**
     * Called when user switches back to the  window
     *
     * @param  {Event} evt
     */
    handleWindowFocus = (evt) => {
        this.focus = true;
        this.triggerEvent(new EnvironmentMonitorEvent('change', this));
    }

    /**
     * Called when user switches to another tab or minimize the window
     *
     * @param  {Event} evt
     */
    handleVisibilityChange = (evt) => {
        this.visible = (document.visibilityState === 'visible');
        this.triggerEvent(new EnvironmentMonitorEvent('change', this));
    }

    /**
     * Called when window is resized or the screen orientation changes
     *
     * @param  {Event} evt
     */
    handleWindowResize = (evt) => {
        let viewport = document.body.parentNode;
        this.screenWidth = screen.width;
        this.screenHeight = screen.height;
        this.viewportWidth = viewport.clientWidth;
        this.viewportHeight = viewport.clientHeight;
        this.devicePixelRatio = window.devicePixelRatio;
        this.orientation = getOrientation();
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
            // only Chrome supports sourceCapabilities
            if (evt.sourceCapabilities && !evt.sourceCapabilities.firesTouchEvents) {
                this.pointingDevice = 'mouse';
                this.triggerEvent(new EnvironmentMonitorEvent('change', this));
            }
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

    handleDeviceChange = async (evt) => {
        let { mediaDevices } = navigator;
        if (mediaDevices) {
            let devices = await mediaDevices.enumerateDevices();
            this.devices = devices;
            this.recorders = getRecordingSupport(devices);
            this.triggerEvent(new EnvironmentMonitorEvent('change', this));
        }
    }
}

function getConnectionType() {
    let connection = getNetworkAPI();
    if (connection) {
        if (connection.type) {
            return connection.type;
        } else if (connection.effectiveType) {
            return connection.effectiveType;
        }
    }
    return 'unknown';
}

function getNetworkAPI() {
    return navigator.connection || navigator.mozConnection || navigator.webkitConnection;
}

async function getBattery() {
    if (navigator.getBattery) {
        return navigator.getBattery()
    }
}

function getOrientation() {
    return _.get(screen, 'orientation.type', 'unknown');
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

function getRecordingSupport(devices) {
    let recorders = [];
    if (_.some(devices, { kind: 'videoinput' })) {
        if (canSavePhoto()) {
            recorders.push('image');
        }
        if (canSaveVideo()) {
            recorders.push('video');
        }
    }
    if (_.some(devices, { kind: 'audioinput' })) {
        if (canSaveAudio()) {
            recorders.push('audio');
        }
    }
    return recorders;
}

function getCordovaRecordingSupport() {
    let recorders = [];
    if (navigator.camera) {
        recorders.push('image');
    }
    if (navigator.device && navigator.device.capture) {
        // the plugin doesn't provide a UI for audio recording on windows
        if (cordova.platformId !== 'windows') {
            recorders.push('audio');
        }
        recorders.push('video');
    }
    return recorders;
}

function canSavePhoto() {
    let { mediaDevices } = navigator;
    if (mediaDevices && mediaDevices.getUserMedia) {
        let { toBlob, toDateURL } = HTMLCanvasElement.prototype;
        if (typeof(toBlob) === 'function') {
            return true;
        } else if (typeof(toDataURL) === 'function') {
            return true;
        }
    }
    return false;
}

function canSaveAudio() {
    let { mediaDevices } = navigator;
    if (mediaDevices && mediaDevices.getUserMedia) {
        if (typeof(MediaRecorder) === 'function') {
            if (typeof(AudioContext) === 'function') {
                return true;
            }
        }
    }
    return false;
}

function canSaveVideo() {
    let { mediaDevices } = navigator;
    if (mediaDevices && mediaDevices.getUserMedia) {
        if (typeof(MediaRecorder) === 'function') {
            return true;
        }
    }
    return false;
}

function getDate(date) {
    let year = date.getFullYear() + '';
    let month = (date.getMonth() + 1) + '';
    let day = date.getDate() + '';
    if (month.length < 2) {
        month = '0' + month;
    }
    if (day.length < 2) {
        day = '0' + day;
    }
    return `${year}-${month}-${day}`;
}

function toggleEventListener(emitter, type, func, enabled) {
    if (emitter) {
        let f;
        if (enabled) {
            f = emitter.addEventListener;
        } else {
            f = emitter.removeEventListener;
        }
        if (f) {
            f.call(emitter, type, func);
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
