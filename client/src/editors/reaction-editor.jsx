import _ from 'lodash';
import Promise from 'bluebird';
import React, { useState, useRef, useEffect } from 'react';
import { useListener, useErrorCatcher, useAutoSave } from 'relaks';
import { memoizeWeak } from 'common/utils/memoize.mjs';
import * as TagScanner from 'common/utils/tag-scanner.mjs';
import * as Markdown from 'common/utils/markdown.mjs';
import * as FocusManager from 'common/utils/focus-manager.mjs';
import * as ReactionSaver from 'common/objects/savers/reaction-saver.mjs';
import * as ReactionUtils from 'common/objects/utils/reaction-utils.mjs';
import * as ResourceUtils from 'common/objects/utils/resource-utils.mjs';

// widgets
import AutosizeTextArea from 'common/widgets/autosize-text-area.jsx';
import PushButton from '../widgets/push-button.jsx';
import HeaderButton from '../widgets/header-button.jsx';
import ProfileImage from '../widgets/profile-image.jsx';
import DropZone from '../widgets/drop-zone.jsx';
import ReactionMediaToolbar from '../widgets/reaction-media-toolbar.jsx';
import MediaEditor from '../editors/media-editor.jsx';
import MediaImporter from '../editors/media-importer.jsx';

// custom hooks
import {
    useReactionBuffer,
} from '../hooks';

import './reaction-editor.scss';

const autoSave = 2000;

/**
 * Component for creating or editing a comment--the only reaction where the
 * user enters the text.
 */
function ReactionEditor(props) {
    const { reaction, story, currentUser } = props;
    const { database, env, payloads, onFinish } = props;
    const { t } = env.locale;
    const [ capturing, capture ] = useState(false);
    const importerRef = useRef();
    const textAreaRef = useRef();
    const draft = useReactionBuffer({
        original: reaction || createBlankComment(story, currentUser),
    });
    const [ selectedResourceIndex, setSelectedResourceIndex ] = useState(0);
    const [ error, run ] = useErrorCatcher(true);

    const handleTextChange = useListener((evt) => {
        const langText = evt.currentTarget.value;
        draft.updateLocalized('details.text', env.locale, langText);

        // automatically enable Markdown formatting
        if (draft.get('details.markdown') === undefined) {
            if (Markdown.detect(langText, handleReference)) {
                draft.update('details.markdown', true);
            }
        }

        // look for tags
        const tags = TagScanner.findTags(draft.get('details.text'));
        draft.update('tags', tags);
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
            draft.update('published', true);
            done();
            const resources = draft.get('details.resources');
            await ResourceUtils.attachMosaic(resources, env);
            await ReactionSaver.saveReaction(database, draft.current);
        });
    });
    const handleCancelClick = useListener((evt) => {
        run(async () => {
            done();
            if (reaction) {
                if (reaction.ptime) {
                    // reaction was published before--publish it again
                    await ReactionSaver.republishReaction(database, reaction);
                } else {
                    // delete saved unpublished reaction
                    await ReactionSaver.removeReaction(database, reaction);
                }
            }
        });
    });
    const handleResourcesChange = useListener((evt) => {
        draft.update('details.resources', evt.resources);
        setSelectedResourceIndex(evt.selection);
    });
    const handleCaptureStart = useListener((evt) => {
        capture(evt.mediaType);
    });
    const handleCaptureEnd = useListener((evt) => {
        capture(null);
    });
    const handleReference = useListener((evt) => {
        const resources = draft.get('details.resources', []);
        const res = Markdown.findReferencedResource(resources, evt.name);
        if (res) {
            let url = ResourceUtils.getMarkdownIconURL(res, evt.forImage, env);
            return { href: url, title: undefined };
        }
    });
    const handleAction = useListener((evt) => {
        switch (evt.action) {
            case 'markdown-set':
                draft.update('details.markdown', evt.value);
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

    useAutoSave(draft, autoSave, async () => {
        // don't save when editing previously published comment
        if (!reaction.ptime) {
            const reactionAfter = await ReactionSaver.saveReaction(database, draft.current);
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
        const langText = draft.getLocalized('details.text', env.locale);
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
            disabled: !draft.hasContents(),
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

export {
    ReactionEditor as default,
    ReactionEditor,
};
