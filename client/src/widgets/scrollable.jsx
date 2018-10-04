import _ from 'lodash';
import React from 'react';

import './scrollable.scss';

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
