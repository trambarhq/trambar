var _ = require('lodash');
var Promise = require('bluebird');

module.exports = Route;

function Route(routeManager) {
    this.callbacks = [];
    this.url = routeManager.getUrl();
    this.component = routeManager.getComponent();
    this.parameters = routeManager.getParameters();
    this.query = routeManager.getQuery();

    Object.defineProperty(this, 'routeManager', {
        value: routeManager
    });
}


Route.match = function(route, url) {
    var names = [];
    var pattern = route.replace(/(:\w+)/g, (name) => {
        names.push(name);
        return '([^\\/]*)';
    });
    var regExp = new RegExp(pattern);
    var m = regExp.exec(url);
    if (m) {
        var params = {};
        _.each(names, (name, index) => {
            params[name.substr(1)] = m[index + 1];
        });
        return params;
    }
};

/**
 * Change the route
 *
 * @param  {String} url
 *
 * @return {Promise}
 */
Route.prototype.change = function(url, replacing) {
    return this.ask(url, true).then((ok) => {
        if (ok) {
            return this.routeManager.change(url, replacing);
        } else {
            throw new Error('');
        }
    });
};

/**
 * Check if the route can be changed
 *
 * @param  {Boolean} interactive
 *
 * @return {Promise<Boolean>|Boolean}
 */
Route.prototype.ask = function(url, interactive) {
    if (interactive) {
        return Promise.reduce(this.callbacks, (aborted, callback) => {
            if (aborted) {
                return true;
            }
            var blocking = callback(url, true);
            return Promise.resolve(blocking);
        }, false).then((blocking) => {
            return !blocking;
        });
    } else {
        var blocking = _.reduce(this.callbacks, (aborted, callback) => {
            if (aborted) {
                return true;
            }
            var blocking = callback(false);
            if (typeof(blocking) !== 'boolean' || typeof(blocking) !== 'undefined') {
                throw new Error('Callback passed to keep() should return a boolean when interactive (2nd argument) is true');
            }
            return blocking;
        }, false);
        return !blocking;
    }
};

Route.prototype.keep = function(callback) {
    this.callbacks.push(callback);
};

Route.prototype.free = function(callback) {
    var index = this.callbacks.indexOf(callback);
    if (index !== -1) {
        this.callbacks.splice(index, 1);
    }
};

Route.prototype.toString = Route.prototype.get;
