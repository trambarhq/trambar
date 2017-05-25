var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

module.exports = React.createClass({
    displayName: 'RouteManager',
    propTypes: {
        pages: PropTypes.array.isRequired,
        baseUrls: PropTypes.arrayOf(PropTypes.string).isRequired,
        onChange: PropTypes.func,
        onMissing: PropTypes.func,
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
        var route = null;
        _.each(this.props.pages, (page) => {
            var params = page.parseUrl(url);
            if (params) {
                route = {
                    url: url,
                    component: page,
                    parameters: params,
                    query: query,
                };
                return false;
            }
        });
        return route;
    },

    change: function(url, replacing) {
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
            return this.triggerMissingEvent();
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

    triggerMissingEvent: function(url, replacing) {
        if (this.props.onMissing) {
            return this.props.onMissing({
                type: 'missing_route',
                target: this,
                url: url,
                replacing: replacing || false
            });
        } else {
            return Promise.reject(new Error('Unable to route URL to a page: ' + url))
        }
    },

    render: function() {
        return <div/>;
    },

    componentDidMount: function() {
        debugger;
        this.goTo(window.location, true).catch((err) => {
            console.error(err);
        });
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
