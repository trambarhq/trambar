var React = require('react'), PropTypes = React.PropTypes;

module.exports = DevicePlaceholder;

require('./device-placeholder.scss');

function DevicePlaceholder(props) {
    var className = 'device-placeholder';
    if (props.blocked) {
        className += ' blocked';
    }
    var icon = props.icon;
    return (
        <div className={className}>
            <span className="fa-stack fa-lg">
                <i className={`fa fa-${icon} fa-stack-1x`} />
                <i className="fa fa-ban fa-stack-2x" />
            </span>
        </div>
    );
}

DevicePlaceholder.propTypes = {
    blocked: PropTypes.bool,
    icon: PropTypes.oneOf([ 'camera', 'video-camera', 'microphone' ]).isRequired,
};
