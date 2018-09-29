import _ from 'lodash';
import React, { PureComponent } from 'react';
import Moment from 'moment';

import './time.scss';

class Time extends PureComponent {
    static displayName = 'Time';

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { env, time, compact } = this.props;
        let { t } = env.locale;
        let className = 'older';
        let then = Moment(time);
        let text;
        if (time >= env.getRelativeDate(-10, 'day')) {
            // call getRelativeDate() so we have an ISO date string
            if (time >= env.getRelativeDate(0, 'day')) {
                let now = Moment();
                let elapsed = (now - then) * (1 / 1000);
                if (elapsed < 60) {
                    text = t('time-just-now');
                } else if (elapsed < 60 * 60) {
                    let minutes = Math.floor(elapsed * (1 / 60));
                    if (compact) {
                        text = t('time-$min-ago', minutes);
                    } else {
                        text = t('time-$minutes-ago', minutes);
                    }
                } else {
                    let hours = Math.floor(elapsed * (1 / 3600));
                    if (compact) {
                        text = t('time-$hr-ago', hours);
                    } else {
                        text = t('time-$hours-ago', hours);
                    }
                }
                className = 'today';
            } else if (time >= env.getRelativeDate(-1, 'day')) {
                className = 'yesterday';
                text = t('time-yesterday');
            } else {
                for (let day = 2; day <= 10; day++) {
                    if (time >= env.getRelativeDate(-day, 'day')) {
                        text = t('time-$day-ago', day);
                        break;
                    }
                }
            }
        } else {
            text = then.format((compact) ? 'll' : 'LL');
        }
        let title = then.format((compact) ? 'lll' : 'LLL');
        return <span className={`time ${className}`} title={title}>{text}</span>;
    }

    /**
     * Add update hook on mount
     */
    componentDidMount() {
        this.componentDidUpdate();
    }

    /**
     * Update the time periodically if it's published today
     */
    componentDidUpdate(prevProps, prevState) {
        let { env, time } = this.props;
        if (time >= env.getRelativeDate(0, 'day')) {
            if (!_.includes(recentComponents, this)) {
                recentComponents.push(this);
            }
        } else {
            _.pull(recentComponents, this);
        }
    }

    /**
     * Remove update hook on unmount
     */
    componentWillUnmount() {
        _.pull(recentComponents, this);
    }
}

let recentComponents = [];

function updateTime() {
    // copy the list as components can be removed during an update
    let list = recentComponents.slice();
    _.each(list, (component) => {
        if (component) {
            component.forceUpdate();
        }
    });
}

setInterval(updateTime, 15 * 1000);

Time.defaultProps = {
    compact: false,
};

export {
    Time as default,
    Time
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    Time.propTypes = {
        time: PropTypes.string,
        compact: PropTypes.bool,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
