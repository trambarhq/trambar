import React, { PureComponent } from 'react';

import './duration-indicator.scss';

class DurationIndicator extends PureComponent {
    static displayName = 'DurationIndicator';

    static format(ms) {
        if (typeof(ms) !== 'number') {
            return '';
        }
        var hr = String(Math.floor(ms / 3600000));
        var min = String(Math.floor(ms / 60000) % 60);
        var sec = String(Math.round(ms / 1000) % 60);
        if (min.length === 1) {
            min = '0' + min;
        }
        if (sec.length === 1) {
            sec = '0' + sec;
        }
        return `${hr}:${min}:${sec}`;
    }

    calculateDuration() {
        var duration = this.props.duration;
        if (this.props.startTime) {
            var now = new Date;
            duration += (now - this.props.startTime);
        }
        return duration;
    }

    /**
     * Start timer on mount if startTime is non-null
     */
    componentWillMount() {
        if (this.props.startTime) {
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
        if (!this.props.startTime && nextProps.startTime) {
            this.startTimer();
        } else if (this.props.startTime && !nextProps.startTime) {
            this.stopTimer();
        }
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        var millseconds = this.calculateDuration();
        var iconClassName = 'icon';
        if (this.props.startTime) {
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

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    DurationIndicator.propTypes = {
        duration: PropTypes.number,
        startTime: PropTypes.instanceOf(Date),
    };
}
