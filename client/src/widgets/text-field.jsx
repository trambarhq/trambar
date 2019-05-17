import React, { useRef, useImperativeHandle } from 'react';

// widgets
import { AutosizeTextArea } from 'common/widgets/autosize-text-area.jsx';

import './text-field.scss';

/**
 * Component that renders a text field and a label, which is provided as
 * a child element. Used mainly by panels in the Settings page.
 */
function TextField(props, ref) {
    const { env, id, type, children, readOnly, ...otherProps } = props;
    const { t } = env.locale;
    const inputRef = useRef();

    useImperativeHandle(ref, () => {
        function focus() {
            inputRef.current.focus();
        }
        return { focus };
    });

    const classNames = [ 'text-field' ];
    let Input, inputProps;
    if (type === 'textarea') {
        Input = AutosizeTextArea;
        inputProps = { id, ...otherProps };
    } else {
        Input = 'input';
        inputProps = { id, type, ...otherProps };
    }
    if (readOnly) {
        classNames.push('readonly');
        inputProps.placeholder = t('text-field-placeholder-none');
        inputProps.spellCheck = false;
        inputProps.readOnly = true;
    }
    inputProps.value = inputProps.value || '';
    return (
        <div className={classNames.join(' ')}>
            <label htmlFor={id}>{children}</label>
            <Input ref={inputRef} {...inputProps} />
        </div>
    );
}

const component = React.forwardRef(TextField);

component.defaultProps = {
    type: 'text',
};

export {
    component as default,
    component as TextField,
};
