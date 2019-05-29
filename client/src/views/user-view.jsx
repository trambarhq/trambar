import _ from 'lodash';
import React, { useState } from 'react';
import { useListener } from 'relaks';
import * as RoleUtils from 'common/objects/utils/role-utils.mjs';
import * as TagScanner from 'common/utils/tag-scanner.mjs';
import * as UserUtils from 'common/objects/utils/user-utils.mjs';

// widgets
import { ProfileImage } from '../widgets/profile-image.jsx';
import { ChartToolbar } from '../widgets/chart-toolbar.jsx';
import { HeaderButton } from '../widgets/header-button.jsx';
import { UserActivityList } from '../lists/user-activity-list.jsx';
import { UserStatistics } from '../views/user-statistics.jsx';
import { UserViewOptions } from '../views/user-view-options.jsx';
import { UserList } from '../lists/user-list.jsx';
import { CornerPopUp } from '../widgets/corner-pop-up.jsx';

import './user-view.scss';

/**
 * Component for showing information about a user.
 */
function UserView(props) {
    const { user, roles, stories, dailyActivities, options } = props;
    const { database, route, env, selectedDate, search, link, onOptionChange } = props;
    const { t, p } = env.locale;
    // always show statistics in double and triple column mode
    const defaultChartType = env.isWiderThan('double-col') ? 'bar' : undefined;
    const defaultChartRange = 'biweekly';
    const chartType = options.chartType || defaultChartType;
    const chartRange = options.chartRange || defaultChartRange;
    const [ openMenu, setOpenMenu ] = useState('');

    const handleAction = useListener((evt) => {
        switch (evt.action) {
            case 'chart-type-set':
                const newOptions = _.clone(options);
                if (!env.isWiderThan('double-col')) {
                    if (newOptions.chartType === evt.value) {
                        newOptions.chartType = null;
                    } else {
                        newOptions.chartType = evt.value;
                    }
                } else {
                    newOptions.chartType = evt.value;
                }
                if (onOptionChange) {
                    onOptionChange({ user, options: newOptions });
                }
                break;
        }
    });
    const handleOptionChange = useListener((evt) => {
        if (onOptionChange) {
            onOptionChange({ user, options: evt.options });
        }
    });
    const handleOptionComplete = useListener((evt) => {
        setOpenMenu('');
    });
    const handleMenuOpen = useListener((evt) => {
        setOpenMenu(evt.name);
    });
    const handleMenuClose = useListener((evt) => {
        setOpenMenu('');
    });

    if (env.isWiderThan('triple-col')) {
        return renderTripleColumn();
    } else if (env.isWiderThan('double-col')) {
        return renderDoubleColumn();
    } else {
        return renderSingleColumn();
    }

    function renderSingleColumn() {
        return (
            <div className="user-view">
                <div className="header">
                    <div className="column-1 padded selectable">
                        {renderProfileImage()}
                        {renderRoles()}
                        {renderPopUpMenu('main')}
                    </div>
                </div>
                <div className="body">
                    <div className="column-1 padded">
                        {renderName()}
                        {renderTag()}
                        {renderBackLink()}
                        {renderRecentActivities()}
                    </div>
                </div>
                <div className="header">
                    <div className="column-2 padded">
                        {renderChartToolbar()}
                        {renderPopUpMenu('statistics')}
                    </div>
                </div>
                <div className="body">
                    <div className="column-2">
                        {renderStatistics()}
                    </div>
                </div>
            </div>
        );
    }

    function renderDoubleColumn() {
        return (
            <div className="user-view">
                <div className="header">
                    <div className="column-1 padded selectable">
                        {renderProfileImage()}
                        {renderRoles()}
                        {renderPopUpMenu('main')}
                    </div>
                    <div className="column-2 padded">
                        {renderChartToolbar()}
                        {renderPopUpMenu('statistics')}
                    </div>
                </div>
                <div className="body">
                    <div className="column-1 padded">
                        {renderName()}
                        {renderTag()}
                        {renderBackLink()}
                        {renderRecentActivities()}
                    </div>
                    <div className="column-2">
                        {renderStatistics()}
                    </div>
                </div>
            </div>
        );
    }

    function renderTripleColumn() {
        return (
            <div className="user-view triple-col">
                <div className="header">
                    <div className="column-1 padded selectable">
                        {renderProfileImage()}
                        {renderRoles()}
                    </div>
                    <div className="column-2 padded">
                        {renderChartToolbar()}
                    </div>
                    <div className="column-3 padded">
                        <HeaderButton icon="chevron-circle-right" label={t('user-actions')} disabled />
                    </div>
                </div>
                <div className="body">
                    <div className="column-1 padded">
                        {renderName()}
                        {renderTag()}
                        {renderBackLink()}
                        {renderRecentActivities()}
                    </div>
                    <div className="column-2">
                        {renderStatistics()}
                    </div>
                    <div className="column-3 padded">
                        {renderOptions()}
                    </div>
                </div>
            </div>
        );
    }

    function renderProfileImage() {
        let url;
        if (user) {
            const params = _.pick(route.params, 'date', 'search');
            params.selectedUserID = user.id;
            url = route.find('person-page', params);
        }
        return (
            <a href={url}>
                <ProfileImage user={user} env={env} size="large" />
            </a>
        );
    }

    function renderRoles() {
        const names = _.map(roles, (role) => {
            return RoleUtils.getDisplayName(role, env);
        });
        return (
            <span className="roles">
                {names.join(', ') || '\u00a0'}
            </span>
        );
    }

    function renderChartToolbar() {
        const props = { chartType, env, onAction: handleAction };
        return <ChartToolbar {...props} />;
    }

    function renderName() {
        const name = UserUtils.getDisplayName(user, env);
        let url;
        if (user) {
            const params = _.pick(route.params, 'date', 'search');
            params.selectedUserID = user.id;
            url = route.find('person-page', params);
        }
        return (
            <h2 className="name">
                <a href={url}>{name}</a>
            </h2>
        );
    }

    function renderTag() {
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

    function renderRecentActivities() {
        let storyCountEstimate;
        if (dailyActivities) {
            let list, tags;
            if (selectedDate) {
                // check just the selected date
                const stats = dailyActivities.daily[selectedDate];
                list = (stats) ? [ stats ] : [];
            } else {
                // go through all dates
                list = _.values(dailyActivities.daily);
            }
            if (search) {
                if (TagScanner.removeTags(search)) {
                    // text search no estimate
                    list = null;
                } else {
                    tags = TagScanner.findTags(search);
                }
            }
            if (list) {
                let total = 0;
                for (let stats of list) {
                    for (let [ count, type] of _.entries(stats)) {
                        if (!tags || _.includes(tags, type))  {
                            total += count;
                        }
                    }
                }
                storyCountEstimate = Math.min(5, total);
            }
        }
        const props = {
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
    function renderBackLink() {
        if (link !== 'team') {
            return null;
        }
        let url;
        if (user) {
            const params = _.pick(route.params, 'date', 'search');
            params.scrollToUserID = user.id;
            url = route.find('people-page', params);
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

    function renderStatistics() {
        const props = {
            user,
            dailyActivities,
            chartType,
            chartRange,
            selectedDate,
            database,
            route,
            env,
        };
        return <UserStatistics {...props} />;
    }

    function renderPopUpMenu(section) {
        const props = {
            open: (openMenu === section),
            name: section,
            onOpen: handleMenuOpen,
            onClose: handleMenuClose,
        };
        return (
            <CornerPopUp {...props}>
                {renderOptions(section)}
            </CornerPopUp>
        );
    }

    function renderOptions(section) {
        const props = {
            section,
            user,
            options,
            selectedDate,
            env,
            onChange: handleOptionChange,
            onComplete: handleOptionComplete,
        };
        return <UserViewOptions {...props} />;
    }
}

export {
    UserView as default,
    UserView,
};
