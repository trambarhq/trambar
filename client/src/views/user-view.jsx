import _ from 'lodash';
import React, { PureComponent } from 'react';
import ComponentRefs from 'utils/component-refs';
import TagScanner from 'utils/tag-scanner';
import UserUtils from 'objects/utils/user-utils';

// widgets
import ProfileImage from 'widgets/profile-image';
import ChartToolbar from 'widgets/chart-toolbar';
import HeaderButton from 'widgets/header-button';
import UserActivityList from 'lists/user-activity-list';
import UserStatistics from 'views/user-statistics';
import UserViewOptions from 'views/user-view-options';
import UserList from 'lists/user-list';
import CornerPopUp from 'widgets/corner-pop-up';

import './user-view.scss';

class UserView extends PureComponent {
    static displayName = 'UserView';

    constructor(props) {
        super(props);
        this.components = ComponentRefs({
            mainPopUp: CornerPopUp,
            statisticsPopUp: CornerPopUp,
        });
    }

    /**
     * Return the selected chart type, applying default selection where appropriate
     *
     * @return {String}
     */
    getChartType() {
        var chartType = this.props.options.chartType;
        if (!chartType) {
            // always show statistics in double and triple column mode
            if (this.props.theme.mode !== 'single-col') {
                chartType = 'bar';
            }
        }
        return chartType;
    }

    /**
     * Return the selected chart range, applying default selection where appropriate
     *
     * @return {String}
     */
    getChartRange() {
        var chartRange = this.props.options.chartRange;
        if (!chartRange) {
            chartRange = 'biweekly';
        }
        return chartRange;
    }

    /**
     * Return the number of stories that'll appear in the activity list based
     * on daily stats
     *
     * @return {Number|undefined}
     */
    getStoryCountEstimate() {
        if (!this.props.dailyActivities) {
            return;
        }
        var params = this.props.route.parameters;
        var tags;
        if (params.search) {
            if (!TagScanner.removeTags(params.search)) {
                tags = TagScanner.findTags(params.search);
                if (_.isEmpty(tags)) {
                    tags = null;
                }
            } else {
                // we don't generate stats for text search
                return;
            }
        }
        var total = 0;
        var list;
        if (this.props.selectedDate) {
            // check just the selected date
            var stats = this.props.dailyActivities.daily[this.props.selectedDate];
            list = (stats) ? [ stats ] : [];
        } else {
            // go through all dates
            list = _.values(this.props.dailyActivities.daily);
        }
        _.each(list, (stats) => {
            _.each(stats, (count, type) => {
                if (!tags || _.includes(tags, type))  {
                    total += count;
                }
            });
            if (total > 5) {
                return false;
            }
        });
        return Math.min(5, total);
    }

    /**
     * Return URL to user page when we're showing all users
     *
     * @return {String|null}
     */
    getUserPageURL() {
        if (this.props.link !== 'user') {
            return null;
        }
        var route = this.props.route;
        var params = _.pick(route.parameters, 'schema', 'date', 'search');
        params.user = this.props.user.id;
        return route.find(require('pages/people-page'), params);
    }

    /**
     * Return URL to team page when we're showing one user
     *
     * @return {String|null}
     */
    getTeamPageURL() {
        if (this.props.link !== 'team') {
            return null;
        }
        var route = this.props.route;
        var params = _.pick(route.parameters, 'schema', 'date', 'search');
        var url = route.find(require('pages/people-page'), params);
        var hash = UserList.getHash({
            user: this.props.user.id
        });
        return url + '#' + hash;
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        switch (this.props.theme.mode) {
            case 'single-col':
                return this.renderSingleColumn();
            case 'double-col':
                return this.renderDoubleColumn();
            case 'triple-col':
                return this.renderTripleColumn();
        }
    }

    /**
     * Render single-column view
     *
     * @return {ReactElement}
     */
    renderSingleColumn() {
        return (
            <div className="user-view">
                <div className="header">
                    <div className="column-1 padded selectable">
                        {this.renderProfileImage()}
                        {this.renderRoles()}
                        {this.renderPopUpMenu('main')}
                    </div>
                </div>
                <div className="body">
                    <div className="column-1 padded">
                        {this.renderName()}
                        {this.renderTag()}
                        {this.renderBackLink()}
                        {this.renderRecentActivities()}
                    </div>
                </div>
                <div className="header">
                    <div className="column-2 padded">
                        {this.renderChartToolbar()}
                        {this.renderPopUpMenu('statistics')}
                    </div>
                </div>
                <div className="body">
                    <div className="column-2">
                        {this.renderStatistics()}
                    </div>
                </div>
            </div>
        );
    }

    /**
     * Render double-column view
     *
     * @return {ReactElement}
     */
    renderDoubleColumn() {
        return (
            <div className="user-view">
                <div className="header">
                    <div className="column-1 padded selectable">
                        {this.renderProfileImage()}
                        {this.renderRoles()}
                        {this.renderPopUpMenu('main')}
                    </div>
                    <div className="column-2 padded">
                        {this.renderChartToolbar()}
                        {this.renderPopUpMenu('statistics')}
                    </div>
                </div>
                <div className="body">
                    <div className="column-1 padded">
                        {this.renderName()}
                        {this.renderTag()}
                        {this.renderBackLink()}
                        {this.renderRecentActivities()}
                    </div>
                    <div className="column-2">
                        {this.renderStatistics()}
                    </div>
                </div>
            </div>
        );
    }

    /**
     * Render triple-column view
     *
     * @return {ReactElement}
     */
    renderTripleColumn() {
        var t = this.props.locale.translate;
        return (
            <div className="user-view triple-col">
                <div className="header">
                    <div className="column-1 padded selectable">
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
                        {this.renderBackLink()}
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
    }

    /**
     * Render the user's profile image
     *
     * @return {ReactElement}
     */
    renderProfileImage() {
        var props = {
            user: this.props.user,
            theme: this.props.theme,
            size: 'large',
        };
        var url = this.getUserPageURL();
        return (
            <a href={url}>
                <ProfileImage {...props} />
            </a>
        );
    }

    /**
     * Render the user's roles
     *
     * @return {ReactElement}
     */
    renderRoles() {
        var p = this.props.locale.pick;
        var names = _.map(this.props.roles, (role) => {
            return p(role.details.title) || role.name;
        });
        return (
            <span className="roles">
                {names.join(', ') || '\u00a0'}
            </span>
        );
    }

    /**
     * Render toolbar for changing chart type
     *
     * @return {ReactElement}
     */
    renderChartToolbar() {
        var props = {
            chartType: this.getChartType(),
            locale: this.props.locale,
            onAction: this.handleAction,
        };
        return <ChartToolbar {...props} />;
    }

    /**
     * Render name of user
     *
     * @return {ReactElement}
     */
    renderName() {
        var name = UserUtils.getDisplayName(this.props.user, this.props.locale);
        var url = this.getUserPageURL();
        return (
            <h2 className="name">
                <a href={url}>{name}</a>
            </h2>
        );
    }

    /**
     * Render username
     *
     * @return {ReactElement}
     */
    renderTag() {
        var t = this.props.locale.translate;
        var user = this.props.user;
        var tag, url;
        if (user) {
            var route = this.props.route;
            var params = route.parameters;
            tag = `@${user.username}`;
            url = route.find(require('pages/news-page'), {
                schema: params.schema,
                search: tag,
            });
        }
        return (
            <h3 className="tag">
                <a href={url}>{tag || '\u00a0'}</a>
            </h3>
        );
    }

    /**
     * Render recent activity list
     *
     * @return {ReactElement}
     */
    renderRecentActivities() {
        var estimate = this.getStoryCountEstimate();
        var props = {
            stories: this.props.stories,
            storyCountEstimate: estimate,
            user: this.props.user,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <UserActivityList {...props} />;
    }

    /**
     * Render return to list link when showing one user
     *
     * @return {ReactElement|null}
     */
    renderBackLink() {
        var url = this.getTeamPageURL();
        if (!url) {
            return null;
        }
        var t = this.props.locale.translate;
        var route = this.props.route;
        return (
            <div className="back-link">
                <a href={url}>
                    <i className="fa fa-chevron-left" />
                    {' '}
                    {t('user-activity-back')}
                </a>
            </div>
        );
    }

    /**
     * Render a chart showing daily activities
     *
     * @return {ReactElement}
     */
    renderStatistics() {
        var props = {
            user: this.props.user,
            story: this.props.story,
            dailyActivities: this.props.dailyActivities,
            chartType: this.getChartType(),
            chartRange: this.getChartRange(),

            selectedDate: this.props.selectedDate,
            today: this.props.today,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <UserStatistics {...props} />;
    }

    /**
     * Render popup menu containing options for given section
     *
     * @param  {String} section
     *
     * @return {ReactElement}
     */
    renderPopUpMenu(section) {
        var ref = this.components.setters[section + 'PopUp'];
        return (
            <CornerPopUp ref={ref}>
                {this.renderOptions(section)}
            </CornerPopUp>
        );
    }

    /**
     * Render options pane or simply the list of options when it's in a menu
     *
     * @param  {String} section
     *
     * @return {ReactElement}
     */
    renderOptions(section) {
        var props = {
            section,
            user: this.props.user,
            options: this.props.options,
            locale: this.props.locale,
            theme: this.props.theme,
            onChange: this.handleOptionChange,
            onComplete: this.handleOptionComplete,
        };
        return <UserViewOptions {...props} />;
    }

    /**
     * Called when user clicks on one of the chart buttons
     *
     * @param  {Object} evt
     */
    handleAction = (evt) => {
        switch (evt.action) {
            case 'chart-type-set':
                var options = _.clone(this.props.options);
                if (this.props.theme.mode === 'single-col') {
                    if (options.chartType === evt.value) {
                        options.chartType = null;
                    } else {
                        options.chartType = evt.value;
                    }
                } else {
                    options.chartType = evt.value;
                }
                if (this.props.onOptionChange) {
                    this.props.onOptionChange({
                        type: 'optionchange',
                        target: this,
                        user: this.props.user,
                        options,
                    });
                }
                break;
        }
    }

    /**
     * Called when user changes display options
     *
     * @param  {Object} evt
     */
    handleOptionChange = (evt) => {
        if (this.props.onOptionChange) {
            this.props.onOptionChange({
                type: 'optionchange',
                target: this,
                user: this.props.user,
                options: evt.options,
            });
        }
    }

    /**
     * Called when a change to the story options is complete
     *
     * @param  {Object} evt
     */
    handleOptionComplete = (evt) => {
        var section = evt.target.props.section;
        var popUp = this.components[section + 'PopUp'];
        if (popUp) {
            popUp.close();
        }
    }
}

export {
    UserView as default,
    UserView,
};

import Database from 'data/database';
import Route from 'routing/route';
import Locale from 'locale/locale';
import Theme from 'theme/theme';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');
    
    UserView.propTypes = {
        user: PropTypes.object,
        roles: PropTypes.arrayOf(PropTypes.object),
        stories: PropTypes.arrayOf(PropTypes.object),
        options: PropTypes.object.isRequired,
        dailyActivities: PropTypes.object,
        currentUser: PropTypes.object,
        selectedDate: PropTypes.string,
        today: PropTypes.string,
        link: PropTypes.oneOf([ 'user', 'team' ]),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onOptionChange: PropTypes.func,
    };
}
