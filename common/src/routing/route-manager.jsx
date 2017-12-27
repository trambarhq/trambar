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
        if (process.env.PLATFORM === 'browser') {
            var base = document.getElementsByTagName('BASE')[0];
            if (base) {
                var url = base.getAttribute('href');
                return _.replace(url, /\/+$/, '');
            }
        }
        return '';
    },

    /**
     * Return the current URL
     *
     * @return {String}
     */
    getURL: function() {
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
        var url = getLocationURL(location);
        return this.change(url, replacing);
    },

    /**
     * Get URL to a page
     *
     */
    find: function(page, params) {
        params = _.clone(params) || {};
        var urlParts = page.getURL(params);
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
        var urlParts = parseURL(url);
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
        try {
            _.each(this.props.pages, (page) => {
                if (typeof(page.parseURL) !== 'function') {
                    var pageName = _.get(page, 'displayName', 'Page')
                    throw new Error(`${pageName} does not implement the static function parseURL()`);
                }
                var params = page.parseURL(urlParts.path, urlParts.query, urlParts.hash);
                if (params) {
                    // use the one with the longest match
                    if (params.match.length > matchLength) {
                        var routeParams = _.assign(_.omit(params, 'match'), rewriteParams);
                        var canonicalURL = this.find(page, routeParams);
                        route = {
                            url: canonicalURL,
                            component: page,
                            parameters: routeParams,
                            query: urlParts.query,
                            hash: urlParts.hash,
                        };
                        matchLength = params.match.length;
                    }
                }
            });
        } catch (err) {
            console.error(err);
            return null;
        }
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
            return Promise.resolve(false);
        }
        var route = this.parse(url);
        if (route) {
            this.setState(route, () => {
                if (process.env.PLATFORM === 'browser') {
                    // set the browser location
                    var protocol = window.location.protocol;
                    var host = window.location.host;
                    var fullURL = `${protocol}//${host}${route.url}`;
                    if (window.location.href !== fullURL) {
                        if (replacing) {
                            window.history.replaceState({}, '', fullURL);
                        } else {
                            window.history.pushState({}, '', fullURL);
                        }
                    }
                }
                this.triggerChangeEvent();
            });
            return Promise.resolve(true);
        } else {
            if (!noRedirecting) {
                return this.triggerRedirectionRequest(url).then((newURL) => {
                    return this.change(newURL, replacing, true);
                });
            } else {
                return Promise.reject(new Error('Unable to find page'));
            }
        }
    },

    /**
     * Remove hash from current URL
     */
    loosen: function() {
        if (process.env.PLATFORM === 'browser') {
            var fullURL = window.location.href;
            var hashIndex = fullURL.indexOf('#');
            if (hashIndex !== -1) {
                var newURL = fullURL.substr(0, hashIndex);
                window.history.replaceState({}, '', newURL);
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
        this.componentDidUpdate({}, {});
        if (process.env.PLATFORM === 'browser') {
            window.addEventListener('popstate', this.handlePopState);
        }
    },

    /**
     * Set the initial route once database is available
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate: function(prevProps, prevState) {
        if (!prevProps.database && this.props.database) {
            if (process.env.PLATFORM === 'browser') {
                this.goTo(window.location, true).catch((err) => {
                    console.error(err);
                });
            } else if (process.env.PLATFORM === 'cordova') {
                var url = '/http/localhost/test/news/'
                this.change(url, true).catch((err) => {
                    console.error(err);
                });
            }
        }
    },

    /**
     * Remove handlers on unmount
     */
    componentWillUnmount: function() {
        if (process.env.PLATFORM === 'browser') {
            window.removeEventListener('popstate', this.handlePopState);
        }
    },

    /**
     * Called when the browser history changes
     *
     * @param  {Event} evt
     */
    handlePopState: function(evt) {
        if (process.env.PLATFORM === 'browser') {
            var url = getLocationURL(window.location);
            var route = this.parse(url);
            if (route) {
                this.setState(route, () => {
                    this.triggerChangeEvent();
                });
            }
        }
    },
});

function parseURL(url) {
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

function getLocationURL(location) {
    return location.pathname + location.search + location.hash;
}
