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
        let { type } = this.props;
        if (type === 'bar') {
            return this.renderBar();
        } else if (type === 'gauge') {
            return this.renderGauge();
        }
    }

    renderBar() {
        let { volume, recording } = this.props;
        let className = 'volume-bar';
        if (recording) {
            className += ' recording';
        }
        let style = {
            width: (volume || 0) + '%'
        };
        return (
            <div className="volume-indicator bar">
                {this.renderIcon()}
                <div className="volume-bar-frame">
                    <div className={className} style={style} />
                </div>
            </div>
        );
    }

    renderGauge() {
        let { volume, recording } = this.props;
        let angle = Math.round(volume * 180 / 100);
        let transform = `rotate(${angle}deg)`;
        let style = {
            WebkitTransform: transform,
            MozTransform: transform,
            transform: transform,
            color: 'red',
        };
        return (
            <div className="volume-indicator gauge">
                <div className="mask">
              	     <div className="semi-circle" />
              	     <div className="semi-circle-mask" style={style} />
                </div>
                {this.renderIcon()}
            </div>
        );
    }

    renderIcon() {
        let { volume } = this.props;
        let className = 'fa';
        if (volume > 40) {
            className += ' fa-volume-up';
        } else if (volume > 10) {
            className += ' fa-volume-down';
        } else {
            className += ' fa-volume-off';
        }
        return <i className={className} />;
    }
}

VolumeIndicator.defaultProps = {
    type: 'bar',
    recording: false,
};

export {
    VolumeIndicator as default,
    VolumeIndicator,
};

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    VolumeIndicator.propTypes = {
        type: PropTypes.oneOf([ 'bar', 'gauge' ]),
        volume: PropTypes.number,
        recording: PropTypes.bool,
    };
}
