import Moment from 'moment';
import React from 'react';
import { useProgress } from 'relaks';
import { findCurrentProject } from 'common/objects/finders/project-finder.js';
import { getUserAccessLevel } from 'common/objects/utils/project-utils.js';
import { findDailyActivitiesOfUser, findDailyActivitiesOfUsers } from 'common/objects/finders/statistics-finder.js';
import { findStory, findStoriesWithTags, findStoriesMatchingText, findStoriesOnDate,
  findStoriesByUsersInListings, findStoriesByUserWithTags, findStoriesByUserMatchingText,
  findStoriesByUserOnDate, findStoriesByUserInListing } from 'common/objects/finders/story-finder.js';
import { findUser, findUsers, findProjectMembers } from 'common/objects/finders/user-finder.js';
import { removeTags, findTags } from 'common/utils/tag-scanner.js';

// widgets
import { PageContainer } from '../widgets/page-container.jsx';
import { UserList } from '../lists/user-list.jsx';
import { StoryList } from '../lists/story-list.jsx';
import { LoadingAnimation } from '../widgets/loading-animation.jsx';
import { EmptyMessage } from '../widgets/empty-message.jsx';

import './people-page.scss';

/**
 * Asynchronous component that retrieves data needed by the People or
 * Person page, depending on whether selectedUserID is given.
 */
export default async function PeoplePage(props) {
  const { database, route, payloads, env, date, roleIDs, search } = props;
  const { selectedUserID, scrollToUserID, highlightStoryID, scrollToStoryID } = props;
  const [ show ] = useProgress();
  const freshListing = false;

  let tags;
  if (search) {
    if (!removeTags(search)) {
      tags = findTags(search);
    }
  }

  render();
  const currentUserID = await database.start();
  const currentUser = await findUser(database, currentUserID);
  const project = await findCurrentProject(database);
  const members = await findProjectMembers(database, project);
  let selectedUser, visibleUsers;
  if (selectedUserID) {
    // find the selected user
    let user = members.find(usr => usr.id === selectedUserID);
    if (!user) {
      // not on the member list
      user = await findUser(database, selectedUserID);
    }
    selectedUser = user;
    visibleUsers = [ user ];
  } else {
    // if we're not searching for stories, then we know which
    // users to list at this point
    if (!(search || date)) {
      if (roleIDs.length > 0) {
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
  let dailyActivities = await findDailyActivitiesOfUsers(database, project, members, publicOnly);
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
      if (roleIDs.length > 0) {
        visibleUsers = findUsersWithRoles(users, roleIDs);
      } else {
        visibleUsers = users;
      }
    }
  } else if (selectedUser) {
    // load statistics of selected user if he's not a member
    if (!members.includes(selectedUser)) {
      const selectedUserStats = await findDailyActivitiesOfUser(database, project, selectedUser, publicOnly);
      dailyActivities = { ...dailyActivities };
      dailyActivities[selectedUser.id] = selectedUserStats;
    }
  }
  render();

  let stories;
  if (search) {
    if (tags) {
      stories = await findStoriesWithTags(database, tags, 5);
    } else {
      stories = await findStoriesMatchingText(database, search, env, 5);
    }
  } else if (date) {
    stories = await findStoriesOnDate(database, date, 5);
    if (!selectedUser) {
      // we have used stats to narrow down the user list earlier; do
      // it again based on the story list in case we got an incomplete
      // list due to out-of-date stats
      visibleUsers = null;
    }
  } else {
    stories = await findStoriesByUsersInListings(database, 'news', visibleUsers, currentUser, 5, freshListing);
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
        selectedUserStories = await findStoriesByUserWithTags(database, selectedUser, tags);
      } else {
        selectedUserStories = await findStoriesByUserMatchingText(database, selectedUser, search, env);
      }
    } else if (date) {
      selectedUserStories = await findStoriesByUserOnDate(database, selectedUser, date);
    } else {
      selectedUserStories = await findStoriesByUserInListing(database, 'news', selectedUser, currentUser, freshListing);
    }
  } else {
    // deal with situation where we're showing stories by someone
    // who're not on the team (only when we're searching for stories)
    if (search || date) {
      const nonMemberUserIDs = [];
      for (let story of stories) {
        for (let userID of story.user_ids) {
          if (!members.some(usr => usr.id === userID)) {
            if (!nonMemberUserIDs.includes(userID)) {
              nonMemberUserIDs.push(userID);
            }
          }
        }
      }
      const publicOnly = (currentUser.type === 'guest');
      if (nonMemberUserIDs.length > 0) {
        const nonmembers = await findUsers(database, nonMemberUserIDs);
        // add non-members
        if (visibleUsers) {
          visibleUsers = visibleUsers.concat(nonmembers);
        } else {
          visibleUsers = nonmembers;
        }
        render();
        const nonMemberStats = await findDailyActivitiesOfUsers(database, project, nonmembers, publicOnly);
        dailyActivities = { ...dailyActivities, ...nonMemberStats };
      }
    }
  }
  render();

  // when we're highlighting a story, make sure the story is actually there
  if (!date) {
    if (highlightStoryID) {
      const allStories = selectedUserStories;
      if (!allStories.some(s => s.id === highlightStoryID)) {
        try {
          let story = await findStory(database, highlightStoryID);
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
      access: getUserAccessLevel(project, currentUser) || 'read-only',
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
      if (selectedUserStories.length > 0) {
        return null;
      }
      if (!selectedUserStories) {
        return <LoadingAnimation />;
      } else {
        let phrase;
        if (date) {
          phrase = 'news-no-stories-on-date';
        } else if (roleIDs.length > 0) {
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
      if (visibleUsers.length > 0) {
        return null;
      }
      if (!visibleUsers) {
        return <LoadingAnimation />;
      } else {
        let phrase;
        if (date) {
          phrase = 'people-no-stories-on-date';
        } else if (roleIDs.length > 0) {
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

function findUsersWithRoles(users, roleIDs) {
  return users.filter((user) => {
    return user.role_ids.some(id => roleIDs.includes(id));
  });
}

function findUsersWithActivitiesOnDate(users, statistics, date) {
  return users.filter((user) => {
    const userStats = statistics[user.id];
    if (userStats) {
      return userStats.daily[date];
    }
  });
}

function findUsersWithStoriesWithTags(users, statistics, tags) {
  return users.filter((user) => {
    const userStats = statistics[user.id];
    if (userStats) {
      return userStats.daily?.some((counts, date) => {
        return tags.some(tag => counts[tag]);
      });
    }
  });
}

function findUsersWithStories(users, stories) {
  return users.filter((user) => {
    return stories.some(s => s.user_ids.includes(user.id));
  });
}
