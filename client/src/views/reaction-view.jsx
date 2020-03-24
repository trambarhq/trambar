import _ from 'lodash';
import React, { useState } from 'react';
import { useListener, useSaveBuffer } from 'relaks';
import { renderPlainText } from 'common/utils/plain-text.js';
import { renderMarkdown } from 'common/utils/markdown.js';
import { memoizeWeak } from 'common/utils/memoize.js';
import { getUserName, getGender, canAccessRepo } from 'common/objects/utils/user-utils.js';
import { getCommitNoteURL, getIssueNoteURL, getMergeRequestNoteURL } from 'common/objects/utils/repo-utils.js';

// widgets
import { ProfileImage } from '../widgets/profile-image.jsx';
import { MediaView } from '../views/media-view.jsx';
import { MediaDialogBox } from '../dialogs/media-dialog-box.jsx';
import { ReactionProgress } from '../widgets/reaction-progress.jsx';
import { Time } from '../widgets/time.jsx';
import { ReactionViewOptions } from '../views/reaction-view-options.jsx';

// custom hooks
import {
  useMarkdownResources,
} from '../hooks.js';

import './reaction-view.scss';

/**
 * Component for displaying a reaction to a story.
 */
export function ReactionView(props) {
  const { reaction, respondent, story, currentUser } = props;
  const { env, database, route, repo, highlighting, access } = props;
  const { t, p, g } = env.locale;
  const options = useSaveBuffer({
    original: {
      editReaction: !reaction.published,
      removeReaction: !!reaction.deleted,
      hideReaction: !reaction.public,
    }
  });
  const markdownResources = useMarkdownResources(reaction?.details?.resources);

  const handleOptionsChange = useListener((evt) => {
    const oldOptions = options.current;
    const newOptions = evt.options;
    options.update(newOptions);
    if (newOptions.editReaction && !oldOptions.editReaction) {
      publishReaction();
    }
    if (newOptions.removeReaction && !oldOptions.removeReaction) {
      removeReaction();
    }
    if (newOptions.hideReaction !== oldOptions.hideReaction) {
      hideReaction(newOptions.hideReaction);
    }
  });

  const classNames = [ 'reaction-view' ];
  if (highlighting) {
    classNames.push('highlighting');
  }
  return (
    <div className={classNames.join(' ')}>
      <div className="profile-image-column">
        {renderProfileImage()}
      </div>
      <div className="contents-column">
        <div className="text">
          {renderOptionButton()}
          {renderProgress()}
          {renderText()}
          {renderReferencedMediaDialog()}
        </div>
        {renderAudioPlayer()}
        {renderMedia()}
      </div>
    </div>
  );

  function renderProfileImage() {
    let url;
    if (respondent) {
      url = route.find('person-page', { selectedUserID: respondent.id });
    }
    const props = {
      user: respondent,
      size: 'small',
      href: url,
      env,
    };
    return <ProfileImage {...props} />;
  }

  function renderText() {
    const { text, markdown } = reaction.details;
    const name = getUserName(respondent, env);
    const gender = getGender(respondent);
    g(name, gender);
    if (reaction.published && reaction.ready !== false) {
      let url, target;
      switch (reaction.type) {
        case 'like':
          return (
            <span className="like">
              {t('reaction-$name-likes-this', name)}
            </span>
          );
        case 'comment':
          const textProps = {
            text: p(text),
            type: 'comment',
            onReference: markdownResources.onReference
          };
          if (markdown) {
            const paragraphs = renderMarkdown(textProps);
            // if there first paragraph is a P tag, turn it into a SPAN
            if (paragraphs[0] && paragraphs[0].type === 'p') {
              paragraphs[0] = <span key={0}>{paragraphs[0].props.children}</span>;
            }
            return (
              <span className="comment markdown" onClick={markdownResources.onClick}>
                {name}: {paragraphs}
              </span>
            );
          } else {
            return (
              <span className="comment">
                {name}: {renderPlainText(textProps)}
              </span>
            );
          }
        case 'vote':
          return (
            <span className="vote">
              {t('reaction-$name-cast-a-vote', name)}
            </span>
          );
        case 'task-completion':
          return (
            <span className="task-completion">
              {t('reaction-$name-completed-a-task', name)}
            </span>
          );
        case 'note':
          if (canAccessRepo(currentUser, repo)) {
            switch (story.type) {
              case 'branch':
              case 'push':
              case 'merge':
                url = getCommitNoteURL(repo, reaction);
                break;
              case 'issue':
                url = getIssueNoteURL(repo, reaction);
                break;
              case 'merge-request':
                url = getMergeRequestNoteURL(repo, reaction);
                break;
            }
            target = repo.type;
          }
          return (
            <a className="note" href={url} target={target}>
              {t(`reaction-$name-commented-on-${story.type}`, name)}
            </a>
          );
        case 'assignment':
          if (story.type === 'issue' || story.type === 'post') {
            if (canAccessRepo(currentUser, repo)) {
              url = getIssueNoteURL(repo, reaction);
              target = repo.type;
            }
            return (
              <a className="issue-assignment" href={url} target={target}>
                {t('reaction-$name-is-assigned-to-issue', name)}
              </a>
            );
          } else if (story.type === 'merge-request') {
            if (canAccessRepo(currentUser, repo)) {
              url = getMergeRequestNoteURL(repo, reaction);
              target = repo.type;
            }
            return (
              <a className="issue-assignment" href={url} target={target}>
                {t('reaction-$name-is-assigned-to-merge-request', name)}
              </a>
            );
          }
        case 'tracking':
          if (canAccessRepo(currentUser, repo)) {
            url = getIssueNoteURL(repo, reaction);
            target = repo.type;
          }
          return (
            <a className="issue-tracking" href={url} target={target}>
              {t('reaction-$name-added-story-to-issue-tracker', name)}
            </a>
          );
      }
    } else {
      let phrase;
      if (!reaction.published) {
        if (reaction.ptime) {
          // if it has a ptime, then it was published before
          phrase = 'reaction-$name-is-editing';
        } else {
          phrase = 'reaction-$name-is-writing';
        }
      } else {
        phrase = 'reaction-$name-is-sending';
      }
      return <span className="in-progress">{t(phrase, name)}</span>;
    }
  }

  function renderOptionButton() {
    if (!reaction.published) {
      return null;
    }
    const props = {
      access,
      currentUser,
      reaction,
      story,
      env,
      options: options.current,
      onChange: handleOptionsChange,
    };
    return <ReactionViewOptions {...props} />;
  }

  function renderProgress() {
    if (!reaction.published) {
      return null;
    }
    const props = { reaction, env };
    return <ReactionProgress {...props} />;
  }

  function renderAudioPlayer() {
    const { audioURL, onAudioEnd } = markdownResources;
    if (!audioURL) {
      return null;
    }
    const audioProps = {
      src: audioURL,
      autoPlay: true,
      controls: true,
      onEnded: onAudioEnd,
    };
    return <audio ref={audioPlayerRef} {...audioProps} />;
  }

  function renderMedia() {
    const remaining = markdownResources.unreferenced;
    if (remaining.length === 0) {
      return null;
    }
    const props = {
      resources: remaining,
      width: env.isWiderThan('double-col') ? 300 : 220,
      env,
    };
    return <div className="media"><MediaView {...props} /></div>;
  }

  function renderReferencedMediaDialog() {
    const { zoomed, referencedZoomable, selected, onClose } = markdownResources;
    const selectedIndex = referencedZoomable.indexOf(selected);
    const dialogProps = {
      show: zoomed && (selectedIndex !== -1),
      resources: referencedZoomable,
      selectedIndex,
      env,
      onClose,
    };
    return <MediaDialogBox {...dialogProps} />;
  }

  async function publishReaction() {
    const changes = {
      id: reaction.id,
      publish: true
    };
    const db = database.use();
    await db.saveOne({ table: 'reaction' }, changes);
  }

  async function removeReaction() {
    const db = database.use();
    return db.removeOne({ table: 'reaction' }, reaction);
  }

  async function hideReaction(hidden) {
    const changes = {
      id: reaction.id,
      public: !hidden,
    };
    const db = database.use();
    await db.saveOne({ table: 'reaction' }, changes);
  }
}

const defaultOptions = {
  hideReaction: false,
  editReaction: false,
  removeReaction: false,
};

const getZoomableResources = memoizeWeak(null, function(resources) {
  return resources.filter((res) => {
    switch (res.type) {
      case 'image':
      case 'video':
        return true;
    }
  })
});
