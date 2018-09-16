import _ from 'lodash';
import Moment from 'moment';
import React, { PureComponent } from 'react';
import Memoize from 'utils/memoize';
import Empty from 'data/empty';
import * as DateTracker from 'utils/date-tracker';
import * as DateUtils from 'utils/date-utils';

// widgets
import SmartList from 'widgets/smart-list';
import UserView from 'views/user-view';

import './user-list.scss';

class UserList extends PureComponent {
    static displayName = 'UserList';

    constructor(props) {
        super(props);
        this.state = {
            viewOptions: {},
        };
    }

    /**
     * Extract id from URL hash
     *
     * @param  {String} hash
     *
     * @return {Object}
     */
    static parseHash(hash) {
            let user, highlighting;
            if (user = Route.parseId(hash, /U(\d+)/)) {
                highlighting = true;
            } else if (user = Route.parseId(hash, /u(\d+)/)) {
                highlighting = false;
            }
            return { user, highlighting };
    }

    /**
     * Get URL hash based on given parameters
     *
     * @param  {Object} params
     *
     * @return {String}
     */
    static getHash(params) {
        if (params.user) {
            if (params.highlighting) {
                return `U${params.user}`;
            } else {
                return `u${params.user}`;
            }
        }
        return '';
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let users = sortUsers(this.props.users, this.props.locale);
        let anchor;
        let hashParams = UserList.parseHash(this.props.route.hash);
        if (hashParams.user) {
            anchor = `user-${hashParams.user}`;
        }
        let smartListProps = {
            items: users,
            offset: 16,
            behind: 4,
            ahead: 8,
            anchor: anchor,

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
        if (evt.needed) {
            let user = evt.item;
            let roles = findRoles(this.props.roles, user);
            let dailyActivities = _.get(this.props.dailyActivities, user.id);
            let stories;
            if (this.props.listings) {
                let listing = findListing(this.props.listings, user);
                stories = findListingStories(this.props.stories, listing);
            } else {
                stories = findUserStories(this.props.stories, user);
            }
            if (stories && stories.length > 5) {
                stories = _.slice(stories, -5);
            }
            let options = this.state.viewOptions[user.id] || {};
            let userProps = {
                user,
                roles,
                dailyActivities,
                stories,
                options,
                currentUser: this.props.currentUser,
                database: this.props.database,
                route: this.props.route,
                locale: this.props.locale,
                theme: this.props.theme,
                selectedDate: this.props.selectedDate,
                today: this.props.today,
                link: this.props.link,
                onOptionChange: this.handleOptionChange,
            };
            return <UserView {...userProps} />;
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
        let params = {
            user: _.get(evt.item, 'id')
        };
        let hash = UserList.getHash(params);
        this.props.route.reanchor(hash);
    }

    /**
     * Called when the user change chart options
     *
     * @param  {Object} evt
     */
    handleOptionChange = (evt) => {
        // storing chart selection at this level to avoid loss of state
        // due to on-demand rendering
        let viewOptions = _.clone(this.state.viewOptions);
        viewOptions[evt.user.id] = evt.options;
        this.setState({ viewOptions });
    }
}

let sortUsers = Memoize(function(users, locale) {
    let p = locale.pick;
    let name = (user) => {
        return p(user.details.name);
    };
    return _.orderBy(users, [ name ], [ 'asc' ]);
});

let findRoles = Memoize(function(roles, user) {
    if (user) {
        let list = _.filter(_.map(user.role_ids, (roleId) => {
            return _.find(roles, { id: roleId });
        }));
        if (!_.isEmpty(list)) {
            return list;
        }
    }
    return [];
});

let findListing = Memoize(function(listings, user) {
    if (user) {
        return _.find(listings, (listing) => {
            if (listing.filters.user_ids[0] === user.id) {
                return true;
            }
        });
    } else {
        return null;
    }
});

let findListingStories = Memoize(function(stories, listing) {
    if (listing) {
        let hash = _.keyBy(stories, 'id');
        let list = _.filter(_.map(listing.story_ids, (id) => {
            return hash[id];
        }));
        if (!_.isEmpty(list)) {
            return list;
        }
    }
    return [];
});

let findUserStories = Memoize(function(stories, user) {
    let list = _.filter(stories, (story) => {
        return _.includes(story.user_ids, user.id);
    });
    if (!_.isEmpty(list)) {
        return list;
    }
    return [];
});

export {
    UserList as default,
    UserList,
};

import Database from 'data/database';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    UserList.propTypes = {
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
        loading: PropTypes.bool,
    };
}
