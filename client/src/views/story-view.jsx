import React, { useState, useRef, useEffect } from 'react';
import { useListener, useErrorCatcher } from 'relaks';
import { FocusManager }  from 'common/utils/focus-manager.js';
import { addLike, removeReaction, saveReaction, startComment } from 'common/objects/savers/reaction-saver.js';
import { findRobot, isSaved } from 'common/objects/utils/story-utils.js';
import { findLinkByRelative } from 'common/objects/utils/external-data-utils.js';
import { uniq } from 'common/utils/array-utils.js';

// widgets
import { ProfileImage } from '../widgets/profile-image.jsx';
import { AuthorNames } from '../widgets/author-names.jsx';
import { StoryProgress } from '../widgets/story-progress.jsx';
import { StoryEmblem } from '../widgets/story-emblem.jsx';
import { Scrollable } from '../widgets/scrollable.jsx';
import { ReactionToolbar } from '../widgets/reaction-toolbar.jsx';
import { ReactionList } from '../lists/reaction-list.jsx';
import { HeaderButton } from '../widgets/header-button.jsx';
import { StoryContents } from '../views/story-contents.jsx';
import { StoryViewOptions } from '../views/story-view-options.jsx';
import { CornerPopUp } from '../widgets/corner-pop-up.jsx';

import './story-view.scss';

/**
 * Component for rendering a story. It provides the basic frame, leaving the
 * task of rendering the actual story contents to StoryContents.
 */
export function StoryView(props) {
  const { story, authors, reactions, respondents, bookmarks, recipients, project, repos, currentUser } = props;
  const { access, highlighting, pending } = props;
  const { highlightReactionID, scrollToReactionID } = props;
  const { database, route, env, payloads } = props;
  const { onBump, onEdit } = props;
  const { t } = env.locale;
  const [ showingComments, showComments ] = useState(false);
  const [ isTall, setIsTall ] = useState(false);
  const [ openMenu, setOpenMenu ] = useState('');
  const [ error, run ] = useErrorCatcher(true);
  const reactionContainerRef = useRef();
  const robot = findRobot(story);

  const handleExpansionClick = useListener((evt) => {
    showComments(true);
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
  const handleAction = useListener((evt) => {
    run(async () => {
      switch (evt.action) {
        case 'like-add':
          await addLike(database, story, currentUser);
          break;
         case 'like-remove':
          await removeReaction(database, evt.like);
          break;
         case 'reaction-add':
          showComments(true);
          const existing = reactions.some(r => r.user_id === currentUser.id && !r.published);
          if (!existing) {
            await startComment(database, story, currentUser);
          }
          FocusManager.focus({
            type: 'ReactionEditor',
            story_id: story.id,
            user_id: currentUser.id,
          });
          break;
         case 'reaction-expand':
          showComments(true);
          break;
      }
    });
  });

  useEffect(() => {
    // Check the height of the cell containing the reaction scroll box. If it's
    // taller than the scroll box's max height, use absolute positioning
    // instead so there's no gap at the bottom.
    if (env.isWiderThan('double-col')) {
      const reactionContainer = reactionContainerRef.current;
      if (reactionContainer) {
        const cell = reactionContainer.parentNode;
        if (!reactionContainerMaxHeight) {
          // calculate this once
          const style = getComputedStyle(reactionContainer);
          reactionContainerMaxHeight = parseInt(style.maxHeight);
        }
        const isTallAfter = (cell.offsetHeight > reactionContainerMaxHeight);
        if (isTall !== isTallAfter) {
          setIsTall(isTallAfter);
        }
      }
    }
  }, []);

  const classNames = [ 'story-view' ];
  if (highlighting) {
    classNames.push('highlighting');
  }
  if (env.isWiderThan('triple-col')) {
    return renderTripleColumn();
  } else if (env.isWiderThan('double-col')) {
    return renderDoubleColumn();
  } else {
    return renderSingleColumn();
  }

  function renderSingleColumn() {
    let reactionToolbar = renderReactionToolbar();
    let reactionLink = renderReactionLink();
    let needPadding = false;
    if (reactionToolbar || reactionLink) {
      needPadding = true;
      if (!reactionToolbar) {
        reactionToolbar = '\u00a0';
      }
    }
    return (
      <div className={classNames.join(' ')}>
        <div className="header">
          <div className="column-1 padded">
            {renderProfileImage()}
            {renderAuthorNames()}
            {renderPopUpMenu('main')}
          </div>
        </div>
        <div className="body">
          <div className="column-1 padded">
            {renderProgress()}
            {renderEmblem()}
            {renderContents()}
          </div>
        </div>
        <div className="header">
          <div className={'column-2' + (needPadding ? ' padded' : '')}>
            {reactionToolbar}
            {reactionLink}
          </div>
        </div>
        <div className="body">
          <div className="column-2">
            {renderReactions()}
          </div>
        </div>
      </div>
    );
  }

  function renderDoubleColumn() {
    return (
      <div className={classNames.join(' ')}>
        <div className="header">
          <div className="column-1 padded">
            {renderProfileImage()}
            {renderAuthorNames()}
            {renderPopUpMenu('main')}
          </div>
          <div className="column-2 padded">
            {renderReactionToolbar()}
          </div>
        </div>
        <div className="body">
          <div className="column-1 padded">
            {renderProgress()}
            {renderEmblem()}
            {renderContents()}
          </div>
          <div className="column-2">
            {renderReactions()}
          </div>
        </div>
      </div>
    );
  }

  function renderTripleColumn() {
    return (
      <div className={classNames.join(' ')}>
        <div className="header">
          <div className="column-1 padded">
            {renderProfileImage()}
            {renderAuthorNames()}
          </div>
          <div className="column-2 padded">
            {renderReactionToolbar()}
          </div>
          <div className="column-3 padded">
            <HeaderButton iconClass="fas fa-chevron-circle-right" label={t('story-options')} disabled />
          </div>
        </div>
        <div className="body">
          <div className="column-1 padded">
            {renderProgress()}
            {renderEmblem()}
            {renderContents()}
          </div>
          <div className="column-2">
            {renderReactions()}
          </div>
          <div className="column-3 padded">
            {renderOptions()}
          </div>
        </div>
      </div>
    );
  }

  function renderProfileImage() {
    const leadAuthor = authors?.[0];
    let url;
    if (leadAuthor) {
      url = route.find('person-page', { selectedUserID: leadAuthor.id });
    }
    const props = {
      user: leadAuthor,
      size: 'medium',
      href: url,
      robot,
      env,
    };
    return <ProfileImage {...props} />;
  }

  function renderAuthorNames() {
    const props = {
      authors,
      robot,
      env
    };
    return <AuthorNames {...props} />;
  }

  /**
   * Render link and comment buttons on title bar
   *
   * @return {ReactElement|null}
   */
  function renderReactionToolbar() {
    if (access !== 'read-comment' && access !== 'read-write') {
      return null;
    }
    const props = {
      access,
      currentUser,
      reactions,
      respondents,
      env,
      disabled: !isSaved(story),
      onAction: handleAction,
    };
    return <ReactionToolbar {...props} />;
  }

  function renderReactionLink() {
    const count = reactions?.length || 0;
    if (count === 0) {
      return null;
    }
    if (showingComments) {
      return '\u00a0';
    }
    return (
      <span className="reaction-link" onClick={handleExpansionClick}>
        {t('story-$count-reactions', count)}
      </span>
    );
  }

  function renderProgress() {
    let uploadStatus;
    if (story.ready === false) {
      uploadStatus = payloads.inquire(story);
    }
    const props = {
      status: uploadStatus,
      story,
      pending,
      env,
    };
    return <StoryProgress {...props} />;
  }

  function renderEmblem() {
    const props = { story };
    return <StoryEmblem {...props} />
  }

  function renderContents() {
    const props = {
      access,
      story,
      authors,
      currentUser,
      reactions,
      project,
      repo: findRepo(repos, story),
      database,
      env,
    };
    return <StoryContents {...props} />;
  }

  function renderReactions() {
    if (!(reactions?.length > 0)) {
      return null;
    }
    if (!env.isWiderThan('double-col')) {
      if (!showingComments) {
        return null;
      }
    }
    const listProps = {
      access,
      story,
      reactions,
      respondents,
      repo: findRepo(repos, story),
      currentUser,
      database,
      payloads,
      route,
      env,
      highlightReactionID,
      scrollToReactionID,
    };
    let classNames = [ 'scrollable' ];
    if (isTall && env.isWiderThan('double-col')) {
      classNames.push('abs');
    }
    return (
      <div ref={reactionContainerRef} className={classNames.join(' ')}>
        <ReactionList {...listProps} />
      </div>
    );
  }

  function renderPopUpMenu(section) {
    const props = {
      name: section,
      open: (openMenu === section),
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
      access,
      story,
      reactions,
      repos,
      bookmarks,
      recipients,
      currentUser,
      database,
      route,
      env,
      onComplete: handleOptionComplete,
    };
    return <StoryViewOptions {...props} />;
  }

  async function addLike() {
    const like = {
      type: 'like',
      story_id: story.id,
      user_id: currentUser.id,
      details: {},
      published: true,
      public: true,
    };
    await saveReaction(database, like);
  }

  async function addComment() {
    const existing = reactions?.some(r => r.user_id === currentUser.id && !r.published);
    if (!existing) {
      const comment = {
        type: 'comment',
        story_id: story.id,
        user_id: currentUser.id,
        details: {},
        published: false,
        public: true,
      };
      await saveReaction(database, comment);
    }
    FocusManager.focus({
      type: 'ReactionEditor',
      story_id: story.id,
      user_id: currentUser.id,
    });
  }
}

let reactionContainerMaxHeight;

const defaultOptions = {
  issueDetails: null,
  hideStory: false,
  editStory: false,
  removeStory: false,
  bumpStory: false,
  bookmarkRecipients: [],
  keepBookmark: undefined,
};

function findRepo(repos, story) {
  return repos?.find(r => findLinkByRelative(story, r, 'project'));
}

function countRespondents(reactions) {
  const userIds = uniq(reactions.map(r => r.user_id));
  return userIds.length;
}
