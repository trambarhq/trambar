var React = require('react'), PropTypes = React.PropTypes;

var AutosizeTextArea = require('widgets/autosize-text-area');

require('./text-field.scss');

module.exports = TextField;

function TextField(props) {
    var classNames = [ 'text-field'];
    if (props.readOnly) {
        classNames.push('readonly');
    }
    var Input = 'input';
    var inputProps = _.omit(props, 'children');
    if (props.type === 'textarea') {
        Input = AutosizeTextArea;
        inputProps = _.omit(inputProps, 'type');
    }
    return (
        <div className={classNames.join(' ')}>
            <label htmlFor={props.id}>{props.children}</label>
            <Input {...inputProps} />
        </div>
    );
}

TextField.defaultProps = {
    type: 'text'
};
