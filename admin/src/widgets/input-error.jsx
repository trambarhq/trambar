var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');

module.exports = InputError;

require('./input-error.scss');

function InputError(props) {
    if (!props.children) {
        return null;
    }
    return (
        <div className="input-error">
            <i className="fa fa-exclamation-circle" />
            {' '}
            {props.children}
        </div>
    )
}
