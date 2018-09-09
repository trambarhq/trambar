import Promise from 'bluebird';

class EventEmitter {
    constructor() {
        this.listeners = [];
    }

    addEventListener(type, func) {
        if (func) {
            this.listeners.push({ type, func });
        }
    }

    removeEventListener(type, func) {
        this.listeners = this.listeners.filter((listener) => {
            return !(listener.type === type || listener.func === func);
        });
    }

    clearEventListeners() {
        this.listeners.splice(0);
    }

    triggerEvent(evt) {
        this.listeners.forEach((listener) => {
            if (listener.type === evt.type) {
                listener.func(evt);
            }
        });
    }
}

class GenericEvent {
    constructor(type, target, props) {
        for (let name in props) {
            if (name !== 'type' || name !== 'target') {
                this[name] = props[name];
            }
        }
        this.type = type;
        this.target = target;
        this.defaultPrevented = false;
        this.decisionPromise = null;
    }

    preventDefault() {
        this.defaultPrevented = true;
    }

    postponeDefault(promise) {
        if (process.env.NODE_ENV !== 'production') {
            if (!promise || !(promise.then instanceof Function)) {
                console.warn('Non-promise passed to postponeDefault()');
            }
        }
        this.decisionPromise = promise;
    }

    waitForDecision() {
        if (!this.decisionPromise) {
            return Promise.resolve();
        }
        return this.decisionPromise.then((decision) => {
            if (decision === false) {
                this.defaultPrevented = true;
            }
        });
    }
}

export {
    EventEmitter as default,
    EventEmitter,
    GenericEvent,
};
