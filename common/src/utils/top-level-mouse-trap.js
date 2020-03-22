export class TopLevelMouseTrap {
  static listeners = [];

  static addEventListener(type, handle) {
    this.listeners.push({ type, handle });
  }

  static removeEventListener(type, handle) {
    const index = this.listeners.findIndex((listener) => {
      return (listener.type === type && listener.handle === handle);
    });
    this.listeners.splice(index, 1);
  }

  static dispatchEvent(evt) {
    for (let { type, handle } of this.listeners) {
      if (type === evt.type) {
        handle(evt);
      }
    }
  }

  static handleMouseDown = (evt) => {
    this.dispatchEvent(evt);
  }

  static handleMouseUp = (evt) => {
    this.dispatchEvent(evt);
  }
}
