import _ from 'lodash';

class Route {
    constructor(routeManager) {
        this.routeManager = routeManager;
        this.name = routeManager.name;
        this.params = routeManager.params;
        this.context = routeManager.context;
        this.url = routeManager.url;
        this.path = routeManager.path;
        this.query = routeManager.query;
        this.search = routeManager.search;
        this.hash = routeManager.hash;
        this.public = routeManager.route.public;
        this.callbacks = [];

        let module = routeManager.params.module;
        if (process.env.NODE_ENV !== 'production') {
            if (!module) {
                if (!route.name) {
                    throw new Error('No routing information');
                } else {
                    throw new Error('No component for route: ' + route.name);
                }
            } else if (!module.default) {
                throw new Error('Component not exported as default: ' + route.name);
            }
        }
        this.page = module.default;
        this.pageParams = _.pick(this.params, _.keys(routeManager.route.params), 'key');
    }

    async change(url, options) {
        return this.routeManager.change(url, options);
    }

    find(name, params, context) {
        return this.routeManager.find(name, params, context);
    }

    async push(name, params, context) {
        return this.routeManager.push(name, params, context);
    }

    async replace(name, params, context) {
        return this.routeManager.replace(name, params, context);
    }

    match(url) {
        return this.routeManager.match(url);
    }

    reanchor(params) {
        params = _.assign({}, this.params, params);
        return this.replace(this.name, params);
    }

    keep(callback) {
        this.callbacks.push(callback);
    }

    free(callback) {
        let index = this.callbacks.indexOf(callback);
        if (index !== -1) {
            this.callbacks.splice(index, 1);
        }
    }

    async confirm() {
        for (let callback of this.callbacks) {
            const proceed = await callback();
            if (proceed === false) {
                return false;
            }
        }
        return true;
    }

    async modify(params) {
        params = _.assign({}, this.params, params);
        return this.replace(this.name, params);
    }
};

export {
    Route as default,
    Route,
};
