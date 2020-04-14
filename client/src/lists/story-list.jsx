import React, { useState, useMemo } from 'react';
import { useProgress } from 'relaks';
import { findStoryAuthors, findReactionAuthors, findBookmarkRecipients } from 'common/objects/finders/user-finder.js';
import { findProjectRepos } from 'common/objects/finders/repo-finder.js';
import { findBookmarksByUser } from 'common/objects/finders/bookmark-finder.js';
import { findReactionsToStories } from 'common/objects/finders/reaction-finder.js';
import { findByIds, orderBy, uniq } from 'common/utils/array-utils.js';

// widgets
import { SmartList } from 'common/widgets/smart-list.jsx';
import { StoryView } from '../views/story-view.jsx';
import { StoryEditor } from '../editors/story-editor.jsx';
import { NewItemsAlert } from '../widgets/new-items-alert.jsx';
import { ErrorBoundary } from 'common/widgets/error-boundary.jsx';

import './story-list.scss';

export async function StoryList(props) {
  const { database, route, payloads, env } = props;
  const { stories, draftStories, pendingStories } = props;
  const { currentUser, project } = props;
  const { access, acceptNewStory } = props;
  const { highlightStoryID, scrollToStoryID, highlightReactionID, scrollToReactionID } = props;
  const { t } = env.locale;
  const allStories = useMemo(() => {
    let list = sortStories(stories, pendingStories);
    if (acceptNewStory) {
      list = attachDrafts(list, draftStories, currentUser);
    }
    return list;
  }, [ stories, pendingStories, draftStories, currentUser, acceptNewStory ]);
  const [ hiddenStoryIDs, setHiddenStoryIDs ] = useState([]);
  const [ show ] = useProgress();

  const handleStoryIdentity = (evt) => {
    if (evt.alternative && evt.item && evt.item.id >= 1) {
      // look for temporary id
      const location = { table: 'story' };
      const tempID = database.findTemporaryID(location, evt.item.id);
      return getAnchor(tempID);
    } else {
      if (acceptNewStory) {
        // use a fixed id for the first editor, so we don't lose focus
        // when the new story acquires an id after being saved automatically
        if (evt.currentIndex === 0) {
          return getAnchor('top');
        }
      }
      return getAnchor(evt.item.id);
    }
  };
  const handleStoryRender = (evt) => {
    return renderStory(evt.item, evt.needed, evt.previousHeight, evt.estimatedHeight, evt.currentIndex);
  };
  const handleStoryAnchorChange = (evt) => {
    reanchorAtStory((evt.item) ? evt.item.id : undefined);
  };
  const handleStoryBeforeAnchor = (evt) => {
    setHiddenStoryIDs(evt.items.map(s => s.id));
  };
  const handleNewStoryAlertClick = (evt) => {
    setHiddenStoryIDs([]);
  };
  const handleStoryBump = (evt) => {
    reanchorAtStory(null);
  };
  const handleStoryEdit = (evt) => {
    if (evt.target.props.story.id === highlightStoryID) {
      reanchorAtStory(highlightStoryID, highlightReactionID);
    }
  };

  function reanchorAtStory(scrollToStoryID, scrollToReactionID) {
    route.replace({
      scrollToStoryID,
      highlightStoryID: undefined,
      scrollToReactionID,
      highlightReactionID: undefined,
    });
  }

  function getAnchor(storyID) {
    return (storyID) ? `story-${storyID}` : undefined
  }

  render();
  // load repos first, so "add to issue tracker" option doesn't pop in
  // suddenly in triple-column mode
  const repos = await findProjectRepos(database, project);
  render();
  const authors = await findStoryAuthors(database, allStories);
  render();
  const reactions = await findReactionsToStories(database, allStories, currentUser)
  render();
  const respondents = await findReactionAuthors(database, reactions);
  render();
  const bookmarks = await findBookmarksByUser(database, currentUser, allStories);
  render();
  const recipients = await findBookmarkRecipients(database, bookmarks);
  render();

  function render() {
    const smartListProps = {
      items: allStories,
      offset: 20,
      behind: 4,
      ahead: 8,
      anchor: getAnchor(scrollToStoryID || highlightStoryID),

      onIdentity: handleStoryIdentity,
      onRender: handleStoryRender,
      onAnchorChange: handleStoryAnchorChange,
      onBeforeAnchor: handleStoryBeforeAnchor,
    };
    show(
      <div className="story-list">
        <SmartList {...smartListProps} />
        {renderNewStoryAlert()}
      </div>
    );
  }

  function renderNewStoryAlert() {
    let url;
    const highlightStoryID = hiddenStoryIDs[0];
    if (highlightStoryID) {
      url = route.find(route.name, { highlightStoryID });
    }
    const props = { url, onClick: handleNewStoryAlertClick };
    return (
      <NewItemsAlert {...props}>
        {t('alert-$count-new-stories', hiddenStoryIDs.length)}
      </NewItemsAlert>
    );
  }

  function renderStory(story, needed, previousHeight, estimatedHeight, index) {
    // see if it's being editted
    let isDraft = false;
    let highlighting = false;
    if (story) {
      if (access === 'read-write') {
        if (!story.published) {
          isDraft = true;
        } else {
          let tempCopy = draftStories?.find(s => s.published_version_id === story.id);
          if (tempCopy) {
            // edit the temporary copy
            story = tempCopy;
            isDraft = true;
          }
        }
      }
      highlighting = (story.id === highlightStoryID);
    } else {
      isDraft = true;
    }
    if (isDraft) {
      const editorProps = {
        highlighting,
        story,
        authors: findDraftAuthors(currentUser, authors, story),
        bookmarks: findBookmarks(bookmarks, story, currentUser),
        recipients: findRecipients(recipients, bookmarks, story, currentUser),
        repos,
        isStationary: (index === 0),
        currentUser,
        database,
        payloads,
        route,
        env,
      };
      return (
        <ErrorBoundary env={env}>
          <StoryEditor {...editorProps}/>
        </ErrorBoundary>
      );
    } else {
      if (needed) {
        const pending = !stories.includes(story);
        const storyProps = {
          highlighting,
          pending,
          access,
          highlightReactionID,
          scrollToReactionID,
          story,
          reactions: findReactions(reactions, story),
          authors: findAuthors(authors, story),
          respondents: findRespondents(respondents, reactions),
          bookmarks: findBookmarks(bookmarks, story, currentUser),
          recipients: findRecipients(recipients, bookmarks, story, currentUser),
          project,
          repos,
          currentUser,
          database,
          payloads,
          route,
          env,
          onBump: handleStoryBump,
          onEdit: handleStoryEdit,
        };
        return (
          <ErrorBoundary env={env}>
            <StoryView {...storyProps} />
          </ErrorBoundary>
        );
      } else {
        const height = previousHeight || estimatedHeight || 100;
        return <div className="story-view" style={{ height }} />
      }
    }
  }
}

function sortStories(stories, pendingStories) {
  if (pendingStories?.length > 0) {
    stories = stories.slice();
    for (let story of pendingStories) {
      if (!story.published_version_id) {
        stories.push(story);
      } else {
        // copy pending changes into story
        const index = stories.findIndex(s => s.id === story.published_version_id);
        if (index !== -1) {
          stories[index] = {
            ...stories[index],
            details: story.details,
            user_ids: story.user_ids,
          };
        }
      }
    }
  }
  return orderBy(stories, [ getStoryTime, 'id' ], [ 'desc', 'desc' ]);
}

function attachDrafts(stories, drafts, currentUser) {
  if (!drafts) {
    return stories;
  }
  // add new drafts (drafts includes published stories being edited)
  let newDrafts = drafts.filter((story) => {
    return !story.published_version_id && !story.published;
  });

  // current user's own drafts are listed first
  const own = s => story.user_ids[0] === currentUser.id;
  newDrafts = orderBy(newDrafts, [ own, 'id' ], [ 'desc', 'desc' ]);

  // see if the current user has a draft
  const currentUserDraft = newDrafts.find(s => story.user_ids[0] === currentUser.id);
  if (!currentUserDraft) {
    // add a blank
    newDrafts.unshift(null);
  }
  return newDrafts.concat(stories);
}

function getStoryTime(story) {
  return story.btime || story.ptime;
}

function findReactions(reactions, story) {
  if (story && reactions) {
    return reactions.filter(r => r.story_id === story.id);
  }
}

 function findAuthors(users, story) {
  if (story) {
    return findByIds(users, story.user_ids);
  }
}

function findDraftAuthors(currentUser, users, story) {
  if (story && users) {
    return findAuthors(users, story);
  }
  return [ currentUser ];
}

function findRespondents(users, reactions) {
  if (users && reactions) {
    const respondentIDs = uniq(reactions.map(r => r.user_id));
    return findByIds(users, respondentIDs);
  }
}

 function findBookmarks(bookmarks, story, currentUser) {
  if (story && bookmarks) {
    const storyID = story.published_version_id || story.id;
    return bookmarks.filter((bookmark) => {
      if (bookmark.story_id === storyID) {
        // omit those hidden by the current user
        return !(bookmark.hidden && bookmark.target_user_id === currentUser.id);
      }
    });
  }
}

function findRecipients(recipients, bookmarks, story, currentUser) {
  if (recipients) {
    const storyBookmarks = findBookmarks(bookmarks, story, currentUser);
    if (storyBookmarks) {
      return recipients.filter((recipient) => {
        return storyBookmarks.some(bm => bm.target_user_id === recipient.id);
      });
    }
  }
}

StoryList.defaultProps = {
  acceptNewStory: false,
};
