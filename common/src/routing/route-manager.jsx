var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');

module.exports = React.createClass({
    displayName: 'RouteManager',
    propTypes: {
        pages: PropTypes.array.isRequired,
        database: PropTypes.instanceOf(Database),
        rewrite: PropTypes.func,
        onChange: PropTypes.func,
        onRedirectionRequest: PropTypes.func,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            basePath: this.getBasePath(),
            url: null,
            component: null,
            parameters: null,
            query: null,
            hash: '',
        };
    },

    /**
     * Return the base URL as indicated in a base element in the HTML file
     *
     * @return {String}
     */
    getBasePath: function() {
        var base = document.getElementsByTagName('BASE')[0];
        if (base) {
            var url = base.getAttribute('href');
            return _.replace(url, /\/+$/, '');
        }
        return '';
    },

    /**
     * Return the current URL
     *
     * @return {String}
     */
    getUrl: function() {
        return this.state.url;
    },

    /**
     * Return the current component class
     *
     * @return {ReactClass}
     */
    getComponent: function() {
        return this.state.component;
    },

    /**
     * Return parameters extract from the current URL
     *
     * @return {Object}
     */
    getParameters: function() {
        return this.state.parameters;
    },

    /**
     * Return query variable extract from the current URL
     *
     * @return {Object}
     */
    getQuery: function() {
        return this.state.query;
    },

    /**
     * Return the current hash
     *
     * @return {String}
     */
    getHash: function() {
        return this.state.hash;
    },

    /**
     * Set route to URL pointed to by a hyperlink or the location object
     *
     * @param  {Location|HTMLAnchorElement} location
     * @param  {Boolean} replacing
     *
     * @return {Promise}
     */
    goTo: function(location, replacing) {
        var url = getLocationUrl(location);
        return this.change(url, replacing);
    },

    /**
     * Get URL to a page
     *
     */
    find: function(page, params) {
        params = _.clone(params) || {};
        var urlParts = page.getUrl(params);
        var basePath = this.state.basePath;
        if (basePath) {
            urlParts.path = basePath + urlParts.path;
        }
        if (this.props.rewrite) {
            this.props.rewrite(urlParts, params, 'find');
        }
        var url = urlParts.path;
        if (!_.isEmpty(urlParts.query)) {
            var qs = '';
            _.forIn(urlParts.query, (value, name) => {
                qs += (qs) ? '&' : '?';
                qs += name + '=' + encodeURIComponent(value).replace(/%20/g, '+');
            });
            url += qs;
        }
        if (urlParts.hash) {
            url += '#' + urlParts.hash;
        }
        return url;
    },

    /**
     * Look up a URL
     *
     * @param  {String} url
     *
     * @return {Object|null}
     */
    parse: function(url) {
        var urlParts = parseUrl(url);
        var rewriteParams = {};
        if (this.props.rewrite) {
            this.props.rewrite(urlParts, rewriteParams, 'parse');
        }
        var basePath = this.state.basePath;
        if (basePath) {
            if (_.startsWith(urlParts.path, basePath)) {
                urlParts.path = urlParts.path.substr(basePath.length);
            } else {
                return null;
            }
        }
        var route;
        var matchLength = 0;
        _.each(this.props.pages, (page) => {
            if (typeof(page.parseUrl) !== 'function') {
                var pageName = _.get(page, 'displayName', 'Page')
                throw new Error(`${pageName} does not implement the static function parseUrl()`);
            }
            var params = page.parseUrl(urlParts.path, urlParts.query, urlParts.hash);
            if (params) {
                // use the one with the longest match
                if (params.match.length > matchLength) {
                    var routeParams = _.assign(_.omit(params, 'match'), rewriteParams);
                    var canonicalUrl = this.find(page, routeParams);
                    route = {
                        url: canonicalUrl,
                        component: page,
                        parameters: routeParams,
                        query: urlParts.query,
                        hash: urlParts.hash,
                    };
                    matchLength = params.match.length;
                }
            }
        });
        return route;
    },

    /**
     * Change route
     *
     * @param  {String} url
     * @param  {Boolean} replacing
     * @param  {Boolean} noRedirecting
     *
     * @return {Promise<Boolean>}
     */
    change: function(url, replacing, noRedirecting) {
        if (this.state.url === url) {
            return Promise.resolve();
        }
        var route = this.parse(url);
        if (route) {
            this.setState(route, () => {
                // set the browser location
                var protocol = window.location.protocol;
                var host = window.location.host;
                var fullUrl = `${protocol}//${host}${route.url}`;
                if (window.location.href !== fullUrl) {
                    if (replacing) {
                        history.replaceState({}, '', fullUrl);
                    } else {
                        history.pushState({}, '', fullUrl);
                    }
                }
                this.triggerChangeEvent();
            });
            return Promise.resolve(true);
        } else {
            if (!noRedirecting) {
                return this.triggerRedirectionRequest(url).then((newUrl) => {
                    return this.change(newUrl, replacing, true);
                });
            } else {
                return Promise.reject(new Error('Unable to find page'));
            }
        }
    },

    /**
     * Fire off a change event
     */
    triggerChangeEvent: function() {
        if (this.props.onChange) {
            this.props.onChange({
                type: 'change',
                target: this,
            });
        }
    },

    /**
     * Ask parent component for a URL to redirect to when URL does not match
     * any route
     *
     * @param  {String} url
     *
     * @return {Promise<String>}
     */
    triggerRedirectionRequest: function(url) {
        if (this.props.onRedirectionRequest) {
            var basePath = this.state.basePath;
            if (basePath && _.startsWith(url, basePath)) {
                url = url.substr(basePath.length);
                if (!_.startsWith(url, '/')) {
                    url = '/' + url;
                }
            }
            return this.props.onRedirectionRequest({
                type: 'route_request',
                target: this,
                url: url,
            });
        } else {
            return Promise.reject(new Error('Unable to route URL to a page: ' + url))
        }
    },

    /**
     * Render component
     *
     * @return {null}
     */
    render: function() {
        return null;
    },

    /**
     * Set the initial route if database is available
     */
    componentDidMount: function() {
        if (this.props.database) {
            this.goTo(window.location, true).catch((err) => {
                console.error(err);
            });
        }
        window.addEventListener('popstate', this.handlePopState);
    },

    /**
     * Set the initial route once database is available
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate: function(prevProps, prevState) {
        if (!prevProps.database && this.props.database) {
            this.goTo(window.location, true).catch((err) => {
                console.error(err);
            });
        }
    },

    /**
     * Remove handlers on unmount
     */
    componentWillUnmount: function() {
        window.removeEventListener('popstate', this.handlePopState);
    },

    /**
     * Called when the browser history changes
     *
     * @param  {Event} evt
     */
    handlePopState: function(evt) {
        var url = getLocationUrl(window.location);
        var route = this.parse(url);
        if (route) {
            this.setState(route, () => {
                this.triggerChangeEvent();
            });
        }
    },
});

function parseUrl(url) {
    var path = url;
    var hash = '';
    var hashIndex = path.indexOf('#');
    if (hashIndex !== -1) {
        hash = path.substr(hashIndex + 1);
        path = path.substr(0, hashIndex);
    }
    var query = {};
    var queryIndex = path.indexOf('?');
    if (queryIndex !== -1) {
        query = parseQueryString(path.substr(queryIndex + 1));
        path = path.substr(0, queryIndex);
    }
    return { path, query, hash };
}

function parseQueryString(queryString) {
    var values = {};
    var pairs = _.split(queryString, '&');
    _.each(pairs, (pair) => {
        var parts = _.split(pair, '=');
        var name = decodeURIComponent(parts[0]);
        var value = decodeURIComponent(parts[1] || '');
        value = _.replace(value, /\+/g, ' ');
        values[name] = value;
    });
    return values;
}

function getLocationUrl(location) {
    return location.pathname + location.search + location.hash;
}
