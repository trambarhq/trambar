import React, { useState } from 'react';
import { useProgress } from 'relaks';
import { findStoryAuthors, findReactionAuthors, findBookmarkSenders, findBookmarkRecipients } from 'common/objects/finders/user-finder.js';
import { findStoriesOfBookmarks, findDraftStories } from 'common/objects/finders/story-finder.js';
import { findProjectRepos } from 'common/objects/finders/repo-finder.js';
import { findBookmarksByUser } from 'common/objects/finders/bookmark-finder.js';
import { findReactionsToStories } from 'common/objects/finders/reaction-finder.js';

// widgets
import { SmartList } from 'common/widgets/smart-list.jsx';
import { BookmarkView } from '../views/bookmark-view.jsx';
import { StoryView } from '../views/story-view.jsx';
import { StoryEditor } from '../editors/story-editor.jsx';
import { NewItemsAlert } from '../widgets/new-items-alert.jsx';
import { ErrorBoundary } from 'common/widgets/error-boundary.jsx';

import './bookmark-list.scss';

export async function BookmarkList(props) {
  const { database, route, payloads, env } = props;
  const { access, bookmarks, currentUser, project } = props;
  const { highlightStoryID, scrollToStoryID } = props;
  const { t } = env.locale;
  const [ hiddenStoryIDs, setHiddenStoryIDs ] = useState();
  const [ show ] = useProgress();
  const currentUserArray = useMemo(() => {
    return [ currentUser ];
  }, [ currentUser ]);

  const handleBookmarkIdentity = (evt) => {
    return getAnchor(evt.item.story_id);
  };
  const handleBookmarkRender = (evt) => {
    return renderBookmark(evt.item, evt.needed, evt.previousHeight, evt.estimatedHeight);
  };
  const handleBookmarkAnchorChange = (evt) => {
    const scrollToStoryID  = evt.item?.story_id;
    route.replace({ scrollToStoryID, highlightStoryID: undefined });
  };
  const handleBookmarkBeforeAnchor = (evt) => {
    setHiddenStoryIDs(evt.items.map(bm => bm.story_id));
  };
  const handleNewBookmarkAlertClick = (evt) => {
    setHiddenStoryIDs([]);
  };
  const handleStoryEdit = (evt) => {
    const scrollToStoryID = evt.target.props.story.id;
    if (scrollToStoryID === highlightStoryID) {
      route.replace({ scrollToStoryID, highlightStoryID: undefined });
    }
  };

  render();
  const repos = await findProjectRepos(database, project);
  const stories = await findStoriesOfBookmarks(database, bookmarks, currentUser)
  render();
  const draftStories = await findDraftStories(database, currentUser)
  render();
  const allStories = [ ...draftStories, ...stories ];
  const authors = await findStoryAuthors(database, allStories);
  render();
  const senders = await findBookmarkSenders(database, bookmarks);
  render();
  const reactions = await findReactionsToStories(database, allStories, currentUser);
  render();
  const respondents = await findReactionAuthors(database, reactions);
  render();
  const bookmarksSent = await findBookmarksByUser(database, currentUser);
  render();
  const recipients = await findBookmarkRecipients(database, bookmarksSent);
  render();

  function render() {
    const smartListProps = {
      items: sortBookmarks(bookmarks, stories),
      behind: 4,
      ahead: 8,
      anchor: getAnchor(highlightStoryID || scrollToStoryID),
      offset: 20,

      onIdentity: handleBookmarkIdentity,
      onRender: handleBookmarkRender,
      onAnchorChange: handleBookmarkAnchorChange,
      onBeforeAnchor: handleBookmarkBeforeAnchor,
    };
    show(
      <div className="bookmark-list">
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
    const props = { url, onClick: handleNewBookmarkAlertClick };
    return (
      <NewItemsAlert {...props}>
        {t('alert-$count-new-bookmarks', hiddenStoryIDs.length)}
      </NewItemsAlert>
    );
  }

  function renderBookmark(bookmark, needed, previousHeight, estimatedHeight) {
    let story = stories.find(s => s.id === bookmark.story_id);

    // see if it's being editted
    let editing = false;
    let highlighting = false;
    if (story) {
      if (access === 'read-write') {
        if (!story.published) {
          editing = true;
        } else {
          let tempCopy = draftStories.find(s => s.published_version_id === story.id);
          if (tempCopy) {
            // edit the temporary copy
            story = tempCopy;
            editing = true;
          }
        }
      }
      highlighting = (story.id === highlightStoryID);
    }
    let bookmarkProps;
    if (editing || needed) {
      bookmarkProps = {
        highlighting,
        bookmark,
        senders: findByIds(senders, bookmark.user_ids),
        currentUser,
        database,
        route,
        env,
      };
    }
    if (editing) {
      const editorProps = {
        story,
        authors: (story) ? findByIds(authors, story.user_ids) : currentUserArray,
        bookmarks: findBookmarks(bookmarksSent, story),
        recipients: findRecipients(recipients, bookmarksSent),
        currentUser,
        database,
        payloads,
        route,
        env,
      };
      return (
        <ErrorBoundary env={env}>
          <BookmarkView {...bookmarkProps}>
            <StoryEditor {...editorProps}/>
          </BookmarkView>
        </ErrorBoundary>
      );
    } else {
      if (needed) {
        const storyProps = {
          access,
          story,
          bookmark,
          reactions: findReactions(reactions, story),
          authors: findByIds(authors, story.user_ids),
          respondents: findRespondents(respondents, reactions, story),
          bookmarks: findBookmarks(bookmarksSent, story),
          recipients: findRecipients(recipients, bookmarksSent),
          repos,
          currentUser,
          database,
          payloads,
          route,
          env,
          onEdit: handleStoryEdit,
        };
        return (
          <ErrorBoundary env={env}>
            <BookmarkView {...bookmarkProps}>
              <StoryView {...storyProps} />
            </BookmarkView>
          </ErrorBoundary>
        );
      } else {
        const height = previousHeight || estimatedHeight || 100;
        return <div className="bookmark-view" style={{ height }} />
      }
    }
  }

  function getAnchor(storyID) {
    return (storyID) ? `story-${storyID}` : undefined;
  }
}

function sortBookmarks(bookmarks, stories) {
  const withStory = bookmarks.filter((bookmark) => {
    return stories?.some(s => s.id === bookmark.story_id);
  });
  return orderBy(withStory, [ 'id' ], [ 'desc' ]);
}

function findReactions(reactions, story) {
  if (story) {
    return reactions.filter({ story_id: story.id });
  }
}

function findRespondents(users, reactions, story) {
  const storyReactions = findReactions(reactions, story);
  if (storyReactions && users) {
    return users.filter((user) => {
      return storyReactions.some(r => r.user_id === user.id);
    });
  }
}

function findBookmarks(bookmarks, story) {
  if (story) {
    const storyID = story.published_version_id || story.id;
    return bookmarks.filter(bm => bm.story_id === storyID);
  }
}

function findRecipients(recipients, bookmarks) {
  if (recipients && bookmarks) {
    return recipients.filter((recipient) => {
      return bookmarks.some(bm => bm.target_user_id === recipient.id);
    });
  }
}
