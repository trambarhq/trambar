var _ = require('lodash');
var Promise = require('bluebird');

module.exports = Route;

function Route(routeManager) {
    this.url = routeManager.getUrl();
    this.path = _.replace(this.url, /[?#].*/, '');
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
                return false;
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
            return Promise.reduce(callbacks, (allowed, callback) => {
                try {
                    if (!allowed) {
                        return false;
                    }
                    var confirmed = callback(url, true);
                    return Promise.resolve(confirmed);
                } catch (err) {
                    console.error(err);
                    return true;
                }
            }, true).then((allowed) => {
                return allowed;
            });
        } else {
            var allowed = _.reduce(callbacks, (allowed, callback) => {
                try {
                    if (!allowed) {
                        return false;
                    }
                    var confirmed = callback(false);
                    if (typeof(confirmed) !== 'boolean') {
                        throw new Error('Callback passed to keep() should return a boolean when interactive (2nd argument) is true');
                    }
                    return confirmed;
                } catch (err) {
                    console.error(err);
                    return true;
                }
            }, true);
            return allowed;
        }
    };

    this.keep = function(callback) {
        callbacks.push(callback);
    };

    this.free = function(callback) {
        _.pull(callbacks, callback);
    };
}

Route.match = function(route, url) {
    var names = [];
    var pattern = route.replace(/(:\w+)/g, (name) => {
        names.push(name);
        return '([^\\/]+)';
    });
    var regExp = new RegExp('^' + pattern);
    var m = regExp.exec(url);
    if (m) {
        var params = {};
        _.each(names, (name, index) => {
            params[name.substr(1)] = m[index + 1];
        });
        params.url = m[0];
        return params;
    }
};

Route.prototype.toString = function() {
    return this.url;
};
