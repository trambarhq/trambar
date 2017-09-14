var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');

module.exports = React.createClass({
    displayName: 'RouteManager',
    propTypes: {
        pages: PropTypes.array.isRequired,
        database: PropTypes.instanceOf(Database),
        baseUrls: PropTypes.arrayOf(PropTypes.string).isRequired,
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
            baseUrl: this.getBaseUrl(),
            url: null,
            component: null,
            parameters: null,
            query: null,
            hash: '',
        };
    },

    /**
     * Return the base URL by matching the current URL to a list of candidates
     *
     * @return {String}
     */
    getBaseUrl: function() {
        var path = window.location.pathname;
        var baseUrl = _.find(this.props.baseUrls, (url) => {
            if (/\/$/.test(url)) {
                throw new Error('Base URL should not end a slash');
            }
            if (path.substr(0, url.length) === url) {
                return true;
            }
        });
        if (baseUrl === undefined) {
            console.error(`Page is not hosted at one of the expected base URLs (${this.props.baseUrls})`)
        }
        return baseUrl;
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
        var baseUrl = this.state.baseUrl;
        if (baseUrl !== undefined) {
            var url = getLocationUrl(window.location);
            if (url.substr(0, baseUrl.length) === baseUrl && url.charAt(baseUrl.length) === '/') {
                url = url.substr(baseUrl.length);
                return this.change(url, replacing);
            }
        }
        return Promise.reject(new Error('Cannot route to location not at the base URL'));
    },

    /**
     * Find a route
     *
     * @param  {String} url
     *
     * @return {Object}
     */
    find: function(url) {
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
        var routes = [];
        _.each(this.props.pages, (page) => {
            if (typeof(page.parseUrl) !== 'function') {
                var pageName = _.get(page, 'displayName', 'Page')
                throw new Error(`${pageName} does not implement the static function parseUrl()`);
            }
            var params = page.parseUrl(path);
            if (params) {
                var canonicalUrl = page.getUrl(_.assign({}, params, query));
                if (hash) {
                    canonicalUrl += `#${hash}`;
                }
                route = {
                    url: canonicalUrl,
                    component: page,
                    parameters: params,
                    query: query,
                    hash: hash,
                };
                routes.push(route);
            }
        });
        // pick the one with longest match
        routes = _.sortBy(routes, 'route.parameters.match.length');
        var route = _.last(routes) || null;
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
        var route = this.find(url);
        if (route) {
            this.setState(route, () => {
                // set the browser location
                var fullUrl = this.state.baseUrl + route.url;
                if (replacing) {
                    history.replaceState({}, '', fullUrl);
                } else {
                    history.pushState({}, '', fullUrl);
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
        var route = this.find(url);
        if (route) {
            this.setState(route, () => {
                this.triggerChangeEvent();
            });
        }
    },
});

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
