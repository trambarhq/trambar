import React from 'react';

// widgets
import ImageEditor from 'editors/image-editor';
import DurationIndicator from 'widgets/duration-indicator';

import './video-editor.scss';

function VideoEditor(props) {
    var duration = props.resource.duration;
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

VideoEditor.propTypes = ImageEditor.propTypes;
