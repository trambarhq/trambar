import _ from 'lodash';

class TopLevelMouseTrap {
    constructor() {
        this.listeners = [];
    }

    addEventListener(type, handle) {
        this.listeners.push({ type, handle });
    }

    removeEventListener(type, handle) {
        _.remove(this.listeners, { type, handle });
    }

    dispatchEvent(evt) {
        for (let { type, handle } of this.listeners) {
            if (type === evt.type) {
                handle(evt);
            }
        }
    }

    handleMouseDown = (evt) => {
        this.dispatchEvent(evt);
    }

    handleMouseUp = (evt) => {
        this.dispatchEvent(evt);
    }
}

const instance = new TopLevelMouseTrap;

export {
    instance as default,
    instance as TopLevelMouseTrap,
};
