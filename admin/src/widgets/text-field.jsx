var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');

// widgets
var AutosizeTextArea = require('widgets/autosize-text-area');

require('./text-field.scss');

module.exports = TextField;

function TextField(props) {
    var classNames = [ 'text-field'];
    var Input = 'input';
    var inputProps = _.omit(props, 'children');
    if (props.type === 'textarea') {
        Input = AutosizeTextArea;
        inputProps = _.omit(inputProps, 'type');
    }
    if (props.readOnly) {
        classNames.push('readonly');
        var t = props.locale.translate;
        inputProps.placeholder = t('text-field-placeholder-none');
    }
    inputProps.value = inputProps.value || '';
    return (
        <div className={classNames.join(' ')}>
            <label htmlFor={props.id}>{props.children}</label>
            <Input {...inputProps} />
        </div>
    );
}

TextField.defaultProps = {
    type: 'text',
    locale: PropTypes.instanceOf(Locale).isRequired,
};
