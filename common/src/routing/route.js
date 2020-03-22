export class Route {
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
    this.history = routeManager.history;
    this.callbacks = [];

    const module = routeManager.params.module;
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
    this.pageParams = {};
    for (let key of Object.keys(routeManager.route.params)) {
      this.pageParams[key] = this.params[key];
    }
    this.pageParams.key = this.params.key;
  }

  async change(url, options) {
    return this.routeManager.change(url, options);
  }

  find(name, params, context) {
    return this.routeManager.find(name, params, context);
  }

  async push(name, params, context) {
    if (name instanceof Object) {
      // overload method to permit adding params to the current page
      return this.push(this.name, { ...this.params, ...name });
    }
    return this.routeManager.push(name, params, context);
  }

  async replace(name, params, context) {
    if (name instanceof Object) {
      return this.replace(this.name, { ...this.params, ...name });
    }
    return this.routeManager.replace(name, params, context);
  }

  match(url) {
    return this.routeManager.match(url);
  }

  keep(callback) {
    this.callbacks.push(callback);
  }

  free(callback) {
    const index = this.callbacks.indexOf(callback);
    if (index !== -1) {
      this.callbacks.splice(index, 1);
    }
  }

  async confirm() {
    try {
      for (let callback of this.callbacks) {
        const proceed = await callback();
        if (proceed === false) {
          return false;
        }
      }
      return true;
    } catch (err) {
      return false;
    }
  }
};
