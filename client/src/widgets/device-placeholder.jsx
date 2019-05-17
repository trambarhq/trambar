import React from 'react';

import './device-placeholder.scss';

/**
 * A stateless component that display a placeholder graphic for when a device
 * isn't ready or available.
 */
function DevicePlaceholder(props) {
    const { icon, blocked } = props;
    const className = [ 'device-placeholder' ];
    if (blocked) {
        classNames.push('blocked');
    }
    return (
        <div className={className}>
            <span className="fa-stack fa-lg">
                <i className={`fa fa-${icon} fa-stack-1x`} />
                <i className="fa fa-ban fa-stack-2x" />
            </span>
        </div>
    );
}

export {
    DevicePlaceholder as default,
    DevicePlaceholder,
};
