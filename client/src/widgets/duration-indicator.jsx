import React, { PureComponent } from 'react';

import './duration-indicator.scss';

/**
 * A component that displays recording's duration. It shows a blinker when
 * recording is true, indicating that a device is actively capturing video
 * or audio.
 */
class DurationIndicator extends PureComponent {
    static displayName = 'DurationIndicator';

    static format(ms) {
        if (typeof(ms) !== 'number') {
            return '';
        }
        let seconds = ms / 1000;
        let hh = Math.floor(seconds / 3600).toString().padStart(2, '0');
        let mm = Math.floor(seconds / 60 % 60).toString().padStart(2, '0');
        let ss = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${hh}:${mm}:${ss}`;
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { duration } = this.props;
        return (
            <div className="duration-indicator">
                <span className="duration">
                    {DurationIndicator.format(duration)}
                </span>
                {this.renderBlinker()}
            </div>
        );
    }

    renderBlinker() {
        let { recording } = this.props;
        if (recording) {
            return (
                <span className="icon blinking">
                    <i className="fa fa-circle"/>
                </span>
            )
        }
    }
}

DurationIndicator.defaultProps = {
    recording: false,
};

export {
    DurationIndicator as default,
    DurationIndicator,
};

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    DurationIndicator.propTypes = {
        duration: PropTypes.number,
        recording: PropTypes.bool,
    };
}
