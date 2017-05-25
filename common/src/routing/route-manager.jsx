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
            var info = page.parseURL(url);
            if (info) {
                route = {
                    url: url,
                    component: page,
                    parameters: info.parameters,
                    query: query,
                };
                return false;
            }
        });
        return route;
    },

    change: function(url, replacing) {
        if (this.state.url === url) {
            return Promise.resolve(true);
        }
        var route = this.find(url);
        if (route) {
            this.setState(route, () => {
                this.triggerChangeEvent();
            });
            return Promise.resolve(true);
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
        return null;
    },

    componentDidMount: function() {

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
