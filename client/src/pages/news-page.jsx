import _ from 'lodash';
import Moment from 'moment';
import React from 'react';
import { useProgress } from 'relaks';
import { findUser } from 'common/objects/finders/user-finder.js';
import { findCurrentProject } from 'common/objects/finders/project-finder.js';
import { getUserAccessLevel } from 'common/objects/utils/project-utils.js';
import { removeTags, findTags } from 'common/utils/tag-scanner.js';
import {
  findStory,
  findStoriesWithTags,
  findStoriesMatchingText,
  findStoriesOnDate,
  findStoriesWithRolesInListing,
  findStoriesInListing,
  findDraftStories,
  findUnlistedStories,
} from 'common/objects/finders/story-finder.js';

// widgets
import { PageContainer } from '../widgets/page-container.jsx';
import { StoryList } from '../lists/story-list.jsx';
import { LoadingAnimation } from '../widgets/loading-animation.jsx';
import { EmptyMessage } from '../widgets/empty-message.jsx';

import './news-page.scss';

export default async function NewsPage(props) {
  const { database, route, payloads, env, search, roleIDs, date } = props;
  const { highlightStoryID, scrollToStoryID, highlightReactionID, scrollToReactionID } = props;
  const [ show ] = useProgress();
  let filtering = false;
  let tags;
  if (search) {
    if (!removeTags(search)) {
      tags = findTags(search);
    }
    filtering = true;
  }
  if (date || roleIDs.length > 0) {
    filtering = true;
  }

  render();
  const currentUserID = await database.start();
  const currentUser = await findUser(database, currentUserID);
  const project = await findCurrentProject(database);
  render();
  let stories, draftStories, pendingStories;
  if (tags) {
    stories = await findStoriesWithTags(database, tags, currentUser);
  } else if (search) {
    stories = await findStoriesMatchingText(database, search, env, currentUser);
  } else if (date) {
    stories = await findStoriesOnDate(database, date, currentUser);
  } else if (roleIDs.length > 0) {
    stories = await findStoriesWithRolesInListing(database, 'news', roleIDs, currentUser);
  } else {
    stories = await findStoriesInListing(database, 'news', currentUser);
    render();
    draftStories = await findDraftStories(database, currentUser);
    render();
    const limit = env.getRelativeDate(-1, 'date');
    pendingStories = await findUnlistedStories(database, currentUser, stories, limit);
  }
  render();

  // when we're highlighting a story, make sure the story is actually there
  if (!date) {
    const storyID = highlightStoryID;
    if (storyID) {
      const allStories = _.concat(stories, draftStories, pendingStories);
      if (!_.find(allStories, { id: storyID })) {
        try {
          const story = await findStory(database, storyID);
          await redirectToStory(route.params.schema, story);
        } catch (err) {
        }
      }
    }
  }

  function render() {
    show(
      <PageContainer className="news-page">
        {renderList()}
        {renderEmptyMessage()}
      </PageContainer>
    );
  }

  function renderList() {
    // don't render when we haven't done loading
    if (!stories) {
      return null;
    }
    const access = getUserAccessLevel(project, currentUser) || 'read-only';
    const listProps = {
      access,
      acceptNewStory: !filtering && access === 'read-write',
      highlightStoryID,
      scrollToStoryID,
      highlightReactionID,
      scrollToReactionID,
      stories,
      draftStories,
      pendingStories,
      currentUser,
      project,
      database,
      payloads,
      route,
      env,
    };
    return <StoryList {...listProps} />
  }

  function renderEmptyMessage() {
    if (stories.length > 0) {
      return null;
    }
    if (!stories) {
      // stories is undefined when they're being loaded
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
  }

  function redirectToStory(schema, story) {
    let redirect = true;
    if (story.ptime && story.published && story.ready !== false) {
      // don't redirect if the story is very recent
      const elapsed = Moment() - Moment(story.ptime);
      if (elapsed < 60 * 1000) {
        return;
      }
    }
    if (redirect) {
      const params = {
        schema: schema,
        date: Moment(story.ptime).format('YYYY-MM-DD'),
        highlightStoryID: story.id,
      };
      return route.replace(route.name, params);
    }
  }
}
