import _ from 'lodash';
import React, { PureComponent } from 'react';
import Moment from 'moment';
import * as DateTracker from 'utils/date-tracker';

import Locale from 'locale/locale';

class Time extends PureComponent {
    static displayName = 'Time';

    constructor(props) {
        super(props);
        let { time } = this.props;
        let moment = Moment(time);
        this.state = {
            time: moment,
            date: getDate(moment),
        };
        this.updateClassName(props, this.state);
        this.updateText(props, this.state);
    }

    /**
     * Update class name stored in state
     *
     * @param  {Object} nextProps
     * @param  {Object} nextState
     */
    updateClassName(nextProps, nextState) {
        let className;
        if (nextState.time.isValid()) {
            if (nextState.date === DateTracker.today) {
                className = 'today';
            } else if (nextState.date === DateTracker.yesterday) {
                className = 'yesterday';
            } else {
                className = 'older';
            }
        } else {
            className = 'invalid';
        }
        nextState.className = className;
    }

    /**
     * Update text stored in state
     *
     * @param  {Object} nextProps
     * @param  {Object} nextState
     */
    updateText(nextProps, nextState) {
        let { env, compact } = nextProps;
        let { time, className } = nextState;
        let { t, localeCode } = env.locale;
        let moment = time.clone().locale(localeCode);
        let text;
        if (className === 'today') {
            let now = Moment();
            let elapsed = (now - moment) * 0.001;
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
        } else if (className === 'yesterday') {
            text = t('time-yesterday');
        } else if (className === 'older') {
            if (compact) {
                text = moment.format('ll');
            } else {
                text = moment.format('LL');
            }
        } else {
            text = '';
        }
        nextState.text = text;
    }

    /**
     * Update text after passage of time
     */
    update() {
        let nextState = _.clone(this.state);
        this.updateClassName(this.props, nextState);
        this.updateText(this.props, nextState);
        let diff = _.shallowDiff(nextState, this.state);
        if (!_.isEmpty(diff)) {
            this.setState(diff);
        }
    }

    /**
     * Update state on prop changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let nextState = _.clone(this.state);
        let moment = Moment(nextProps.time);
        nextState.time = moment;
        nextState.date = getDate(moment);
        this.updateClassName(nextProps, nextState);
        this.updateText(nextProps, nextState);
        let diff = _.shallowDiff(nextState, this.state);
        if (!_.isEmpty(diff)) {
            this.setState(diff);
        }
    }

    /**
     * Render component
     *
     * @return {[type]}
     */
    render() {
        let { text, className } = this.state;
        return <span className={`time ${className}`}>{text}</span>;
    }

    /**
     * Add update hook on mount
     */
    componentDidMount() {
        this.componentDidUpdate();
    }

    /**
     * Add update hook if relative
     */
    componentDidUpdate(prevProps, prevState) {
        let { className } = this.state;
        if (className === 'today' || className === 'yesterday') {
            if (!_.includes(relativeTimeComponents, this)) {
                relativeTimeComponents.push(this);
            }
        } else {
            _.pull(relativeTimeComponents, this);
        }
    }

    /**
     * Remove update hook on unmount
     */
    componentWillUnmount() {
        _.pull(relativeTimeComponents, this);
    }
}

let relativeTimeComponents = [];

function getDate(m) {
    return m.format('YYYY-MM-DD')
}

function updateTime() {
    // copy the list as components can be removed during an update
    let list = relativeTimeComponents.slice();
    _.each(list, (component) => {
        if (component) {
            component.update();
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
