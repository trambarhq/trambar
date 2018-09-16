import _ from 'lodash';
import React from 'react';

import './scrollable.scss';

function Scrollable(props) {
    let className = 'scrollable';
    if (props.className) {
        className += ' ' + props.className;
    }
    props = _.clone(props);
    props.className = className;
    return <div {...props}>{props.children}</div>;
}

export {
    Scrollable as default,
    Scrollable,
};
