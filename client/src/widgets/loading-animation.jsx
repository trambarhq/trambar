import React from 'react';

import './loading-animation.scss';

/**
 * Stateless component that renders four dots in motion.
 */
function LoadingAnimation(props) {
    return (
        <div className="loading-animation">
            <div className="first dot" />
            <div className="second dot" />
            <div className="third dot" />
            <div className="fourth dot" />
        </div>
    );
}

export {
    LoadingAnimation as default,
    LoadingAnimation,
};
