import React from 'react';

// widgets
import { ImageEditor } from '../editors/image-editor.jsx';
import { DurationIndicator } from '../widgets/duration-indicator.jsx';

import './video-editor.scss';

/**
 * Stateless component that renders an image editor for adjusting the video
 * preview image. The duration of the video is overlayed over the image.
 */
function VideoEditor(props) {
    const { duration } = props;
    return (
        <ImageEditor {...props}>
            <div className="video-duration">
                {DurationIndicator.format(duration)}
            </div>
        </ImageEditor>
    );
}

export {
    VideoEditor as default,
    VideoEditor,
};
