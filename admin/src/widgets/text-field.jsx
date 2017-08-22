var React = require('react'), PropTypes = React.PropTypes;

var AutosizeTextArea = require('widgets/autosize-text-area');

require('./text-field.scss');

module.exports = TextField;

function TextField(props) {
    var classNames = [ 'text-field'];
    if (props.readOnly) {
        classNames.push('readonly');
    }
    var inputProps = _.omit(props, 'label', 'multiline');
    var Input;
    if (props.multiline) {
        Input = AutosizeTextArea;
    } else {
        inputProps.type = 'text';
        Input = 'input';
    }
    return (
        <div className={classNames.join(' ')}>
            <label htmlFor={props.id}>{props.label}</label>
            <Input {...inputProps} />
        </div>
    );
}
