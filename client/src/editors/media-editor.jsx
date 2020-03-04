import _ from 'lodash';
import React, { useState } from 'react';
import { useListener } from 'relaks';

// widgets
import { MediaButton } from '../widgets/media-button.jsx';
import { ImageEditor } from '../editors/image-editor.jsx';
import { VideoEditor } from '../editors/video-editor.jsx';
import { AudioEditor } from '../editors/audio-editor.jsx';

import './media-editor.scss';

/**
 * Component for adjusting a media resource attached to a story or reaction.
 */
export function MediaEditor(props) {
  const { resources, resourceIndex, allowEmbedding, allowShifting } = props;
  const { env, payloads, children, onChange, onEmbed } = props;
  const { t } = env.locale;
  const resource = resources?.[resourceIndex];

  const handleShiftClick = useListener((evt) => {
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
  });
  const handleRemoveClick = useListener((evt) => {
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
    if (resource?.payload_token) {
      payloads.cancel(resource.payload_token);
    }
  });
  const handleEmbedClick = useListener((evt) => {
    if (onEmbed) {
      onEmbed({ resource });
    }
  });
  const handleBackwardClick = useListener((evt) => {
    if (resourceIndex > 0) {
      if (onChange) {
        return onChange({ resources, selection: resourceIndex - 1 });
      }
    }
  });
  const handleForwardClick = useListener((evt) => {
    if (resourceIndex < _.size(resources) - 1) {
      if (onChange) {
        return onChange({ resources, selection: resourceIndex - 1 });
      }
    }
  });
  const handleResourceChange = useListener((evt) => {
    const resourcesAfter = _.slice(resources);
    resourcesAfter[resourceIndex] = evt.resource;
    if (onChange) {
      return onChange({
        resources: resourcesAfter,
        selection: resourceIndex
      });
    }
  });

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
