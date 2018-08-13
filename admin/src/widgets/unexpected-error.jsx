var React = require('react'), PropTypes = React.PropTypes;

module.exports = UnexpectedError;

require('./unexpected-error.scss');

function UnexpectedError(props) {
    if (!props.children) {
        return null;
    }
    var className = 'unexpected-error';
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
