import _ from 'lodash';
import Moment from 'moment';
import React, { PureComponent } from 'react';
import { memoizeWeak } from 'common/utils/memoize.mjs';
import * as UserUtils from 'common/objects/utils/user-utils.mjs';

// widgets
import SmartList from 'common/widgets/smart-list.jsx';
import UserView from '../views/user-view.jsx';
import ErrorBoundary from 'common/widgets/error-boundary.jsx';

import './user-list.scss';

/**
 * A list of users. Parent component must supply all needed data.
 *
 * @extends PureComponent
 */
class UserList extends PureComponent {
    static displayName = 'UserList';
    static viewOptions = {};

    constructor(props) {
        super(props);
        this.state = {
            viewOptions: UserList.viewOptions,
        };
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { route, env, users, scrollToUserID } = this.props;
        let anchorUserID = scrollToUserID;
        let smartListProps = {
            items: sortUsers(users, env),
            offset: 16,
            behind: 4,
            ahead: 8,
            anchor: (anchorUserID) ? `user-${anchorUserID}` : undefined,

            onIdentity: this.handleUserIdentity,
            onRender: this.handleUserRender,
            onAnchorChange: this.handleUserAnchorChange,
        };
        return (
            <div className="user-list">
                <SmartList {...smartListProps} />
            </div>
        );
    }

    /**
     * Change the URL hash so page is anchor at given story
     *
     * @param  {Number|undefined} scrollToUserID
     */
    reanchorAtUser(scrollToUserID) {
        let { route } = this.props;
        let params = {
            scrollToUserID,
        };
        route.reanchor(params);
    }

    /**
     * Return identifier for item
     *
     * @param  {Object} evt
     *
     * @return {String}
     */
    handleUserIdentity = (evt) => {
        return `user-${evt.item.id}`;
    }

    /**
     * Render a user view component in response to event fired by SmartList
     *
     * @param  {Object} evt
     *
     * @return {ReactElement}
     */
    handleUserRender = (evt) => {
        let {
            database,
            route,
            env,
            currentUser,
            roles,
            stories,
            dailyActivities,
            listings,
            selectedDate,
            link,
        } = this.props;
        let { viewOptions } = this.state;
        if (evt.needed) {
            let user = evt.item;
            let userRoles = findRoles(roles, user);
            let userDailyActivities = _.get(dailyActivities, user.id);
            let userStories;
            if (listings) {
                let listing = findListing(listings, user);
                userStories = findListingStories(stories, listing);
            } else {
                userStories = findUserStories(stories, user);
            }
            if (userStories && userStories.length > 5) {
                userStories = _.slice(userStories, -5);
            }
            let userProps = {
                user,
                roles: userRoles,
                dailyActivities: userDailyActivities,
                stories: userStories,
                options: viewOptions,
                currentUser,
                database,
                route,
                env,
                selectedDate,
                link,
                onOptionChange: this.handleOptionChange,
            };
            return (
                <ErrorBoundary env={env}>
                    <UserView {...userProps} />
                </ErrorBoundary>
            );
        } else {
            let height = evt.previousHeight || evt.estimatedHeight || 100;
            return <div className="user-view" style={{ height }} />;
        }
    }

    /**
     * Called when a different user is positioned at the top of the viewport
     *
     * @param  {Object} evt
     */
    handleUserAnchorChange = (evt) => {
        let { route } = this.props;
        this.reanchorAtUser((evt.item) ? evt.item.id : undefined);
    }

    /**
     * Called when the user change chart options
     *
     * @param  {Object} evt
     */
    handleOptionChange = (evt) => {
        this.setState({ viewOptions: evt.options });
        UserList.viewOptions = evt.options;
    }
}

const sortUsers = memoizeWeak(null, function(users, env) {
    let name = (user) => {
        return UserUtils.getDisplayName(user, env);
    };
    return _.orderBy(users, [ name ], [ 'asc' ]);
});

const findRoles = memoizeWeak(null, function(roles, user) {
    if (user) {
        return _.filter(_.map(user.role_ids, (roleId) => {
            return _.find(roles, { id: roleId });
        }));
    }
});

const findListing = memoizeWeak(null, function(listings, user) {
    if (user) {
        return _.find(listings, (listing) => {
            if (listing.filters.user_ids[0] === user.id) {
                return true;
            }
        });
    }
});

const findListingStories = memoizeWeak(null, function(stories, listing) {
    if (listing) {
        let hash = _.keyBy(stories, 'id');
        return _.filter(_.map(listing.story_ids, (id) => {
            return hash[id];
        }));
    }
});

const findUserStories = memoizeWeak(null, function(stories, user) {
    return _.filter(stories, (story) => {
        return _.includes(story.user_ids, user.id);
    });
});

export {
    UserList as default,
    UserList,
};

import Database from 'common/data/database.mjs';
import Route from 'common/routing/route.mjs';
import Environment from 'common/env/environment.mjs';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    UserList.propTypes = {
        scrollToUserID: PropTypes.number,
        users: PropTypes.arrayOf(PropTypes.object),
        roles: PropTypes.arrayOf(PropTypes.object),
        dailyActivities: PropTypes.object,
        listings: PropTypes.arrayOf(PropTypes.object),
        stories: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,
        selectedDate: PropTypes.string,
        today: PropTypes.string,
        link: PropTypes.oneOf([ 'user', 'team' ]),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
