var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var ComponentRefs = require('utils/component-refs');

var Locale = require('locale/locale');

// widgets
var AutosizeTextArea = require('widgets/autosize-text-area');

require('./text-field.scss');

module.exports = React.createClass({
    displayName: 'TextField',
    propTypes: {
        locale: PropTypes.instanceOf(Locale).isRequired,
        autofocus: PropTypes.bool,
    },

    /**
     * Return default props
     *
     * @return {Object}
     */
    getDefaultProps: function() {
        return {
            type: 'text',
        };
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        this.components = ComponentRefs({
            input: HTMLInputElement
        });
        return {};
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var classNames = [ 'text-field'];
        var Input = 'input';
        var inputProps = _.omit(this.props, 'children', 'locale');
        if (this.props.type === 'textarea') {
            Input = AutosizeTextArea;
            inputProps = _.omit(inputProps, 'type');
        }
        if (this.props.readOnly) {
            classNames.push('readonly');
            var t = this.props.locale.translate;
            inputProps.placeholder = t('text-field-placeholder-none');
            inputProps.spellCheck = false;
        }
        inputProps.value = inputProps.value || '';
        if (inputProps.value && inputProps.spellCheck === false) {
            // force redraw by adding zero-width no-break space
            inputProps.value += '\ufeff';
        }
        return (
            <div className={classNames.join(' ')}>
                <label htmlFor={this.props.id}>{this.props.children}</label>
                <Input ref={this.components.setters.input} {...inputProps} />
            </div>
        );
    },

    /**
     * [description]
     *
     * @return {[type]}
     */
    componentDidMount: function() {
        if (this.props.autofocus) {
            this.components.input.focus();
        }
    },
});
