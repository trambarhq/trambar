import _ from 'lodash';
import React from 'react';

import './scrollable.scss';

/**
 * Stateless component that renders a container with a scroll-bar
 */
function Scrollable(props) {
    let { className, children } = props;
    className = 'scrollable' + ((className) ? ` ${className}` : '');
    props = _.clone(props);
    props.className = className;
    return <div {...props}>{props.children}</div>;
}

export {
    Scrollable as default,
    Scrollable,
};
