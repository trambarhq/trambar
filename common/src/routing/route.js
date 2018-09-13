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
    }

    change(url, options) {
        return this.routeManager.change(url, options);
    }

    find(name, params) {
        return this.routeManager.find(name, params);
    }

    push(name, params) {
        return this.routeManager.push(name, params);
    }

    replace(name, params) {
        return this.routeManager.replace(name, params);
    }

    reanchor(has) {

    }

    keep(callback) {
        this.callbacks.push(callback);
    }

    free(callback) {
        var index = this.callbacks.indexOf(callback);
        if (index !== -1) {
            this.callbacks.splice(index, 1);
        }
    }
};

export {
    Route as default,
    Route,
};
