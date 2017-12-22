var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var ProfileImage = require('widgets/profile-image');
var ChartToolbar = require('widgets/chart-toolbar');
var HeaderButton = require('widgets/header-button');
var UserActivityList = require('lists/user-activity-list');
var UserStatistics = require('views/user-statistics');
var UserViewOptions = require('views/user-view-options');
var CornerPopUp = require('widgets/corner-pop-up');

require('./user-view.scss');

module.exports = React.createClass({
    displayName: 'UserView',
    mixins: [ UpdateCheck ],
    propTypes: {
        user: PropTypes.object,
        roles: PropTypes.arrayOf(PropTypes.object),
        stories: PropTypes.arrayOf(PropTypes.object),
        chartType: PropTypes.string,
        dailyActivities: PropTypes.object,
        currentUser: PropTypes.object,
        today: PropTypes.string,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onChartSelect: PropTypes.func,
    },

    /**
     * Return the selected chart type, applying default selection where appropriate
     *
     * @return {String}
     */
    getChartType: function() {
        var chartType = this.props.chartType;
        if (!chartType) {
            // always show statistics in double and triple column mode
            if (this.props.theme.mode !== 'single-col') {
                chartType = 'bar';
            }
        }
        return chartType;
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        switch (this.props.theme.mode) {
            case 'single-col':
                return this.renderSingleColumn();
            case 'double-col':
                return this.renderDoubleColumn();
            case 'triple-col':
                return this.renderTripleColumn();
        }
    },

    /**
     * Render single-column view
     *
     * @return {ReactElement}
     */
    renderSingleColumn: function() {
        return (
            <div className="user-view">
                <div className="header">
                    <div className="column-1 padded">
                        {this.renderProfileImage()}
                        {this.renderRoles()}
                        {this.renderPopUpMenu('main')}
                    </div>
                </div>
                <div className="body">
                    <div className="column-1 padded">
                        {this.renderName()}
                        {this.renderTag()}
                        {this.renderRecentActivities()}
                    </div>
                </div>
                <div className="header">
                    <div className="column-2 padded">
                        {this.renderChartToolbar()}
                    </div>
                </div>
                <div className="body">
                    <div className="column-2">
                        {this.renderStatistics()}
                    </div>
                </div>
            </div>
        );
    },

    /**
     * Render double-column view
     *
     * @return {ReactElement}
     */
    renderDoubleColumn: function() {
        return (
            <div className="user-view">
                <div className="header">
                    <div className="column-1 padded">
                        {this.renderProfileImage()}
                        {this.renderRoles()}
                        {this.renderPopUpMenu('main')}
                    </div>
                    <div className="column-2 padded">
                        {this.renderChartToolbar()}
                    </div>
                </div>
                <div className="body">
                    <div className="column-1 padded">
                        {this.renderName()}
                        {this.renderTag()}
                        {this.renderRecentActivities()}
                    </div>
                    <div className="column-2">
                        {this.renderStatistics()}
                    </div>
                </div>
            </div>
        );
    },

    /**
     * Render triple-column view
     *
     * @return {ReactElement}
     */
    renderTripleColumn: function() {
        var t = this.props.locale.translate;
        return (
            <div className="user-view triple-col">
                <div className="header">
                    <div className="column-1 padded">
                        {this.renderProfileImage()}
                        {this.renderRoles()}
                    </div>
                    <div className="column-2 padded">
                        {this.renderChartToolbar()}
                    </div>
                    <div className="column-3 padded">
                        <HeaderButton icon="chevron-circle-right" label={t('user-actions')} disabled />
                    </div>
                </div>
                <div className="body">
                    <div className="column-1 padded">
                        {this.renderName()}
                        {this.renderTag()}
                        {this.renderRecentActivities()}
                    </div>
                    <div className="column-2">
                        {this.renderStatistics()}
                    </div>
                    <div className="column-3 padded">
                        {this.renderOptions()}
                    </div>
                </div>
            </div>
        );
    },

    /**
     * Render the user's profile image
     *
     * @return {ReactElement}
     */
    renderProfileImage: function() {
        var props = {
            user: this.props.user,
            theme: this.props.theme,
            size: 'large',
        };
        return <ProfileImage {...props} />;
    },

    /**
     * Render the user's roles
     *
     * @return {ReactElement}
     */
    renderRoles: function() {
        var p = this.props.locale.pick;
        var names = _.map(this.props.roles, (role) => {
            return p(role.details.title) || role.name;
        });
        return (
            <span className="roles">
                {names.join(', ') || '\u00a0'}
            </span>
        );
    },

    /**
     * Render toolbar for changing chart type
     *
     * @return {ReactElement}
     */
    renderChartToolbar: function() {
        var props = {
            chartType: this.getChartType(),
            locale: this.props.locale,
            onAction: this.handleAction,
        };
        return <ChartToolbar {...props} />;
    },

    /**
     * Render name of user
     *
     * @return {ReactElement}
     */
    renderName: function() {
        var user = this.props.user;
        var p = this.props.locale.pick;
        var name = (user) ? p(user.details.name) : '\u00a0';
        return <h2 className="name">{name}</h2>;
    },

    /**
     * Render username
     *
     * @return {ReactElement}
     */
    renderTag: function() {
        var t = this.props.locale.translate;
        var user = this.props.user;
        var tag = (user) ? `@${user.username}` : '\u00a0';
        return <h3 className="tag">{tag}</h3>;
    },

    /**
     * Render recent activity list
     *
     * @return {ReactElement}
     */
    renderRecentActivities: function() {
        var props = {
            stories: this.props.stories,
            user: this.props.user,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <UserActivityList {...props} />;
    },

    /**
     * Render a chart showing daily activities
     *
     * @return {ReactElement}
     */
    renderStatistics: function() {
        var props = {
            user: this.props.user,
            story: this.props.story,
            dailyActivities: this.props.dailyActivities,
            chartType: this.getChartType(),
            today: this.props.today,

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
        return (
            <CornerPopUp>
                {this.renderOptions(section)}
            </CornerPopUp>
        );
    },

    /**
     * Render options pane or simply the list of options when it's in a menu
     *
     * @param  {String} section
     *
     * @return {ReactElement}
     */
    renderOptions: function(section) {
        var props = {
            section,
            user: this.props.user,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <UserViewOptions {...props} />;
    },

    /**
     * Called when user clicks on one of the chart buttons
     *
     * @param  {Object} evt
     */
    handleAction: function(evt) {
        switch (evt.action) {
            case 'chart-type-set':
                if (this.props.onChartSelect) {
                    this.props.onChartSelect({
                        type: 'chartselect',
                        target: this,
                        chart: evt.value,
                        user: this.props.user,
                    });
                }
                break;
        }
    },
});
