var React = require('react'), PropTypes = React.PropTypes;

module.exports = OptionButton;

require('./option-button.scss');

function OptionButton(props) {
    if (props.hidden) {
        return null;
    }
    return (
        <a className={buttonClasses(props)} href={props.url} onClick={!props.disabled ? props.onClick : null}>
            <i className={iconClasses(props)} />
            <span className="label">{props.label}</span>
        </a>
    )
}

OptionButton.propTypes = {
    label: PropTypes.string,
    icon: PropTypes.string,
    hidden: PropTypes.bool,
    selected: PropTypes.bool,
    disabled: PropTypes.bool,
    onClick: PropTypes.func,
};

function buttonClasses(props) {
    var classNames = [ 'option-button' ];
    if (props.className) {
        classNames.push(props.className);
    }
    if (props.selected) {
        classNames.push('selected');
    }
    if (props.disabled) {
        classNames.push('disabled');
    }
    return classNames.join(' ');
}

function iconClasses(props) {
    var classNames = [ 'fa' ];
    if (props.icon) {
        classNames.push(`fa-${props.icon}`);
    } else {
        if (props.selected) {
            classNames.push('fa-check-circle');
        } else {
            classNames.push('fa-circle-o');
        }
    }
    return classNames.join(' ');
}
