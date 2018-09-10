import _ from 'lodash';
import React, { PureComponent } from 'react';

// widgets
import AutosizeTextArea from 'widgets/autosize-text-area';

import './text-field.scss';

function TextField(props) {
    let { env, children, readOnly } = props;
    let { t } = env.locale;
    let classNames = [ 'text-field' ];
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

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    TextField.propTypes = {
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
