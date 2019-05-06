import _ from 'lodash';
import React, { PureComponent } from 'react';
import ComponentRefs from 'common/utils/component-refs.mjs';
import * as TagScanner from 'common/utils/tag-scanner.mjs';
import * as UserUtils from 'common/objects/utils/user-utils.mjs';

// widgets
import ProfileImage from '../widgets/profile-image.jsx';
import ChartToolbar from '../widgets/chart-toolbar.jsx';
import HeaderButton from '../widgets/header-button.jsx';
import UserActivityList from '../lists/user-activity-list.jsx';
import UserStatistics from '../views/user-statistics.jsx';
import UserViewOptions from '../views/user-view-options.jsx';
import UserList from '../lists/user-list.jsx';
import CornerPopUp from '../widgets/corner-pop-up.jsx';

import './user-view.scss';

/**
 * Component for showing information about a user.
 *
 * @extends PureComponent
 */
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
        let { env, options } = this.props;
        let chartType = options.chartType;
        if (!chartType) {
            // always show statistics in double and triple column mode
            if (env.isWiderThan('double-col')) {
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
        let { options } = this.props;
        let chartRange = options.chartRange;
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
        let { dailyActivities, selectedDate, search } = this.props;
        if (!dailyActivities) {
            return;
        }
        let tags;
        if (search) {
            if (!TagScanner.removeTags(search)) {
                tags = TagScanner.findTags(search);
            } else {
                // we don't generate stats for text search
                return;
            }
        }
        let total = 0;
        let list;
        if (selectedDate) {
            // check just the selected date
            let stats = dailyActivities.daily[selectedDate];
            list = (stats) ? [ stats ] : [];
        } else {
            // go through all dates
            list = _.values(dailyActivities.daily);
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
        let { route, user, link } = this.props;
        if (link !== 'user') {
            return null;
        }
        let params = _.pick(route.params, 'date', 'search');
        params.selectedUserID = user.id;
        return route.find('person-page', params);
    }

    /**
     * Return URL to team page when we're showing one user
     *
     * @return {String|null}
     */
    getTeamPageURL() {
        let { route, user, link } = this.props;
        if (link !== 'team') {
            return null;
        }
        let params = _.pick(route.params, 'date', 'search');
        params.scrollToUserID = user.id;
        return route.find('people-page', params);
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { env } = this.props;
        if (env.isWiderThan('triple-col')) {
            return this.renderTripleColumn();
        } else if (env.isWiderThan('double-col')) {
            return this.renderDoubleColumn();
        } else {
            return this.renderSingleColumn();
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
        let { env } = this.props;
        let { t } = env.locale;
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
        let { env, user } = this.props;
        let url = this.getUserPageURL();
        return (
            <a href={url}>
                <ProfileImage user={user} env={env} size="large" />
            </a>
        );
    }

    /**
     * Render the user's roles
     *
     * @return {ReactElement}
     */
    renderRoles() {
        let { env, roles } = this.props;
        let { p } = env.locale;
        let names = _.map(roles, (role) => {
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
        let { env } = this.props;
        let props = {
            chartType: this.getChartType(),
            env,
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
        let { env, user } = this.props;
        let name = UserUtils.getDisplayName(user, env);
        let url = this.getUserPageURL();
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
        let { route, env, user } = this.props;
        let { t } = env.locale;
        let tag, url;
        if (user) {
            tag = `@${user.username}`;
            url = route.find('news-page', { search: tag });
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
        let { route, env, stories, user } = this.props;
        let storyCountEstimate = this.getStoryCountEstimate();
        let props = {
            stories,
            storyCountEstimate,
            user,
            route,
            env,
        };
        return <UserActivityList {...props} />;
    }

    /**
     * Render return to list link when showing one user
     *
     * @return {ReactElement|null}
     */
    renderBackLink() {
        let { env } = this.props;
        let { t } = env.locale;
        let url = this.getTeamPageURL();
        if (!url) {
            return null;
        }
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
        let {
            database,
            route,
            env,
            user,
            story,
            dailyActivities,
            selectedDate,
        } = this.props;
        let props = {
            user,
            story,
            dailyActivities,
            chartType: this.getChartType(),
            chartRange: this.getChartRange(),
            selectedDate,
            database,
            route,
            env,
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
        let { setters } = this.components;
        let ref = setters[section + 'PopUp'];
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
        let { env, user, options, selectedDate } = this.props;
        let props = {
            section,
            user,
            options,
            selectedDate,
            env,
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
        let { env, user, options, onOptionChange } = this.props;
        switch (evt.action) {
            case 'chart-type-set':
                options = _.clone(options);
                if (!env.isWiderThan('double-col')) {
                    if (options.chartType === evt.value) {
                        options.chartType = null;
                    } else {
                        options.chartType = evt.value;
                    }
                } else {
                    options.chartType = evt.value;
                }
                if (onOptionChange) {
                    onOptionChange({
                        type: 'optionchange',
                        target: this,
                        user,
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
        let { user, onOptionChange } = this.props;
        if (onOptionChange) {
            onOptionChange({
                type: 'optionchange',
                target: this,
                user,
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
        let section = evt.target.props.section;
        let popUp = this.components[section + 'PopUp'];
        if (popUp) {
            popUp.close();
        }
    }
}

export {
    UserView as default,
    UserView,
};

import Database from 'common/data/database.mjs';
import Route from 'common/routing/route.mjs';
import Environment from 'common/env/environment.mjs';

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
        search: PropTypes.string,
        link: PropTypes.oneOf([ 'user', 'team' ]),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,

        onOptionChange: PropTypes.func,
    };
}
