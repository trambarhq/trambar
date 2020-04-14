import React, { useState } from 'react';
import { useListener, useSaveBuffer } from 'relaks';
import { getUserName } from 'common/objects/utils/user-utils.js';
import { orderBy } from 'common/utils/array-utils.js';
import { isEqual } from 'common/utils/object-utils.js';

// widgets
import { SmartList } from 'common/widgets/smart-list.jsx';
import { UserView } from '../views/user-view.jsx';
import { ErrorBoundary } from 'common/widgets/error-boundary.jsx';

import './user-list.scss';

/**
 * A list of users. Parent component must supply all needed data.
 */
export function UserList(props) {
  const { database, route, env } = props;
  const { users, roles, listings, stories, dailyActivities, currentUser } = props;
  const { scrollToUserID, selectedDate, link } = props;
  const viewOptions = useSaveBuffer({
    original: {},
    preserve: (base, ours) => {
      const json = JSON.stringify(ours);
      sessionStorage.user_view_options = json;
    },
    restore: (base) => {
      try {
        const json = sessionStorage.user_view_options;
        return JSON.parse(json);
      } catch (err){
      }
    },
    compare: isEqual,
  });

  const handleUserIdentity = useListener((evt) => {
    return getAnchor(evt.item.id);
  });
  const handleUserRender = (evt) => {
    return renderUser(evt.item, evt.needed, evt.previousHeight, evt.estimatedHeight);
  };
  const handleUserAnchorChange = useListener((evt) => {
    const scrollToUserID = evt.item?.id;
    route.replace({ scrollToUserID });
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
      if (userStories?.length > 5) {
        userStories = userStories.slice(-5);
      }
      const userProps = {
        user,
        roles: findRoles(roles, user),
        dailyActivities: dailyActivities?.[user.id],
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

function sortUsers(users, env) {
  const name = usr => getUserName(usr, env);
  return orderBy(users, [ name ], [ 'asc' ]);
}

function findRoles(roles, user) {
  if (user) {
    const results = [];
    for (let roleId of user.role_ids) {
      const role = roles.find(r => r.id === roleId);
      if (role) {
        results.push(role);
      }
    }
    return results;
  }
}

function findListing(listings, user) {
  if (user) {
    return listings.find((listing) => {
      if (listing.filters.user_ids[0] === user.id) {
        return true;
      }
    });
  }
}

function findListingStories(stories, listing) {
  if (listing) {
    const results = [];
    for (let id of listing.story_ids) {
      story = stories.find(s => s.id === id);
      if (story) {
        results.push(story);
      }
    }
    return results;
  }
}

function findUserStories(stories, user) {
  return stories?.filter((story) => {
    return (story.user_ids.includes(user.id));
  });
}
