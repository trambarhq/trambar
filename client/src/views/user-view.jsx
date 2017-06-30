var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var UserStory = require('views/user-story');
var UserStatistics = require('views/user-statistics');
var UserViewOptions = require('views/user-view-options');

require('./user-view.scss');

module.exports = React.createClass({
    displayName: 'UserView',
    mixins: [ UpdateCheck ],
    propTypes: {
        user: PropTypes.object.isRequired,
        story: PropTypes.object,
        currentUser: PropTypes.object.isRequired,

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

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <UserStory {...props} />;
    },

    renderStatistics: function() {
        var props = {
            user: this.props.user,
            story: this.props.story,
            statistics: this.props.statistics,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <UserStatistics {...props} />;
    },

    renderOptions: function() {
        var props = {
            user: this.props.user,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <UserViewOptions {...props} />;
    },
});
