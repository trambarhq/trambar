import React from 'react';

// widgets
import { ImageEditor } from '../editors/image-editor.jsx';
import { formatDuration } from '../widgets/duration-indicator.jsx';

import './video-editor.scss';

/**
 * Stateless component that renders an image editor for adjusting the video
 * preview image. The duration of the video is overlayed over the image.
 */
export function VideoEditor(props) {
  const { duration } = props;
  return (
    <ImageEditor {...props}>
      <div className="video-duration">
        {formatDuration(duration)}
      </div>
    </ImageEditor>
  );
}
