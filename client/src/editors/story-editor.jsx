import _ from 'lodash';
import React, { useState, useRef, useEffect } from 'react';
import { useListener, useErrorCatcher, useAutoSave } from 'relaks';
import * as ListParser from 'common/utils/list-parser.mjs';
import * as Markdown from 'common/utils/markdown.mjs';
import * as TagScanner from 'common/utils/tag-scanner.mjs';
import * as PlainText from 'common/utils/plain-text.mjs';
import * as FocusManager from 'common/utils/focus-manager.mjs';
import * as StorySaver from 'common/objects/savers/story-saver.mjs';
import * as StoryUtils from 'common/objects/utils/story-utils.mjs';
import * as IssueUtils from 'common/objects/utils/issue-utils.mjs';
import * as UserUtils from 'common/objects/utils/user-utils.mjs';
import * as ResourceUtils from 'common/objects/utils/resource-utils.mjs';
import * as TemporaryID from 'common/data/remote-data-source/temporary-id.mjs';

// widgets
import { AuthorNames } from '../widgets/author-names.jsx';
import { ProfileImage } from '../widgets/profile-image.jsx';
import { CoauthoringButton } from '../widgets/coauthoring-button.jsx';
import { PushButton } from '../widgets/push-button.jsx';
import { AutosizeTextArea } from 'common/widgets/autosize-text-area.jsx';
import { MediaToolbar } from '../widgets/media-toolbar.jsx';
import { TextToolbar } from '../widgets/text-toolbar.jsx';
import { HeaderButton } from '../widgets/header-button.jsx';
import { DropZone } from '../widgets/drop-zone.jsx';
import { MediaEditor } from '../editors/media-editor.jsx';
import { MediaImporter } from '../editors/media-importer.jsx';
import { MediaPlaceholder } from '../widgets/media-placeholder.jsx';
import { StoryEditorOptions } from '../editors/story-editor-options.jsx';
import { CornerPopUp } from '../widgets/corner-pop-up.jsx';
import { ActionConfirmation } from '../widgets/action-confirmation.jsx';

// custom hooks
import {
  useDraftBuffer,
  useMarkdownResources,
  useConfirmation,
} from '../hooks.mjs';

import './story-editor.scss';

const autoSaveDuration = 2000;

/**
 * Component for creating or editing a story.
 */
export function StoryEditor(props) {
  const { story, authors, repos, bookmarks, recipients, currentUser } = props;
  const { database, route, env, payloads } = props;
  const { highlighting, isStationary } = props;
  const { t, languageCode } = env.locale;
  const [ capturing, capture ] = useState(false);
  const [ selectedResourceIndex, setSelectedResourceIndex ] = useState(0);
  const [ openMenu, setOpenMenu ] = useState('');
  const importerRef = useRef();
  const textAreaRef = useRef();
  const options = useDraftBuffer({
    original: {
      authors,
      recipients,
      hidden: false,
      issue: null,
      preview: _.includes([ 'task-list', 'survey' ], story?.type) ? 'text' : '',
    }
  });
  const draft = useDraftBuffer({
    original: story || createBlankStory(currentUser),
    transform: adjustStory,
  });
  const [ error, run ] = useErrorCatcher(true);
  const [ confirmationRef, confirm ] = useConfirmation();
  const [ input ] = useState({ last: null })

  useAutoSave(draft, autoSaveDuration, async () => {
    if (!draft.get('published')) {
      const storyAfter = await StorySaver.saveStory(database, draft.current);
      payloads.dispatch(storyAfter);
    }
  });

  const handlePublishClick = useListener((evt) => {
    run(async () => {
      draft.set('published', true);
      const storyAfter = await StorySaver.saveStory(database, draft.current);
      payloads.dispatch(storyAfter);
      draft.reset();
    });
  });
  const handleCancelClick = useListener((evt) => {
    run(async () => {
      const coauthoring = UserUtils.isCoauthor(authors, currentUser);
      if (coauthoring) {
        await confirm(t('story-remove-yourself-are-you-sure'));
        const list = options.get('authors');
        const newList = _.reject(list, { id: currentUser.id });
        options.set('authors', newList);
        draft.set('user_ids', _.map(newList, 'id'));
        await StorySaver.saveStory(database, draft.current);
      } else if (isStationary) {
        await confirm(t('story-cancel-are-you-sure'));
        if (draft.current.id) {
          await StorySaver.removeStory(database, draft.current);
        }
        draft.reset();
      } else {
        await confirm(t('story-cancel-edit-are-you-sure'));
        await StorySaver.removeStory(database, draft.current);
      }
    });
  });
  const handleTextChange = useListener((evt) => {
    const langText = evt.target.value;
    draft.set(`details.text.${languageCode}`, langText);
  });
  const handleKeyDown = useListener((evt) => {
    input.current = null;
  });
  const handleBeforeInput = useListener((evt) => {
    const { target, data } = evt;
    if (data === '\n') {
      if (!_.includes([ 'task-list', 'survey' ], draft.get('type'))) {
        if (!env.isWiderThan('double-col')) {
          evt.preventDefault();
          handlePublishClick(evt);
          target.blur();
          return;
        }
      }
    }
    input.current = data;
  });
  const handleKeyUp = useListener((evt) => {
    const { target } = evt;
    if (input.current === '\n') {
      if (_.includes([ 'task-list', 'survey' ], draft.get('type'))) {
        appendListItem(target);
      }
    } else if (input.current === ']') {
      autocompleteListItem(target);
    }
  });
  const handlePaste = useListener((evt) => {
    const { files, items } = evt.clipboardData;
    importerRef.current.importFiles(files);
    importerRef.current.importDataItems(items);
    if (files.length > 0) {
      evt.preventDefault();
    }
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
  const handleItemChange = useListener((evt) => {
  });
  const handleCoauthorSelect = useListener((evt) => {
    const { selection } = evt;
    options.set('authors', selection);
    draft.set('user_ids', _.map(selection, 'id'));
  });
  const handleResourcesChange = useListener((evt) => {
    const { resources } = evt;
    draft.set('details.resources', resources);
  });
  const handleResourceEmbed = useListener((evt) => {
    const { resource } = evt;
    const textArea = textAreaRef.current;
    insertResourceReference(textArea, draft.get('details.resources'), resource);
    options.set('preview', 'media');
    draft.set('details.markdown', true);
  });
  const handleDrop = useListener((evt) => {
    importerRef.current.importFiles(evt.files)
    importerRef.current.importDataItems(evt.items)
  });
  const handleCaptureStart = useListener((evt) => {
    capture(evt.mediaType);
  });
  const handleCaptureEnd = useListener((evt) => {
    capture(null);
  });
  const handleAction = useListener((evt) => {
    switch (evt.action) {
      case 'markdown-set':
        draft.set('details.markdown', evt.value);
        break;
      case 'story-type-set':
        const type = evt.value;
        draft.set('type', type);

        // attach a list template to the story if there's no list yet
        if (type === 'task-list' || type === 'survey') {
          const textArea = textAreaRef.current;
          insertListTemplate(textArea);
        }
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
  useEffect(() => {
    if (options.get('preview') !== 'text') {
      if (draft.get('type') === 'task-list' || draft.get('type') === 'survey') {
        options.set('preview', 'text');
      }
    }
  }, [ draft.get('type') ]);

  const markdown = useMarkdownResources(draft.get('resources'), env);

  const classNames = [ 'story-editor' ] ;
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
            {renderCoauthoringButton()}
            {renderTextArea()}
            {renderButtons()}
          </div>
        </div>
        <div className="header">
          <div className="column-2 padded">
            {renderToolbar()}
            {renderPopUpMenu('preview')}
          </div>
        </div>
        <div className="body">
          <div className="column-2">
            {renderPreview()}
          </div>
        </div>
        {renderMediaImporter()}
        {renderConfirmationDialogBox()}
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
            {renderToolbar()}
            {renderPopUpMenu('preview')}
          </div>
        </div>
        <div className="body">
          <div className="column-1 padded">
            {renderCoauthoringButton()}
            {renderTextArea()}
            {renderButtons()}
          </div>
          <div className="column-2">
            {renderPreview()}
          </div>
        </div>
        {renderMediaImporter()}
        {renderConfirmationDialogBox()}
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
            {renderToolbar()}
          </div>
          <div className="column-3 padded">
            <HeaderButton icon="chevron-circle-right" label={t('story-options')} disabled />
          </div>
        </div>
        <div className="body">
          <div className="column-1 padded">
            {renderCoauthoringButton()}
            {renderTextArea()}
            {renderButtons()}
          </div>
          <div className="column-2">
            {renderPreview()}
          </div>
          <div className="column-3 padded">
            {renderOptions()}
          </div>
        </div>
        {renderMediaImporter()}
        {renderConfirmationDialogBox()}
      </div>
    );
  }

  function renderProfileImage() {
    const props = {
      user: _.first(options.get('authors')),
      size: 'medium',
      env,
    };
    return <ProfileImage {...props} />;
  }

  function renderAuthorNames() {
    const props = {
      authors: options.get('authors'),
      env,
    };
    return <AuthorNames {...props} />;
  }

  function renderCoauthoringButton() {
    const props = {
      authors: options.get('authors'),
      currentUser,
      database,
      route,
      env,
      onSelect: handleCoauthorSelect,
      onRemove: handleCancelClick,
    };
    return <CoauthoringButton {...props} />;
  }

  function renderTextArea() {
    const langText = draft.get(`details.text.${languageCode}`, '');
    const props = {
      value: langText,
      lang: options.localeCode,
      onChange: handleTextChange,
      onBeforeInput: handleBeforeInput,
      onKeyDown: handleKeyDown,
      onKeyUp: handleKeyUp,
      onPaste: handlePaste,
    };
    return <AutosizeTextArea ref={textAreaRef} {...props} />;
  }

  function renderButtons() {
    const cancelButtonProps = {
      label: t('story-cancel'),
      onClick: handleCancelClick,
      disabled: !StoryUtils.isCancelable(draft.current),
    };
    const postButtonProps = {
      label: t('story-post'),
      emphasized: true,
      disabled: !StoryUtils.hasContents(draft.current),
      onClick: handlePublishClick,
    };
    return (
      <div className="buttons">
        <PushButton {...cancelButtonProps} />
        <PushButton {...postButtonProps} />
      </div>
    );
  }

  function renderToolbar() {
    if (options.get('preview') === 'text') {
      return renderTextToolbar();
    } else {
      return renderMediaToolbar();
    }
  }

  function renderTextToolbar() {
    const props = {
      story: draft.current,
      env,
      onAction: handleAction,
    };
    return <TextToolbar {...props} />;
  }

  function renderMediaToolbar() {
    const props = {
      story: draft.current,
      capturing,
      env,
      onAction: handleAction,
    };
    return <MediaToolbar {...props} />;
  }

  function renderPreview() {
    if (options.get('preview') === 'text') {
      return renderTextPreview();
    } else {
      return renderMediaPreview();
    }
  }

  function renderTextPreview() {
    const classNames = [ 'text' ];
    const langText = draft.get(`details.text.${languageCode}`, '');
    const isMarkdown = draft.get('details.markdown');
    const type = draft.get('type');
    let contents;
    if (type === 'task-list') {
      classNames.join('task-list');
      if (isMarkdown) {
        // answers are written to the text itself, so there's no need to
        // provide user answers to Markdown.renderTaskList()
        contents = Markdown.renderTaskList(langText, null, handleItemChange, markdown.onReference);
      } else {
        contents = <p>{PlainText.renderTaskList(langText, null, handleItemChange)}</p>;
      }
    } else if (type === 'survey') {
      classNames.join('survey');
      if (isMarkdown) {
        contents = Markdown.renderSurvey(langText, null, handleItemChange, markdown.onReference);
      } else {
        contents = <p>{PlainText.renderSurvey(langText, null, handleItemChange)}</p>;
      }
    } else {
      classNames.join('story');
      if (isMarkdown) {
        contents = Markdown.render(langText, markdown.onReference);
      } else {
        contents = <p>{PlainText.renderEmoji(langText)}</p>;
      }
    }
    classNames.push((isMarkdown) ? 'markdown' : 'plain-text');
    const textProps = {
      className: classNames.join(' '),
      onClick: markdown.onClick,
    };
    return (
      <div className="story-contents">
        <div {...textProps}>{contents}</div>
      </div>
    );
  }

  function renderMediaPreview() {
    const editorProps = {
      allowEmbedding: true,
      allowShifting: env.isWiderThan('double-col'),
      resources: draft.get('details.resources', []),
      resourceIndex: selectedResourceIndex,
      payloads,
      env,
      onChange: handleResourcesChange,
      onEmbed: handleResourceEmbed,
    };
    const placeholderProps = {
      showHints: isStationary,
      env,
    };
    return (
      <DropZone onDrop={handleDrop}>
        <MediaEditor {...editorProps}>
          <MediaPlaceholder {...placeholderProps} />
        </MediaEditor>
      </DropZone>
    );
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

  function renderConfirmationDialogBox() {
    return <ActionConfirmation ref={confirmationRef} env={env} />;
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
      story: draft.current,
      options,
      currentUser,
      repos,
      database,
      route,
      env,
      onComplete: handleOptionComplete,
    };
    return <StoryEditorOptions {...props} />;
  }
}

function createBlankStory(currentUser) {
  return {
    user_ids: [ currentUser.id ],
    details: {},
    public: true,
    published: false,
  };
}

function adjustStory(story) {
  story = StoryUtils.removeSuperfluousDetails(story);

  if (story.published && !story.type) {
    story.type = 'post';
  }

  // automatically set story type to task list
  if (!story.type) {
    if (ListParser.detect(story.details.text)) {
      story.type = 'task-list';
      if (story.details.markdown === undefined) {
        story.details.markdown = false;
      }
    }
  }

  if (story.type === 'task-list') {
    // update unfinished_tasks
    const counts = [];
    for (let [ lang, langText ] of _.entries(story.details.text)) {
      const tokens = ListParser.extract(langText);
      const unfinished = ListParser.count(tokens, false);
      counts.push(unfinished);
    }
    story.unfinished_tasks = _.max(counts);
  }

  // automatically enable Markdown formatting
  if (story.details.markdown === undefined) {
    for (let [ lang, langText ] of _.entries(story.details.text)) {
      if (Markdown.detect(langText)) {
        story.details.markdown = true;
        break;
      }
    }
  }

  // look for tags
  story.tags = TagScanner.findTags(story.details.text);

  return story;
}

function insertListTemplate(textArea) {
  textArea.focus();
  if (!ListParser.detect(textArea.value)) {
    setTimeout(() => {
      const value = textArea.value;
      const selStart = textArea.selectionStart;
      const textInFront = value.substr(0, selStart);
      let addition = '* [ ] ';
      if (/[^\n]$/.test(textInFront)) {
        addition = '\n' + addition;
      }
      insertText(addition);
    }, 10);
  }
}

function insertResourceReference(textArea, resources, resource) {
  const resourcesOfType = _.filter(resources, { type: resource.type });
  const index = _.indexOf(resourcesOfType, resource);
  textArea.focus();
  setTimeout(() => {
    insertText(`![${resource.type}-${index+1}]`);
  }, 10);
}

function appendListItem(textArea) {
  // see if there's survey or task-list item on the line where
  // the cursor is at
  const value = textArea.value;
  const selStart = textArea.selectionStart;
  const textInFront = value.substr(0, selStart);
  const lineFeedIndex = _.lastIndexOf(textInFront.substr(0, textInFront.length - 1), '\n');
  const lineInFront = textInFront.substr(lineFeedIndex + 1);
  const tokens = ListParser.extract(lineInFront);
  const item = tokens?.[0]?.[0];
  if (item instanceof Object) {
    if (item.label) {
      // the item is not empty--start the next item automatically
      insertText('* [ ] ');
    } else {
      // it's empty--move the selection back to remove it
      textArea.selectionStart = lineFeedIndex + 1;
      insertText('\n');
    }
  }
}

function autocompleteListItem(textArea) {
  const value = textArea.value;
  const selStart = textArea.selectionStart;
  const textInFront = value.substr(0, selStart);
  const lineFeedIndex = _.lastIndexOf(textInFront, '\n');
  const lineInFront = textInFront.substr(lineFeedIndex + 1);
  if (/^\s*\*\[\]/.test(lineInFront)) {
    textArea.selectionStart = selStart - 3;
    insertText('* [ ]');
  }
}

function insertText(text) {
  document.execCommand('insertText', false, text);
}

StoryEditor.defaultProps = {
  isStationary: false
};
