import Locale from 'locale/locale';

class Environment {
    constructor(envMonitor, localeManager) {
        this.envMonitor = envMonitor;

        this.locale = new Locale(localeManager);
    }
}

export {
    Environment as default,
    Environment,
};
