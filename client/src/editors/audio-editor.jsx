import React from 'react';

// widgets
import ImageEditor from '../editors/image-editor.jsx';
import DurationIndicator from '../widgets/duration-indicator.jsx';

import './audio-editor.scss';

/**
 * Stateless component that renders an image editor for adjusting the album
 * art if there's one. Otherwise a static placeholder graphic is rendered.
 */
function AudioEditor(props) {
    let { resource, duration } = props;
    if (resource.width && resource.height) {
        return (
            <ImageEditor {...props}>
                <div className="audio-duration">
                    {DurationIndicator.format(duration)}
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
                        {DurationIndicator.format(duration)}
                    </div>
                </div>
            </div>
        );
    }
}

export {
    AudioEditor as default,
    AudioEditor,
};

if (process.env.NODE_ENV !== 'production') {
    AudioEditor.propTypes = ImageEditor.propTypes;
}
