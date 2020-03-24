import _ from 'lodash';
import React, { useState, useMemo } from 'react';
import { useListener, useErrorCatcher } from 'relaks';
import { syncBookmarks } from 'common/objects/savers/bookmark-saver.js';
import { extractIssueDetails } from 'common/objects/utils/issue-utils.js';
import { hideStory, unpublishStory, removeStory, bumpStory } from 'common/objects/savers/story-saver.js';
import { createTask } from 'common/objects/savers/task-saver.js';
import {
  canCreateBookmark,
  canSendBookmarks,
  canAddIssue,
  canHideStory,
  canEditStory,
  canRemoveStory,
  canBumpStory,
} from 'common/objects/utils/user-utils.js';

// widgets
import { OptionButton } from '../widgets/option-button.jsx';
import { UserSelectionDialogBox } from '../dialogs/user-selection-dialog-box.jsx';
import { IssueDialogBox } from '../dialogs/issue-dialog-box.jsx';

// custom hooks
import {
  useDraftBuffer,
} from '../hooks.js';

import './story-view-options.scss';

/**
 * Component that handles the changing of a story's options. It's used for
 * both rendering the options when they appear in a pop-up menu and when they
 * appear within the story view when there's room for the third column.
 */
export function StoryViewOptions(props) {
  const { story, reactions, bookmarks, recipients, repos, currentUser } = props;
  const { database, route, env, access, bookmarkExpected, onComplete } = props;
  const { t } = env.locale;
  const [ selectingRecipients, selectRecipients ] = useState(false);
  const [ enteringIssueDetails, enterIssueDetails ] = useState(false);
  const originalOptions = useMemo(() => {
    return {
      recipients,
      hidden: !story.public,
      editable: !story.published,
      removed: story.deleted,
      bumped: false,
      issue: extractIssueDetails(story, repos),
    };
  }, [ story, bookmarks, repos ]);
  const options = useDraftBuffer({
    original: originalOptions
  });
  const [ error, run ] = useErrorCatcher(true);

  const handleAddBookmarkClick = useListener((evt) => {
    run(async () => {
      const list = options.get('recipients', []);
      const self = _.find(list, { id: currentUser.id });
      const newList = (self) ? _.without(list, self) : _.concat(list, currentUser);
      options.set('recipients', newList);
      done();
      await syncBookmarks(database, bookmarks, story, currentUser, newList);
    });
  });
  const handleHideClick = useListener((evt) => {
    run(async () => {
      const hidding = !options.get('hidden');
      options.set('hidden', hidding);
      done();
      await hideStory(database, story, hidding);
    });
  });
  const handleEditClick = useListener((evt) => {
    run(async () => {
      if (!options.get('editable')) {
        options.set('editable', true);
        done();
        await unpublishStory(database, story);
      }
    });
  });
  const handleRemoveClick = useListener((evt) => {
    run(async () => {
      if (!options.get('removed')) {
        options.set('removed', true);
        done();
        await removeStory(database, story);
      }
    });
  });
  const handleBumpClick = useListener((evt) => {
    run(async () => {
      if (!options.get('removed')) {
        options.set('bumped', true);
        done();
        await bumpStory(database, story);
      }
    });
  });
  const handleSendBookmarkClick = useListener((evt) => {
    selectRecipients(true);
  });
  const handleRecipientsSelect = useListener((evt) => {
    run(async () => {
      const { selection } = evt;
      options.set('recipients', selection);
      selectRecipients(false);
      done();
      await syncBookmarks(database, bookmarks, story, currentUser, selection);
    });
  });
  const handleRecipientsCancel = useListener((evt) => {
    selectRecipients(false);
  });
  const handleAddIssueClick = useListener((evt) => {
    enterIssueDetails(true);
  });
  const handleIssueConfirm = useListener((evt) => {
    run(async () => {
      const { issue } = evt;
      options.set('issue', issue);
      enterIssueDetails(false);
      done();
      await createTask(database, 'export-issue', currentUser, {
        story_id: story.id,
        ...evt.issue
      });
    });
  });
  const handleIssueCancel = useListener((evt) => {
    enterIssueDetails(false);
  });

  function done() {
    if (onComplete) {
      onComplete({});
    }
  }

  return (
    <div className="story-view-options">
      {renderButtons('main')}
    </div>
  );

  function renderButtons(section) {
    if (section === 'main') {
      const recipients = options.get('recipients');
      const self = _.find(recipients, { id: currentUser.id });
      const bookmarkProps = {
         label: t(bookmarkExpected ? 'option-keep-bookmark' : 'option-add-bookmark'),
         selected: !!self,
         hidden: !bookmarkExpected && !canCreateBookmark(currentUser, story, access),
         onClick: handleAddBookmarkClick,
      };
      const otherRecipients = _.reject(recipients, { id: currentUser.id });
      const sendBookmarkProps = {
        label: _.isEmpty(otherRecipients)
          ? t('option-send-bookmarks')
          : t('option-send-bookmarks-to-$count-users', otherRecipients.length),
        hidden: !canSendBookmarks(currentUser, story, access),
        selected: (otherRecipients.length > 0) || selectingRecipients,
        onClick: handleSendBookmarkClick,
      };
      const addIssueProps = {
        label: t('option-add-issue'),
        hidden: !canAddIssue(currentUser, story, repos, access),
        selected: !!options.get('issue') || enteringIssueDetails,
        onClick: handleAddIssueClick,
      };
      const hideProps = {
        label: t('option-hide-story'),
        hidden: !canHideStory(currentUser, story, access),
        selected: options.get('hidden'),
        onClick: handleHideClick,
      };
      const editProps = {
        label: t('option-edit-post'),
        hidden: !canEditStory(currentUser, story, access),
        selected: options.get('editable'),
        onClick: handleEditClick,
      };
      const removeProps = {
        label: t('option-remove-story'),
        hidden: !canRemoveStory(currentUser, story, access),
        selected: options.get('removed'),
        onClick: handleRemoveClick,
      };
      const bumpProps = {
        label: t('option-bump-story'),
        hidden: !canBumpStory(currentUser, story, access),
        selected: options.get('bumped'),
        onClick: handleBumpClick,
      };
      return (
        <div className={section}>
          <OptionButton {...bookmarkProps} />
          <OptionButton {...sendBookmarkProps} />
          <OptionButton {...addIssueProps} />
          <OptionButton {...hideProps} />
          <OptionButton {...editProps} />
          <OptionButton {...removeProps} />
          <OptionButton {...bumpProps} />
          {renderRecipientDialogBox()}
          {renderIssueDialogBox()}
        </div>
      );
    }
  }

  function renderRecipientDialogBox() {
    const props = {
      show: selectingRecipients,
      selection: options.get('recipients'),
      database,
      route,
      env,
      onSelect: handleRecipientsSelect,
      onCancel: handleRecipientsCancel,
    };
    return <UserSelectionDialogBox {...props} />;
  }

  function renderIssueDialogBox() {
    // don't allow issue to be deleted once someone has been assigned to it
    const props = {
      show: enteringIssueDetails,
      allowDeletion: !_.some(reactions, { type: 'assignment '}),
      currentUser,
      story,
      issue: options.get('issue'),
      repos,
      env,
      onConfirm: handleIssueConfirm,
      onCancel: handleIssueCancel,
    };
    return <IssueDialogBox {...props} />;
  }
}

StoryViewOptions.defaultProps = {
  section: 'both',
};
