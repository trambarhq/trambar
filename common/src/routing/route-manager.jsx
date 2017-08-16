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

    getInitialState: function() {
        return {
            baseUrl: this.getBaseUrl(),
            url: null,
            component: null,
            parameters: null,
            query: null
        };
    },

    getBaseUrl: function() {
        var path = location.pathname;
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

    getUrl: function() {
        return this.state.url;
    },

    getComponent: function() {
        return this.state.component;
    },

    getParameters: function() {
        return this.state.parameters;
    },

    getQuery: function() {
        return this.state.query;
    },

    goTo: function(location, replacing) {
        var baseUrl = this.state.baseUrl;
        if (baseUrl !== undefined) {
            var url = location.pathname;
            if (url.substr(0, baseUrl.length) === baseUrl && url.charAt(baseUrl.length) === '/') {
                url = url.substr(baseUrl.length);
                return this.change(url, replacing);
            }
        }
        return Promise.reject(new Error('Cannot route to location not at the base URL'));
    },

    goBack: function() {

    },

    find: function(url) {
        var path = url;
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
            var params = page.parseUrl(url);
            if (params) {
                route = {
                    url: url,
                    component: page,
                    parameters: params,
                    query: query,
                };
                routes.push(route);
            }
        });
        // pick the one with the most parameters
        routes = _.sortBy(routes, (route) => {
            return _.size(route.parameters);
        });
        var route = _.last(routes) || null;
        return route;
    },

    change: function(url, replacing, noRedirecting) {
        if (this.state.url === url) {
            return Promise.resolve();
        }
        var route = this.find(url);
        if (route) {
            this.setState(route, () => {
                // set the browser location
                var fullUrl = this.state.baseUrl + url;
                if (replacing) {
                    history.replaceState({}, '', fullUrl);
                } else {
                    history.pushState({}, '', fullUrl);
                }
                this.triggerChangeEvent();
            });
            return Promise.resolve();
        } else {
            if (!noRedirecting) {
                return this.triggerRedirectionRequest(url).then((newUrl) => {
                    return this.change(newUrl, replacing, true);
                });
            } else {
                throw new Error('Unable to find page');
            }
        }
    },

    triggerChangeEvent: function() {
        if (this.props.onChange) {
            this.props.onChange({
                type: 'change',
                target: this,
            });
        }
    },

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

    render: function() {
        return <div/>;
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
});

function parseQueryString(q) {
    var values = {};
    var pairs = _.split(queryString, '&');
    _.each(pairs, (pair) => {
        var parts = _.split(pair, '=');
        var name = decodeURIComponent(parts[0]);
        var value = decodeURIComponent(parts[1] || '');
        values[name] = value;
    });
    return values;
}
