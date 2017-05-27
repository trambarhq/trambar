var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

require('./top-navigation.scss');

module.exports = React.createClass({
    displayName: 'TopNavigation',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        return (
            <header className="top-navigation">
                Top Nav
                {this.renderSpacerBar()}
                {this.renderButtonBar()}
                {this.renderCollapsibleControl()}
            </header>
        );
    },

    /**
     * Render a bar on iOS where the status bar overlays the app
     *
     * @return {ReactElement}
     */
    renderSpacerBar: function() {

    },

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtonBar: function() {

    },

    /**
     * Render collapsible UI controls
     *
     * @return {ReactElement}
     */
    renderCollapsibleControl: function() {

    },
});
