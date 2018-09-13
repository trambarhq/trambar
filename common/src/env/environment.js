class Environment {
    constructor(envMonitor, locale) {
        this.envMonitor = envMonitor;
        this.locale = locale;
    }

    isBelowMode() {
        return false;
    }

    isAboveMode() {
        return true;
    }
}

export {
    Environment as default,
    Environment,
};
