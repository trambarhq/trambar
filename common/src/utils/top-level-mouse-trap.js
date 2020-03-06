import _ from 'lodash';

export class TopLevelMouseTrap {
  static listeners = [];

  static addEventListener(type, handle) {
    this.listeners.push({ type, handle });
  }

  static removeEventListener(type, handle) {
    _.remove(this.listeners, { type, handle });
  }

  static dispatchEvent(evt) {
    for (let { type, handle } of this.listeners) {
      if (type === evt.type) {
        handle(evt);
      }
    }
  }

  static handleMouseDown = (evt) => {
    TopLevelMouseTrap.dispatchEvent(evt);
  }

  static handleMouseUp = (evt) => {
    TopLevelMouseTrap.dispatchEvent(evt);
  }
}
