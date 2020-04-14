const correctSequence = [ 38, 38, 40, 40, 37, 39, 37, 39, 66, 65 ];

export class KonamiCode {
  static listeners = [];
  static currentSequence = [];

  static addListener(listener) {
    this.listeners.push(listener);
    if (this.listeners.length === 1) {
      window.addEventListener('keydown', this.handleKeydown);
    }
  }

  static removeListener(listener) {
    const index = this.listeners.indexOf(listener);
    this.listeners.splice(index, 1);
    if (this.listeners.length === 0) {
      window.removeEventListener('keydown', this.handleKeydown);
    }
  }

  static handleKeydown = (evt) => {
    this.currentSequence.push(evt.keyCode);
    if (this.currentSequence.length > correctSequence.length) {
      this.currentSequence.splice(0, this.currentSequence.length - correctSequence.length);
    }
    if (this.currentSequence.join() === correctSequence.join()) {
      for (let f of this.listeners) {
        f();
      }
    }
  }
}
