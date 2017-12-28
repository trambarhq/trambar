var _ = require('lodash');
var Promise = require('bluebird');

module.exports = Route;

function Route(routeManager) {
    this.url = routeManager.getURL();
    this.path = _.replace(this.url, /[?#].*/, '');
    this.component = routeManager.getComponent();
    this.parameters = routeManager.getParameters();
    this.query = routeManager.getQuery();
    this.hash = routeManager.getHash();

    var callbacks = [];
    var self = this;

    /**
     * Change the route
     *
     * @param  {String} url
     * @param  {Boolean} replacing
     * @param  {String|undefined} displayURL
     *
     * @return {Promise}
     */
    this.change = function(url, replacing, displayURL) {
        if (typeof(url) !== 'string') {
            throw new Error('Invalid argument')
        }
        return self.ask(url, true).then((ok) => {
            if (ok) {
                return routeManager.change(url, replacing, displayURL);
            } else {
                return false;
            }
        });
    };

    /**
     * Find the URL of a page component
     *
     * @param  {ReactComponent} component
     * @param  {Object|undefined} parameters
     *
     * @return {String}
     */
    this.find = function(component, parameters) {
        return routeManager.find(component, parameters);
    };

    /**
     * Go to the page component, adding to history
     *
     * @param  {ReactComponent} component
     * @param  {Object|undefined} parameters
     *
     * @return {Promise}
     */
    this.push = function(component, parameters) {
        var url = routeManager.find(component, parameters);
        return this.change(url, false);
    };

    /**
     * Go to the page component, replacing current page in history
     *
     * @param  {ReactComponent} component
     * @param  {Object|undefined} parameters
     *
     * @return {Promise}
     */
    this.replace = function(component, parameters) {
        var url = routeManager.find(component, parameters);
        return this.change(url, true);
    };

    /**
     * Remove hash from current URL
     */
    this.loosen = function() {
        routeManager.loosen();
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

Route.prototype.toString = function() {
    return this.url;
};

Route.match = function(url, patterns, f) {
    for (var i = 0; i < patterns.length; i++) {
        var regExp = parseURLPattern(patterns[i]);
        var m = regExp.exec(url);
        if (m) {
            var params = {};
            _.each(regExp.names, (name, index) => {
                params[name.substr(1)] = m[index + 1];
            });
            if (f) {
                params = f(params);
                if (process.env.NODE_ENV !== 'production') {
                    if (typeof(params) !== 'object') {
                        throw new Error(`Callback for route "${patterns[i]}" does not return an object`);
                    }
                }
            }
            if (params) {
                params.match = m[0];
            }
            return params;
        }
    }
};

/**
 * Obtain a list of numeric ids from a string, using '+' as the delimiter
 *
 * @param  {String} s
 *
 * @return {Array<Number>|undefined}
 */
Route.parseIdList = function(s) {
    if (s == undefined) {
        return undefined;
    }
    if (s) {
        var tokens = _.split(s, '+');
        return _.map(tokens, _.strictParseInt);
    } else {
        return [];
    }
}

/**
 * Obtain an id from a string. If a regexp is provided, use that to search for
 * a matching substring
 *
 * @param  {String} s
 * @param  {RegExp|undefined} pattern
 *
 * @return {Number|undefined}
 */
Route.parseId = function(s, pattern) {
    if (s == undefined) {
        return undefined;
    }
    if (pattern instanceof RegExp) {
        var m = pattern.exec(s);
        if (!m) {
            return undefined;
        }
        s = m[1];
    }
    return _.strictParseInt(s);
}

/**
 * Return the given string if it's YYYY-MM-DD; otherwise return an empty string
 *
 * @param  {String} s
 *
 * @return {String|undefined}
 */
Route.parseDate = function(s) {
    if (s == undefined) {
        return undefined;
    }
    if (/\d{4}-\d{2}-\d{2}/.test(s)) {
        return s;
    }
    return '';
}

var regExpCache = {};

function parseURLPattern(pattern) {
    var regExp = regExpCache[pattern];
    if (!regExp) {
        var names = [];
        var regExpPattern = pattern.replace(/(:\w+)/g, (name) => {
            names.push(name);
            return '([^\\/]+)';
        });
        regExp = regExpCache[pattern] = new RegExp('^' + regExpPattern);
        regExp.names = names;
    }
    return regExp;
}
