import _ from 'lodash';
import React, { PureComponent } from 'react';
import ComponentRefs from 'utils/component-refs';

// widgets
import AutosizeTextArea from 'widgets/autosize-text-area';

import './text-field.scss';

class TextField extends PureComponent {
    static displayName = 'TextField';

    constructor(props) {
        super(props);
        this.components = ComponentRefs({
            input: HTMLInputElement
        });
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
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
        return (
            <div className={classNames.join(' ')}>
                <label htmlFor={this.props.id}>{this.props.children}</label>
                <Input ref={this.components.setters.input} {...inputProps} />
            </div>
        );
    }

    /**
     * Place focus on the text field
     */
    focus() {
        this.components.input.focus();
    }
}

TextField.defaultProps = {
    type: 'text',
};

export {
    TextField as default,
    TextField,
};

import Locale from 'locale/locale';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    TextField.propTypes = {
        locale: PropTypes.instanceOf(Locale).isRequired,
    };
}
