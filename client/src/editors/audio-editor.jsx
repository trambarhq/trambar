var React = require('react'), PropTypes = React.PropTypes;

// widgets
var ImageEditor = require('editors/image-editor');
var DurationIndicator = require('widgets/duration-indicator');

module.exports = AudioEditor;

require('./audio-editor.scss');

function AudioEditor(props) {
    var res = props.resource;
    var duration = res.duration;
    if (res.width && res.height) {
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

AudioEditor.propTypes = ImageEditor.propTypes;
