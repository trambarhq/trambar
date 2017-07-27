var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var UserSummary = require('views/user-summary');
var UserStatistics = require('views/user-statistics');
var UserViewOptions = require('views/user-view-options');
var CornerPopUp = require('widgets/corner-pop-up');

require('./user-view.scss');

module.exports = React.createClass({
    displayName: 'UserView',
    mixins: [ UpdateCheck ],
    propTypes: {
        user: PropTypes.object.isRequired,
        story: PropTypes.object,
        currentUser: PropTypes.object.isRequired,
        dailyActivities: PropTypes.object,

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
        if (this.props.theme.mode === 'columns-1') {
            return (
                <div className="story-view columns-1">
                    {this.renderStory()}
                    {this.renderStatistics()}
                </div>
            );
        } else if (this.props.theme.mode === 'columns-2') {
            return (
                <div className="story-view columns-2">
                    <div className="column-1">
                        {this.renderStory()}
                    </div>
                    <div className="column-2">
                        {this.renderStatistics()}
                    </div>
                </div>
            );
        } else if (this.props.theme.mode === 'columns-3') {
            return (
                <div className="story-view columns-3">
                    <div className="column-1">
                        {this.renderStory()}
                    </div>
                    <div className="column-2">
                        {this.renderStatistics()}
                    </div>
                    <div className="column-3">
                        {this.renderOptions()}
                    </div>
                </div>
            );
        }
    },

    renderStory: function() {
        var props = {
            user: this.props.user,
            roles: this.props.roles,
            story: this.props.story,
            cornerPopUp: this.renderPopUpMenu('main'),

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <UserSummary {...props} />;
    },

    renderStatistics: function() {
        var props = {
            user: this.props.user,
            story: this.props.story,
            dailyActivities: this.props.dailyActivities,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <UserStatistics {...props} />;
    },

    /**
     * Render popup menu containing options for given section
     *
     * @param  {String} section
     *
     * @return {ReactElement}
     */
    renderPopUpMenu: function(section) {
        if (this.props.theme.mode === 'columns-3') {
            return null;
        }
        return (
            <CornerPopUp>
                {this.renderOptions(true, section)}
            </CornerPopUp>
        );
    },

    /**
     * Render options pane or simply the list of options when it's in a menu
     *
     * @param  {Boolean} inMenu
     * @param  {String} section
     *
     * @return {ReactElement}
     */
    renderOptions: function(inMenu, section) {
        var props = {
            inMenu,
            section,
            user: this.props.user,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <UserViewOptions {...props} />;
    },
});
