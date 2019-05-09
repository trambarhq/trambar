import _ from 'lodash';
import React from 'react';

// widgets
import AutosizeTextArea from 'common/widgets/autosize-text-area.jsx';

import './text-field.scss';

/**
 * Stateless component that renders either a textarea or a single-line
 * text input.
 */
function TextField(props) {
    const { env, children, readOnly } = props;
    const { t } = env.locale;
    const classNames = [ 'text-field' ];
    let Input = 'input';
    let inputProps = _.omit(props, 'children', 'env');
    if (props.type === 'textarea') {
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
            <label htmlFor={props.id}>{children}</label>
            <Input {...inputProps} />
        </div>
    );
}

TextField.defaultProps = {
    type: 'text',
};

export {
    TextField as default,
    TextField,
};
