import Moment from 'moment';
import { get, set } from '../utils/object-utils.js';

class Environment {
  constructor(envMonitor, extra) {
    this.envMonitor = envMonitor;
    this.focus = envMonitor.focus;
    this.visible = envMonitor.visible;
    this.online = envMonitor.online;
    this.paused = envMonitor.paused;
    this.connectionType = envMonitor.connectionType;
    this.screenWidth = envMonitor.screenWidth;
    this.screenHeight = envMonitor.screenHeight;
    this.viewportWidth = envMonitor.viewportWidth;
    this.viewportHeight = envMonitor.viewportHeight;
    this.orientation = envMonitor.orientation;
    this.devicePixelRatio = envMonitor.devicePixelRatio;
    this.webpSupport = envMonitor.webpSupport,
    this.platform = envMonitor.platform;
    this.browser = envMonitor.browser;
    this.os = envMonitor.os;
    this.pointingDevice = envMonitor.pointingDevice;
    this.date = envMonitor.date;
    this.startTime = Moment().toISOString();
    this.devices = envMonitor.devices;
    this.recorders = envMonitor.recorders;
    this.androidKeyboard = this.detectAndroidKeyboard();
    Object.assign(this, extra);
  }

  isWiderThan(dim) {
    let width;
    if (typeof(dim) === 'number') {
      width = dim;
    } else if (typeof(dim) === 'string') {
      if (this.widthDefinitions) {
        width = this.widthDefinitions[dim];
      }
    }
    return (this.viewportWidth >= width);
  }

  logError(err, info) {
    console.error(err);
    console.info(info.componentStack);
  }

  getRelativeDate(diff, unit) {
    const path = [ this.date, unit, diff ];
    let date = get(relativeDateCache, path);
    if (!date) {
      const m = Moment(this.date).add(diff, unit);
      date = m.toISOString();
      set(relativeDateCache, path, date);
    }
    return date;
  }

  detectAndroidKeyboard() {
    if (this.os !== 'android') {
      return false;
    }

    const heightWithoutKeyboard = androidViewportHeights[this.orientation];
    if (hasFocusedInput()) {
      // focus likely means keyboard is present--assume that it is, unless
      // the viewport height hasn't changed
      if (!(heightWithoutKeyboard <= this.viewportHeight)) {
        androidKeyboardActive = true;
      }
    } else {
      // no focus definitely means no keyboard
      androidKeyboardActive = false;
      androidViewportHeights[this.orientation] = this.viewportHeight;
    }
    return androidKeyboardActive;
  }
}

let androidKeyboardActive = false;
let androidViewportHeights = {};

function hasFocusedInput() {
  let element = document.activeElement;
  if (typeof(element.selectionStart) === 'number') {
    return true;
  }
  return false;
}

const relativeDateCache = {};

export {
  Environment as default,
  Environment,
};
