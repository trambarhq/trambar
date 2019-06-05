import _ from 'lodash';
import React, { useState } from 'react';
import { useListener, useSaveBuffer } from 'relaks';
import { memoizeWeak } from 'common/utils/memoize.mjs';
import * as UserUtils from 'common/objects/utils/user-utils.mjs';

// widgets
import { SmartList } from 'common/widgets/smart-list.jsx';
import { UserView } from '../views/user-view.jsx';
import { ErrorBoundary } from 'common/widgets/error-boundary.jsx';

import './user-list.scss';

/**
 * A list of users. Parent component must supply all needed data.
 */
function UserList(props) {
    const { database, route, env } = props;
    const { users, roles, listings, stories, dailyActivities, currentUser } = props;
    const { scrollToUserID, selectedDate, link } = props;
    const viewOptions = useSaveBuffer({
        original: {},
        preserve: (base, ours) => {
            const json = JSON.stringify(ours);
            sessionStorage.user_view_options = json;
            console.log(sessionStorage.user_view_options);
        },
        restore: (base) => {
            try {
                const json = sessionStorage.user_view_options;
                console.log(JSON.parse(json));
                return JSON.parse(json);
            } catch (err){
            }
        },
        compare: _.isEqual,
    });
    console.log(viewOptions.current);

    const handleUserIdentity = useListener((evt) => {
        return getAnchor(evt.item.id);
    });
    const handleUserRender = (evt) => {
        return renderUser(evt.item, evt.needed, evt.previousHeight, evt.estimatedHeight);
    };
    const handleUserAnchorChange = useListener((evt) => {
        const params = { scrollToUserID };
        route.reanchor(params);
    });

    function getAnchor(userID) {
        return (userID) ? `user-${userID}` : undefined;
    }

    const smartListProps = {
        items: sortUsers(users, env),
        offset: 16,
        behind: 4,
        ahead: 8,
        anchor: getAnchor(scrollToUserID),

        onIdentity: handleUserIdentity,
        onRender: handleUserRender,
        onAnchorChange: handleUserAnchorChange,
    };
    return (
        <div className="user-list">
            <SmartList {...smartListProps} />
        </div>
    );

    function renderUser(user, needed, previousHeight, estimatedHeight) {
        if (needed) {
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
            const userProps = {
                user,
                roles: findRoles(roles, user),
                dailyActivities: _.get(dailyActivities, user.id),
                stories: userStories,
                options: viewOptions,
                currentUser,
                database,
                route,
                env,
                selectedDate,
                link,
            };
            return (
                <ErrorBoundary env={env}>
                    <UserView {...userProps} />
                </ErrorBoundary>
            );
        } else {
            const height = previousHeight || estimatedHeight || 100;
            return <div className="user-view" style={{ height }} />;
        }
    }
}

let savedViewOptions = {};

const sortUsers = memoizeWeak(null, function(users, env) {
    const name = (user) => {
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
