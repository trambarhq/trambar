import React, { PureComponent } from 'react';

import './duration-indicator.scss';

class DurationIndicator extends PureComponent {
    static displayName = 'DurationIndicator';

    static format(ms) {
        if (typeof(ms) !== 'number') {
            return '';
        }
        let hr = String(Math.floor(ms / 3600000));
        let min = String(Math.floor(ms / 60000) % 60);
        let sec = String(Math.round(ms / 1000) % 60);
        if (min.length === 1) {
            min = '0' + min;
        }
        if (sec.length === 1) {
            sec = '0' + sec;
        }
        return `${hr}:${min}:${sec}`;
    }

    calculateDuration() {
        let { duration, startTime } = this.props;
        if (startTime) {
            let now = new Date;
            duration += (now - startTime);
        }
        return duration;
    }

    /**
     * Start timer on mount if startTime is non-null
     */
    componentWillMount() {
        let { startTime } = this.props;
        if (startTime) {
            this.startTimer();
        }
    }

    /**
     * Start timer when startTime becomes non-null, stopping it when it
     * becomes null
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let { startTime } = this.props;
        if (!startTime && nextProps.startTime) {
            this.startTimer();
        } else if (startTime && !nextProps.startTime) {
            this.stopTimer();
        }
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { startTime } = this.props;
        let millseconds = this.calculateDuration();
        let iconClassName = 'icon';
        if (startTime) {
            iconClassName += ' blinking';
        }
        return (
            <div className="duration-indiactor">
                <span className={iconClassName}>
                    <i className="fa fa-circle"/>
                </span>
                <span className="duration">
                    {DurationIndicator.format(millseconds)}
                </span>
            </div>
        );
    }

    /**
     * Stop timer on unmount
     */
    componentWillUnmount() {
        this.stopTimer();
    }

    /**
     * Start refresh timer
     */
    startTimer() {
        if (!this.interval) {
            this.interval = setInterval(() => {
                this.forceUpdate()
            }, 500);
        }
    }

    /**
     * Stop refresh timer
     */
    stopTimer() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}

export {
    DurationIndicator as default,
    DurationIndicator,
};

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    DurationIndicator.propTypes = {
        duration: PropTypes.number,
        startTime: PropTypes.instanceOf(Date),
    };
}
