import React, { useState, useRef, useEffect } from 'react';
import { useListener, useErrorCatcher, useAutoSave } from 'relaks';
import { findTagsInText } from 'common/utils/tag-scanner.js';
import { isMarkdown } from 'common/utils/markdown.js';
import { FocusManager } from 'common/utils/focus-manager.js';
import { saveReaction, republishReaction, removeReaction } from 'common/objects/savers/reaction-saver.js';
import { hasContents, removeSuperfluousDetails } from 'common/objects/utils/reaction-utils.js';
import { attachMosaic } from 'common/objects/utils/resource-utils.js';

// widgets
import { AutosizeTextArea } from 'common/widgets/autosize-text-area.jsx';
import { PushButton } from '../widgets/push-button.jsx';
import { HeaderButton } from '../widgets/header-button.jsx';
import { ProfileImage } from '../widgets/profile-image.jsx';
import { DropZone } from '../widgets/drop-zone.jsx';
import { ReactionMediaToolbar } from '../widgets/reaction-media-toolbar.jsx';
import { MediaEditor } from '../editors/media-editor.jsx';
import { MediaImporter } from '../editors/media-importer.jsx';

// custom hooks
import {
  useDraftBuffer,
} from '../hooks.js';

import './reaction-editor.scss';

const autoSaveDuration = 2000;

/**
 * Component for creating or editing a comment--the only reaction where the
 * user enters the text.
 */
export function ReactionEditor(props) {
  const { reaction, story, currentUser } = props;
  const { database, env, payloads, onFinish } = props;
  const { t, languageCode } = env.locale;
  const [ capturing, capture ] = useState();
  const importerRef = useRef();
  const textAreaRef = useRef();
  const draft = useDraftBuffer({
    original: reaction || createBlankComment(story, currentUser),
    transform: adjustReaction,
  });
  const [ selectedResourceIndex, setSelectedResourceIndex ] = useState(0);
  const [ error, run ] = useErrorCatcher(true);

  const handleTextChange = useListener((evt) => {
    const langText = evt.currentTarget.value;
    draft.set(`details.text.${languageCode}`, langText);
  });
  const handleKeyPress = useListener((evt) => {
    if (evt.charCode == 0x0D /* ENTER */) {
      if (!env.isWiderThan('double-col')) {
        evt.preventDefault();
        evt.target.blur();
        handlePublishClick(evt);
      }
    }
  });
  const handlePaste = useListener((evt) => {
    importerRef.importFiles(evt.clipboardData.files);
    importerRef.importDataItems(evt.clipboardData.items);
  });
  const handlePublishClick = useListener((evt) => {
    run(async () => {
      draft.set('published', true);
      done();
      const resources = draft.get('details.resources');
      await attachMosaic(resources, env);
      await saveReaction(database, draft.current);
    });
  });
  const handleCancelClick = useListener((evt) => {
    run(async () => {
      done();
      if (reaction) {
        if (reaction.ptime) {
          // reaction was published before--publish it again
          await republishReaction(database, reaction);
        } else {
          // delete saved unpublished reaction
          await removeReaction(database, reaction);
        }
      }
    });
  });
  const handleResourcesChange = useListener((evt) => {
    draft.set('details.resources', evt.resources);
    setSelectedResourceIndex(evt.selection);
  });
  const handleCaptureStart = useListener((evt) => {
    capture(evt.mediaType);
  });
  const handleCaptureEnd = useListener((evt) => {
    capture(undefined);
  });
  const handleAction = useListener((evt) => {
    switch (evt.action) {
      case 'markdown-set':
        draft.set('details.markdown', evt.value);
        break;
      case 'photo-capture':
        importerRef.current.capture('image');
        break;
      case 'video-capture':
        importerRef.current.capture('video');
        break;
      case 'audio-capture':
        importerRef.current.capture('audio');
        break;
      case 'file-import':
        importerRef.current.importFiles(evt.files);
        break;
    }
  });

  useAutoSave(draft, autoSaveDuration, async () => {
    // don't save when editing previously published comment
    if (!reaction.ptime) {
      const reactionAfter = await saveReaction(database, draft.current);
      payloads.dispatch(reactionAfter);
    }
  });
  useEffect(() => {
    if (story && currentUser) {
      const textArea = textAreaRef.current;
      FocusManager.register(textArea, {
        type: 'ReactionEditor',
        story_id: story.id,
        user_id: currentUser.id,
      });
      return () => {
        FocusManager.unregister(textArea);
      };
    }
  }, [ story, currentUser ]);

  function done() {
    if (onFinish) {
      onFinish({})
    }
  }

  return (
    <div className="reaction-editor">
      <div className="profile-image-column">
        {renderProfileImage()}
      </div>
      <div className="editor-column">
        <div className="controls">
          <div className="textarea">
            {renderTextArea()}
          </div>
          <div className="buttons">
            {renderMediaToolbar()}
            {renderActionButtons()}
          </div>
        </div>
        <div className="media">
          {renderMediaEditor()}
          {renderMediaImporter()}
        </div>
      </div>
    </div>
  );

  function renderProfileImage() {
    const props = {
      user: currentUser,
      size: 'small',
      env,
    };
    return <ProfileImage {...props} />;
  }

  function renderTextArea() {
    const langText = draft.get(`details.text.${languageCode}`, '');
    const textareaProps = {
      ref: textAreaRef,
      value: langText,
      lang: env.locale.localeCode,
      onChange: handleTextChange,
      onKeyPress: handleKeyPress,
      onPaste: handlePaste,
    };
    return <AutosizeTextArea {...textareaProps} />
  }

  function renderMediaToolbar() {
    const props = {
      reaction: draft.current,
      capturing,
      env,
      onAction: handleAction,
    };
    return <ReactionMediaToolbar {...props} />;
  }

  function renderActionButtons() {
    const cancelButtonProps = {
      label: t('story-cancel'),
      onClick: handleCancelClick,
    };
    const postButtonProps = {
      label: t('story-post'),
      onClick: handlePublishClick,
      emphasized: true,
      disabled: !hasContents(draft.current),
    };
    return (
      <div className="action-buttons">
        <PushButton {...cancelButtonProps} />
        <PushButton {...postButtonProps} />
      </div>
    );
  }

  function renderMediaEditor() {
    const props = {
      allowShifting: env.isWiderThan('double-col'),
      resources: draft.get('details.resources'),
      resourceIndex: selectedResourceIndex,
      payloads,
      env,
      onChange: handleResourcesChange,
    };
    return <MediaEditor {...props} />;
  }

  function renderMediaImporter() {
    const props = {
      ref: importerRef,
      resources: draft.get('details.resources', []),
      cameraDirection: 'back',
      payloads,
      env,
      onCaptureStart: handleCaptureStart,
      onCaptureEnd: handleCaptureEnd,
      onChange: handleResourcesChange,
    };
    return <MediaImporter {...props} />;
  }
}

function createBlankComment(story, currentUser) {
  if (story && currentUser) {
    return {
      type: 'comment',
      story_id: story.id,
      user_id: currentUser.id,
      details: {},
    };
  }
}

function adjustReaction(reaction) {
  reaction = removeSuperfluousDetails(reaction);

  if (reaction.details.markdown === undefined) {
    for (let [ lang, langText ] of Object.entries(reaction.details.text)) {
      if (isMarkdown(langText)) {
        reaction.details.markdown = true;
        break;
      }
    }
  }

  // look for tags
  reaction.tags = findTagsInText(reaction.details.text, reaction.details.markdown);
  return reaction
}
