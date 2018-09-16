import React from 'react';

import './device-placeholder.scss';

function DevicePlaceholder(props) {
    let className = 'device-placeholder';
    if (props.blocked) {
        className += ' blocked';
    }
    let icon = props.icon;
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

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');
    
    DevicePlaceholder.propTypes = {
        blocked: PropTypes.bool,
        icon: PropTypes.oneOf([ 'camera', 'video-camera', 'microphone' ]).isRequired,
    };
}
