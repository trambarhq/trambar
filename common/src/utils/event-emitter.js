class EventEmitter {
    constructor() {
        this.listeners = [];
    }

    addEventListener(type, func) {
        if (func) {
            this.listeners.push({ type, func });
        }
    },

    removeEventListener(type, func) {
        this.listeners = this.listeners.filter((listener) => {
            return !(listener.type === type || listener.func === func);
        });
    },

    triggerEvent(evt) {
        this.listeners.forEach((listener) => {
            if (listener.type === evt.type) {
                listener.func(evt);
            }
        });
    }
}

export {
    EventEmitter as default,
    EventEmitter,
};
