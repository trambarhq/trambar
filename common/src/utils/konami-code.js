import _ from 'lodash';

const correctSequence = [ 38, 38, 40, 40, 37, 39, 37, 39, 66, 65 ];

export class KonamiCode {
  static listeners = [];
  static currentSequence = [];

  static addListener(listener) {
    this.listeners.push(listener);
    if (this.listeners.length === 1) {
      window.addEventListener('keydown', handleKeydown);
    }
  }

  static removeListener(listener) {
    _.pull(this.listeners, listener);
    if (this.listeners.length === 0) {
      window.removeEventListener('keydown', handleKeydown);
    }
  }

  static handleKeydown(evt) {
    currentSequence.push(evt.keyCode);
    if (currentSequence.length > correctSequence.length) {
      currentSequence.splice(0, currentSequence.length - correctSequence.length);
    }
    if (_.isEqual(currentSequence, correctSequence)) {
      for (let f of KonamiCode.listeners) {
        f({
          type: 'cheat',
          target: KonamiCode,
        });
      }
    }
  }
}
