import _ from 'lodash';
import Moment from 'moment';
import React from 'react';
import Relaks, { useProgress } from 'relaks';
import { memoizeWeak } from 'common/utils/memoize.mjs';
import * as ProjectFinder from 'common/objects/finders/project-finder.mjs';
import * as ProjectUtils from 'common/objects/utils/project-utils.mjs';
import * as StatisticsFinder from 'common/objects/finders/statistics-finder.mjs';
import * as StoryFinder from 'common/objects/finders/story-finder.mjs';
import * as UserFinder from 'common/objects/finders/user-finder.mjs';
import * as TagScanner from 'common/utils/tag-scanner.mjs';

// widgets
import PageContainer from '../widgets/page-container.jsx';
import UserList from '../lists/user-list.jsx';
import StoryList from '../lists/story-list.jsx';
import LoadingAnimation from '../widgets/loading-animation.jsx';
import EmptyMessage from '../widgets/empty-message.jsx';

import './people-page.scss';

/**
 * Asynchronous component that retrieves data needed by the People or
 * Person page, depending on whether selectedUserID is given.
 */
async function PeoplePage(props) {
  const { database, route, payloads, env, date, roleIDs, search } = props;
  const { selectedUserID, scrollToUserID, highlightStoryID, scrollToStoryID } = props;
  const [ show ] = useProgress();
  const freshListing = false;

  let tags;
  if (search) {
    if (!TagScanner.removeTags(search)) {
      tags = TagScanner.findTags(search);
    }
  }

  render();
  const currentUserID = await database.start();
  const currentUser = await UserFinder.findUser(database, currentUserID);
  const project = await ProjectFinder.findCurrentProject(database);
  const members = await UserFinder.findProjectMembers(database, project);
  let selectedUser, visibleUsers;
  if (selectedUserID) {
    // find the selected user
    let user = _.find(members, { id: selectedUserID });
    if (!user) {
      // not on the member list
      user = await UserFinder.findUser(database, selectedUserID);
    }
    selectedUser = user;
    visibleUsers = [ user ];
  } else {
    // if we're not searching for stories, then we know which
    // users to list at this point
    if (!(search || date)) {
      if (!_.isEmpty(roleIDs)) {
        // show users with roles
        visibleUsers = findUsersWithRoles(props.members, roleIDs);
      } else {
        // all project members are shown
        visibleUsers = members;
      }
    }
  }
  if (env.isWiderThan('double-col')) {
    // don't render without stats in single-column mode, since
    // that affects the height of the view
    render();
  }

  const publicOnly = (currentUser.type === 'guest');
  let dailyActivities = await StatisticsFinder.findDailyActivitiesOfUsers(database, project, members, publicOnly);
  if (!visibleUsers) {
    // find users with stories using stats
    let users;
    if (date) {
      users = findUsersWithActivitiesOnDate(members, dailyActivities, date);
    } else if (search) {
      if (tags) {
        users = findUsersWithStoriesWithTags(members, dailyActivities, tags);
      }
    }
    if (users) {
      if (!_.isEmpty(roleIDs)) {
        visibleUsers = findUsersWithRoles(users, roleIDs);
      } else {
        visibleUsers = users;
      }
    }
  } else if (selectedUser) {
    // load statistics of selected user if he's not a member
    if (!_.includes(members, selectedUser)) {
      let selectedUserStats = await StatisticsFinder.findDailyActivitiesOfUser(database, project, selectedUser, publicOnly);
      dailyActivities = { ...dailyActivities };
      dailyActivities[selectedUser.id] = selectedUserStats;
    }
  }
  render();

  let stories;
  if (search) {
    if (tags) {
      stories = await StoryFinder.findStoriesWithTags(database, tags, 5);
    } else {
      stories = await StoryFinder.findStoriesMatchingText(database, search, env, 5);
    }
  } else if (date) {
    stories = await StoryFinder.findStoriesOnDate(database, date, 5);
    if (!selectedUser) {
      // we have used stats to narrow down the user list earlier; do
      // it again based on the story list in case we got an incomplete
      // list due to out-of-date stats
      visibleUsers = null;
    }
  } else {
    stories = await StoryFinder.findStoriesByUsersInListings(database, 'news', visibleUsers, currentUser, 5, freshListing);
  }
  if (!visibleUsers) {
    // now that we have the stories, we can see whom should be shown
    visibleUsers = findUsersWithStories(members, stories);
  }
  render();

  let selectedUserStories;
  if (selectedUser) {
    // load stories of selected user
    if (search) {
      if (tags) {
        selectedUserStories = await StoryFinder.findStoriesByUserWithTags(database, selectedUser, tags);
      } else {
        selectedUserStories = await StoryFinder.findStoriesByUserMatchingText(database, selectedUser, search, env);
      }
    } else if (date) {
      selectedUserStories = await StoryFinder.findStoriesByUserOnDate(database, selectedUser, date);
    } else {
      selectedUserStories = await StoryFinder.findStoriesByUserInListing(database, 'news', selectedUser, currentUser, freshListing);
    }
  } else {
    // deal with situation where we're showing stories by someone
    // who're not on the team (only when we're searching for stories)
    if (search || date) {
      const authorIDs = _.uniq(_.flatten(_.map(stories, 'user_ids')));
      const memberIDs = _.map(members, 'id');
      const nonMemberUserIDs = _.difference(authorIDs, memberIDs);
      const publicOnly = (currentUser.type === 'guest');
      if (!_.isEmpty(nonMemberUserIDs)) {
        const users = await UserFinder.findUsers(database, nonMemberUserIDs);
        // add non-members
        if (visibleUsers) {
          visibleUsers = _.concat(visibleUsers, users);
        } else {
          visibleUsers = users;
        }
        render();
        const nonMemberStats = await StatisticsFinder.findDailyActivitiesOfUsers(database, project, users, publicOnly);
        dailyActivities = { ...dailyActivities, ...nonMemberStats };
      }
    }
  }
  render();

  // when we're highlighting a story, make sure the story is actually there
  if (!date) {
    if (highlightStoryID) {
      const allStories = selectedUserStories;
      if (!_.find(allStories, { id: highlightStoryID })) {
        try {
          let story = await StoryFinder.findStory(database, highlightStoryID);
          await redirectToStory(story);
        } catch (err) {
        }
      }
    }
  }

  function render() {
    show(
      <PageContainer className="people-page">
        {renderUserList()}
        {renderSelectedUserStoryList()}
        {renderEmptyMessage()}
      </PageContainer>
    );
  }

  function renderUserList() {
    const listProps = {
      users: visibleUsers,
      dailyActivities,
      stories,
      currentUser,
      selectedDate: date,
      link: (selectedUserID) ? 'team' : 'user',
      scrollToUserID,
      database,
      route,
      env,
    };
    return <UserList {...listProps} />
  }

  function renderSelectedUserStoryList() {
    if (!selectedUser || !selectedUserStories) {
      return null;
    }
    const listProps = {
      access: ProjectUtils.getUserAccessLevel(project, currentUser) || 'read-only',
      stories: selectedUserStories,
      currentUser,
      project,
      highlightStoryID,
      scrollToStoryID,

      database,
      payloads,
      route,
      env,
    };
    return <StoryList {...listProps} />
  }

  function renderEmptyMessage() {
    if (selectedUser) {
      if (!_.isEmpty(selectedUserStories)) {
        return null;
      }
      if (!selectedUserStories) {
        return <LoadingAnimation />;
      } else {
        let phrase;
        if (date) {
          phrase = 'news-no-stories-on-date';
        } else if (!_.isEmpty(roleIDs)) {
          phrase = 'news-no-stories-by-role';
        } else if (search) {
          phrase = 'news-no-stories-found';
        } else {
          phrase = 'news-no-stories-yet';
        }
        const props = { phrase, env };
        return <EmptyMessage {...props} />;
      }
    } else {
      if (!_.isEmpty(visibleUsers)) {
        return null;
      }
      if (!visibleUsers) {
        return <LoadingAnimation />;
      } else {
        let phrase;
        if (date) {
          phrase = 'people-no-stories-on-date';
        } else if (!_.isEmpty(roleIDs)) {
          phrase = 'people-no-users-by-role';
        } else if (search) {
          phrase = 'people-no-stories-found';
        } else {
          phrase = 'people-no-users-yet';
        }
        const props = { phrase, env };
        return <EmptyMessage {...props} />;
      }
    }
  }

  function redirectToStory(story) {
    if (story.ptime && story.published && story.ready !== false) {
      // don't redirect if the story is very recent
      let elapsed = Moment() - Moment(story.ptime);
      if (elapsed < 60 * 1000) {
        return;
      }
    }
    let params = {
      date: Moment(story.ptime).format('YYYY-MM-DD'),
      selectedUserID,
      highlightStoryID: story.id,
    };
    return route.replace(route.name, params);
  }
}

const findUsersWithRoles = memoizeWeak(null, function(users, roleIDs) {
  return _.filter(users, (user) => {
    return _.some(user.role_ids, (roleID) => {
      return _.includes(roleIDs, roleID);
    });
  });
});

const findUsersWithActivitiesOnDate = memoizeWeak(null, function(users, statistics, date) {
  return _.filter(users, (user) => {
    const userStats = statistics[user.id];
    if (userStats) {
      return userStats.daily[date];
    }
  });
});

const findUsersWithStoriesWithTags = memoizeWeak(null, function(users, statistics, tags) {
  return _.filter(users, (user) => {
    const userStats = statistics[user.id];
    if (userStats) {
      return _.some(userStats.daily, (counts, date) => {
        return _.some(tags, (tag) => {
          return !!counts[tag];
        });
      });
    }
  });
});

const findUsersWithStories = memoizeWeak(null, function(users, stories) {
  return _.filter(users, (user) => {
    return _.some(stories, (story) => {
      return _.includes(story.user_ids, user.id);
    });
  });
});

const component = Relaks.memo(PeoplePage);

export {
  component as default,
  component as PeoplePage,
};
