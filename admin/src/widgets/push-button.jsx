import React from 'react';

import './push-button.scss';

/**
 * Stateless component that renders a standard push button.
 */
function PushButton(props) {
    props = { ... props };
    if (props.className) {
        props.className = 'push-button ' + props.className;
    } else {
        props.className = 'push-button';
    }
    return <button {...props}>{props.children}</button>;
}

PushButton.defaultProps = {
    className: 'submit'
};

export {
    PushButton as default,
    PushButton,
};
