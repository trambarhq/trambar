var _ = require('lodash');
var Promise = require('bluebird');

module.exports = Route;

function Route(routeManager) {
    this.url = routeManager.getUrl();
    this.component = routeManager.getComponent();
    this.parameters = routeManager.getParameters();
    this.query = routeManager.getQuery();

    var callbacks = [];
    var self = this;

    /**
     * Change the route
     *
     * @param  {String} url
     *
     * @return {Promise}
     */
    this.change = function(url, replacing) {
        if (typeof(url) !== 'string') {
            throw new Error('Invalid argument')
        }
        return self.ask(url, true).then((ok) => {
            if (ok) {
                return routeManager.change(url, replacing);
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
    this.ask = function(url, interactive) {
        if (interactive) {
            return Promise.reduce(callbacks, (aborted, callback) => {
                if (aborted) {
                    return true;
                }
                var blocking = callback(url, true);
                return Promise.resolve(blocking);
            }, false).then((blocking) => {
                return !blocking;
            });
        } else {
            var blocking = _.reduce(callbacks, (aborted, callback) => {
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

    this.keep = function(callback) {
        callbacks.push(callback);
    };

    this.free = function(callback) {
        var index = callbacks.indexOf(callback);
        if (index !== -1) {
            callbacks.splice(index, 1);
        }
    };
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

Route.prototype.toString = function() {
    return this.url;
};
