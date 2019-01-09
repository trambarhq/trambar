import React, { PureComponent } from 'react';

import './volume-indicator.scss';

/**
 * A component that shows volume of audio from microphone
 */
class VolumeIndicator extends PureComponent {
    static displayName = 'VolumeIndicator';

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { volume, recording } = this.props;
        let iconClassName = 'fa';
        if (volume > 40) {
            iconClassName += ' fa-volume-up';
        } else if (volume > 10) {
            iconClassName += ' fa-volume-down';
        } else {
            iconClassName += ' fa-volume-off';
        }
        let barClassName = 'volume-bar';
        if (recording) {
            barClassName += ' recording';
        }
        return (
            <div className="volume-indicator">
            <i className={iconClassName} />
                <div className="volume-bar-frame">
                    <div className={barClassName} style={{ width: volume + '%' }} />
                </div>
            </div>
        );
    }
}

VolumeIndicator.defaultProps = {
    recording: false,
};

export {
    VolumeIndicator as default,
    VolumeIndicator,
};

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    VolumeIndicator.propTypes = {
        volume: PropTypes.number,
        recording: PropTypes.bool,
    };
}
