var React = require('react'), PropTypes = React.PropTypes;

require('./push-button.scss');

module.exports = PushButton;
module.exports.File = FileButton;

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

function FileButton(props) {
    if (props.hidden) {
        return null;
    }
    var inputProps = {
        type: 'file',
        value: '',
        disabled: props.disabled,
        multiple: props.multiple,
        onChange: props.onChange,
    };
    var classNames = [ 'push-button' ];
    if (props.emphasized) {
        classNames.push('emphasized');
    }
    return (
        <label className={classNames.join(' ')} disabled={props.disabled} onClick={props.onClick}>
            {props.label}
            <input {...inputProps} />
        </label>
    );
}

FileButton.propTypes = {
    label: PropTypes.string,
    icon: PropTypes.string,
    hidden: PropTypes.bool,
    disabled: PropTypes.bool,
    multiple: PropTypes.bool,
    onChange: PropTypes.func,
};
