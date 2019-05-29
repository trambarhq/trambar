import _ from 'lodash';
import React, { useState, useCallback } from 'react';

// widgets
import { MediaButton } from '../widgets/media-button.jsx';
import { ImageEditor } from '../editors/image-editor.jsx';
import { VideoEditor } from '../editors/video-editor.jsx';
import { AudioEditor } from '../editors/audio-editor.jsx';

import './media-editor.scss';

/**
 * Component for adjusting a media resource attached to a story or reaction.
 */
function MediaEditor(props) {
    const { env, payloads, resources, resourceIndex, allowEmbedding, allowShifting, children } = props;
    const { t } = env.locale;
    const resource = _.get(resources, resourceIndex);

    const handleShiftClick = useCallback((evt) => {
        if (resourceIndex < 1) {
            return;
        }
        const resourcesAfter = _.slice(resources);
        resourcesAfter.splice(resourceIndex, 1);
        resourcesAfter.splice(resourceIndex - 1, 0, resource);
        if (onChange) {
            return onChange({
                resources: resourcesAfter,
                selection: resourceIndex - 1
            });
        }
    }, [ resource, resources, resourceIndex ]);
    const handleRemoveClick = useCallback((evt) => {
        const resourcesAfter = _.slice(resources);
        resourcesAfter.splice(resourceIndex, 1);
        let newIndex = resourceIndex;
        if (resourceIndex >= resources.length) {
            newIndex = resources.length - 1;
        }
        if (onChange) {
            return onChange({
                resources: resourcesAfter,
                selection: newIndex
            });
        }
        if (resource && resource.payload_token) {
            payloads.cancel(resource.payload_token);
        }
    }, [ payloads, resource, resources, resourceIndex, onChange ]);
    const handleEmbedClick = useCallback((evt) => {
        if (onEmbed) {
            onEmbed({ resource });
        }
    }, [ resource, onEmbed ])
    const handleBackwardClick = useCallback((evt) => {
        if (resourceIndex > 0) {
            if (onChange) {
                return onChange({ resources, selection: resourceIndex - 1 });
            }
        }
    }, [ resourceIndex, onChange ]);
    const handleForwardClick = useCallback((evt) => {
        if (resourceIndex < _.size(resources) - 1) {
            if (onChange) {
                return onChange({ resources, selection: resourceIndex - 1 });
            }
        }
    }, [ resourceIndex, resources, onChange ]);
    const handleResourceChange = useCallback((evt) => {
        const resourcesAfter = _.slice(resources);
        resourcesAfter[resourceIndex] = evt.resource;
        if (onChange) {
            return onChange({
                resources: resourcesAfter,
                selection: resourceIndex
            });
        }
    }, [ resources, resourceIndex ]);

    if (!resource) {
        let placeholder;
        if (env.isWiderThan('double-col')) {
            placeholder = children;
        }
        return <div className="media-editor empty">{placeholder}</div>;
    } else {
        return (
            <div key={resourceIndex} className="media-editor">
                <div className="resource">
                    {renderResource(resource)}
                    {renderNavigation()}
                </div>
            </div>
        );
    }

    function renderResource(resource) {
        const props = {
            resource,
            payloads,
            env,
            onChange: handleResourceChange,
        };
        switch (resource.type) {
            case 'image':
            case 'website':
                return <ImageEditor {...props} />;
            case 'video':
                return <VideoEditor {...props} />;
            case 'audio':
                return <AudioEditor {...props} />;
        }
    }

    function renderNavigation() {
        const resourceCount = _.size(resources);
        if (resourceCount === 0) {
            return null;
        }
        const removeProps = {
            label: t('media-editor-remove'),
            icon: 'remove',
            onClick: handleRemoveClick,
        };
        const embedProps = {
            label: t('media-editor-embed'),
            icon: 'code',
            hidden: !allowEmbedding,
            onClick: handleEmbedClick,
        };
        const shiftProps = {
            label: t('media-editor-shift'),
            icon: 'chevron-left',
            hidden: !allowShifting || !(resourceCount > 1),
            disabled: !(resourceIndex > 0),
            onClick: handleShiftClick,
        };
        const directionProps = {
            index: resourceIndex,
            count: resourceCount,
            hidden: !(resourceCount > 1),
            onBackwardClick: handleBackwardClick,
            onForwardClick: handleForwardClick,
        };
        return (
            <div className="navigation">
                <div className="left">
                    <MediaButton {...removeProps} />
                    <MediaButton {...embedProps} />
                    <MediaButton {...shiftProps} />
                </div>
                <div className="right">
                    <MediaButton.Direction {...directionProps} />
                </div>
            </div>
        );
    }
}

export {
    MediaEditor as default,
    MediaEditor,
};
