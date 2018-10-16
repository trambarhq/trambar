import _ from 'lodash';
import React, { PureComponent } from 'react';
import ComponentRefs from 'utils/component-refs';

// widgets
import AutosizeTextArea from 'widgets/autosize-text-area';

import './text-field.scss';

/**
 * Component that renders a text field and a label, which is provided as
 * a child element. Used mainly by panels in the Settings page.
 *
 * @extends PureComponent
 */
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
        let { env, id, type, children, readOnly } = this.props;
        let { setters } = this.components;
        let { t } = env.locale;
        let classNames = [ 'text-field' ];
        let Input = 'input';
        let inputProps = _.omit(this.props, 'children', 'env');
        if (type === 'textarea') {
            Input = AutosizeTextArea;
            inputProps = _.omit(inputProps, 'type');
        }
        if (readOnly) {
            classNames.push('readonly');
            inputProps.placeholder = t('text-field-placeholder-none');
            inputProps.spellCheck = false;
        }
        inputProps.value = inputProps.value || '';
        return (
            <div className={classNames.join(' ')}>
                <label htmlFor={id}>{children}</label>
                <Input ref={setters.input} {...inputProps} />
            </div>
        );
    }

    /**
     * Place focus on the text field
     */
    focus() {
        let { input } = this.components;
        input.focus();
    }
}

TextField.defaultProps = {
    type: 'text',
};

export {
    TextField as default,
    TextField,
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    TextField.propTypes = {
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
