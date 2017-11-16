var React = require('react'), PropTypes = React.PropTypes;

// widgets
var ImageEditor = require('editors/image-editor');
var DurationIndicator = require('widgets/duration-indicator');

module.exports = VideoEditor;

require('./video-editor.scss');

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

VideoEditor.propTypes = ImageEditor.propTypes;
