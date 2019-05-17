import _ from 'lodash';
import React, { useCallback } from 'react';

// widgets
import { HeaderButton } from './header-button.jsx';

import './media-toolbar.scss';

/**
 * Toolbar for attaching media to a story. It's responsbile for rendering
 * the appropripate dialog box when a button is clicked.
 */
function MediaToolbar(props) {
    const { env, story, capturing, onAction } = props;
    const { t } = env.locale;
    const canCaptureImage = _.includes(env.recorders, 'image');
    const canCaptureVideo = _.includes(env.recorders, 'video');
    const canCaptureAudio = _.includes(env.recorders, 'audio');
    const resources = _.get(story, 'details.resources', []);

    const handleClick = useCallback((evt) => {
        const action = evt.currentTarget.getAttribute('data-action');
        if (onAction) {
            if (action === 'markdown-set') {
                const value = !story.details.markdown;
                onAction({ action, value });
            } else {
                onAction({ action });
            }
        }
    }, [ story ]);
    const handleFileChange = useCallback((evt) => {
        const files = evt.target.files;
        if (onAction) {
            if (!_.isEmpty(files)) {
                onAction({ action: 'file-import', files });
            }
        }
    });

    const counts = { photo: 0, video: 0, audio: 0, file: 0 };
    for (let resource of resources) {
        if (resource.imported) {
            counts.file++;
        } else {
            switch (resource.type) {
                case 'image': counts.photo++; break;
                case 'video': counts.video++; break;
                case 'audio': counts.audio++; break;
            }
        }
    }

    const photoButtonProps = {
        label: t('story-photo'),
        icon: 'camera',
        hidden: !counts.photo && !canCaptureImage,
        disabled: !canCaptureImage,
        highlighted: (counts.photo > 0 || capturing === 'image'),
        'data-action': 'photo-capture',
        onClick: handleClick,
    };
    const videoButtonProps = {
        label: t('story-video'),
        icon: 'video-camera',
        hidden: !counts.video && !canCaptureVideo,
        disabled: !canCaptureVideo,
        highlighted: (counts.video > 0 || capturing === 'video'),
        'data-action': 'video-capture',
        onClick: handleClick,
    };
    const audioButtonProps = {
        label: t('story-audio'),
        icon: 'microphone',
        hidden: !counts.audio && !canCaptureAudio,
        disabled: !canCaptureAudio,
        highlighted: (counts.audio > 0 || capturing === 'audio'),
        'data-action': 'audio-capture',
        onClick: handleClick,
    };
    const selectButtonProps = {
        label: t('story-file'),
        icon: 'file-photo-o',
        multiple: true,
        highlighted: (counts.file > 0),
        onChange: handleFileChange,
    }
    return (
        <div className="media-toolbar">
            <HeaderButton {...photoButtonProps} />
            <HeaderButton {...videoButtonProps} />
            <HeaderButton {...audioButtonProps} />
            <HeaderButton.File {...selectButtonProps} />
        </div>
    );
}

export {
    MediaToolbar as default,
    MediaToolbar,
};
