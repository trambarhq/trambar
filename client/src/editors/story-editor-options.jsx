import _ from 'lodash';
import React, { useState } from 'react';
import { useListener } from 'relaks';
import { canCreateBookmark, canSendBookmarks, canAddIssue, canHideStory } from 'common/objects/utils/user-utils.js';

// widgets
import { HeaderButton } from '../widgets/header-button.jsx';
import { OptionButton } from '../widgets/option-button.jsx';
import { UserSelectionDialogBox } from '../dialogs/user-selection-dialog-box.jsx';
import { IssueDialogBox } from '../dialogs/issue-dialog-box.jsx';

import './story-editor-options.scss';

/**
 * Component responsible for the handling of story options. Used by StoryEditor.
 */
export function StoryEditorOptions(props) {
  const { story, repos, currentUser, options } = props;
  const { database, route, env, section, onComplete } = props;
  const { t } = env.locale;
  const [ selectingRecipients, selectRecipients ] = useState(false);
  const [ enteringIssueDetails, enterIssueDetails ] = useState(false);
  const handleAddBookmarkClick = useListener((evt) => {
    const list = options.get('recipients');
    const self = _.find(list, { id: currentUser.id });
    const newList = (self) ? _.without(list, self) : _.concat(list, currentUser);
    options.set('recipients', newList);
    done();
  });
  const handleHideClick = useListener((evt) => {
    const hidding = !options.get('hidden');
    options.set('hidden', hidding);
    done();
  });
  const handleSendBookmarkClick = useListener((evt) => {
    selectRecipients(true);
  });
  const handleRecipientsSelect = useListener((evt) => {
    const { selection } = evt;
    options.set('recipients', selection);
    selectRecipients(false);
    done();
  });
  const handleRecipientsCancel = useListener((evt) => {
    selectRecipients(false);
  });
  const handleAddIssueClick = useListener((evt) => {
    enterIssueDetails(true);
  });
  const handleIssueConfirm = useListener((evt) => {
    const { issue } = evt;
    options.set('issue', issue);
    enterIssueDetails(false);
    done();
  });
  const handleIssueCancel = useListener((evt) => {
    enterIssueDetails(false);
  });
  const handleShowMediaPreviewClick = useListener((evt) => {
    options.set('preview', 'media');
    done();
  });
  const handleShowTextPreviewClick = useListener((evt) => {
    options.set('preview', 'text');
    done();
  });

  function done() {
    if (onComplete) {
      onComplete({});
    }
  }

  if (section === 'both') {
    return (
      <div className="story-editor-options">
        {renderButtons('main')}
        <div className="border" />
        {renderButtons('preview')}
      </div>
    );
  } else {
    return (
      <div className="story-editor-options">
        {renderButtons(section)}
      </div>
    );
  }

  function renderButtons(section) {
    if (section === 'main') {
      const access = 'read-write';
      const recipients = options.get('recipients');
      const self = _.find(recipients, { id: currentUser.id });
      const bookmarkProps = {
        label: t('option-add-bookmark'),
        selected: !!self,
        hidden: !canCreateBookmark(currentUser, story, access),
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
      const hidePostProps = {
        label: t('option-hide-story'),
        hidden: !canHideStory(currentUser, story, access),
        selected: options.get('hidden'),
        onClick: handleHideClick,
      };
      return (
        <div className={section}>
          <OptionButton {...bookmarkProps} />
          <OptionButton {...sendBookmarkProps} />
          <OptionButton {...addIssueProps} />
          <OptionButton {...hidePostProps} />
          {renderRecipientDialogBox()}
          {renderIssueDialogBox()}
        </div>
      );
    } else if (section === 'preview') {
      const mediaProps = {
        label: t('option-show-media-preview'),
        selected: options.get('preview') === 'media' || !options.get('preview'),
        onClick: handleShowMediaPreviewClick,
      };
      let textProps = {
        label: t('option-show-text-preview'),
        selected: options.get('preview') === 'text',
        onClick: handleShowTextPreviewClick,
      };
      return (
        <div className={section}>
          <OptionButton {...mediaProps} />
          <OptionButton {...textProps} />
        </div>
      );
    }
  }

  function renderRecipientDialogBox() {
    let selection = options.get('recipients');
    if (options.get('bookmarked')) {
      selection = _.concat(selection, currentUser);
    }
    const props = {
      show: selectingRecipients,
      selection,
      database,
      route,
      env,
      onSelect: handleRecipientsSelect,
      onCancel: handleRecipientsCancel,
    };
    return <UserSelectionDialogBox {...props} />;
  }

  function renderIssueDialogBox() {
    const props = {
      show: enteringIssueDetails,
      allowDeletion: true,
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

StoryEditorOptions.defaultProps = {
  section: 'both',
};
