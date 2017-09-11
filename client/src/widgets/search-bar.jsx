var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Route = require('routing/route');
var Locale = require('locale/locale');

// mixins
var UpdateCheck = require('mixins/update-check');

require('./search-bar.scss');

module.exports = React.createClass({
    displayName: 'SearchBar',
    propTypes: {
        route: PropTypes.instanceOf(Route),
        locale: PropTypes.instanceOf(Locale),
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        var route = this.props.route;
        return {
            keywords: route.query.search || '',
        };
    },

    /**
     * Update keywords if necessary
     *
     * @param  {Object} nextProps
     *
     * @return {[type]}
     */
    componentWillReceiveProps: function(nextProps) {
        if (this.props.route !== nextProps.route) {
            var route = nextProps.route;
            var keywordsBefore = this.state.keyboards;
            var keywordsAfter = route.query.search || '';
            if (_.isEqual(normalize(keywordsBefore), normalize(keywordsAfter))) {
                this.setState({ keywords: keywordsAfter });
            }
        }
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var t = this.props.locale.translate;
        var inputProps = {
            type: 'text',
            value: this.state.keywords,
            onChange: this.handleChange,
        };
        return (
            <div className="search-bar">
                <label>{t('search-bar-keywords')}</label>
                <input {...inputProps} />
            </div>
        );
    },

    performSearch: function() {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
        var route = this.props.route;
        var params = _.clone(route.parameters);
        params.search = normalize(this.state.keywords);
        var url = route.component.getUrl(params);
        route.change(url, true);
    },

    /**
     * Called when user changes search string
     *
     * @param  {Event} evt
     */
    handleChange: function(evt) {
        var text = evt.target.value;
        this.setState({ keywords: text });

        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        this.timeout = setTimeout(this.performSearch, 500);
    },
});

function normalize(s) {
    s = _.replace(s, /\+/g, '');
    s = _.replace(s, /\s+/g, ' ')
    var words = _.split(s);
    return words.join(' ');
}
