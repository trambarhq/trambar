var React = require('react'), PropTypes = React.PropTypes;

require('./push-button.scss');

module.exports = PushButton;

function PushButton(props) {
    if (props.hidden) {
        return null;
    }
    var classNames = [ 'push-button' ];
    if (props.emphasized) {
        classNames.push('emphasized');
    }
    return (
        <button className={classNames.join(' ')} disabled={props.disabled} onClick={props.onClick}>
            {props.label}
        </button>
    );
}
