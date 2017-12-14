var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');

module.exports = InputError;

require('./input-error.scss');

function InputError(props) {
    if (!props.children) {
        return null;
    }
    var className = 'input-error';
    var icon = 'exclamation-circle';
    if (props.type === 'warning') {
        className += ' warning';
        icon = 'exclamation-triangle';
    }
    return (
        <div className={className}>
            <i className={`fa fa-${icon}`} />
            {' '}
            {props.children}
        </div>
    )
}
