import React from 'react';

// widgets
import { ImageEditor } from '../editors/image-editor.jsx';
import { formatDuration } from '../widgets/duration-indicator.jsx';

import './audio-editor.scss';

/**
 * Stateless component that renders an image editor for adjusting the album
 * art if there's one. Otherwise a static placeholder graphic is rendered.
 */
export function AudioEditor(props) {
  const { resource, duration } = props;
  if (resource.width && resource.height) {
    return (
      <ImageEditor {...props}>
        <div className="audio-duration">
          {formatDuration(duration)}
        </div>
      </ImageEditor>
    );
  } else {
    return (
      <div className="audio-editor">
        <div className="graphic">
          <div className="icon">
            <i className="fa fa-microphone" />
          </div>
          <div className="duration">
            {formatDuration(duration)}
          </div>
        </div>
      </div>
    );
  }
}
