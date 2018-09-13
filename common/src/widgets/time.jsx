import _ from 'lodash';
import React, { PureComponent } from 'react';
import Moment from 'moment';
import DateTracker from 'utils/date-tracker';

import Locale from 'locale/locale';

class Time extends PureComponent {
    static displayName = 'Time';

    constructor(props) {
        super(props);
        let time = Moment(this.props.time);
        this.state = {
            time: time,
            date: getDate(time),
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
        let t = nextProps.locale.translate;
        let locale = nextProps.locale.localeCode;
        let time = nextState.time.clone().locale(locale);
        let text;
        if (nextState.className === 'today') {
            let now = Moment();
            let elapsed = (now - time) * 0.001;
            if (elapsed < 60) {
                text = t('time-just-now');
            } else if (elapsed < 60 * 60) {
                let minutes = Math.floor(elapsed * (1 / 60));
                if (nextProps.compact) {
                    text = t('time-$min-ago', minutes);
                } else {
                    text = t('time-$minutes-ago', minutes);
                }
            } else {
                let hours = Math.floor(elapsed * (1 / 3600));
                if (nextProps.compact) {
                    text = t('time-$hr-ago', hours);
                } else {
                    text = t('time-$hours-ago', hours);
                }
            }
        } else if (nextState.className === 'yesterday') {
            text = t('time-yesterday');
        } else if (nextState.className === 'older') {
            if (nextProps.compact) {
                text = time.format('ll');
            } else {
                text = time.format('LL');
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
        let time = Moment(nextProps.time);
        nextState.time = time;
        nextState.date = getDate(time);
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
    Time.propTypes = {
        env: PropTypes.instanceOf(Environment).isRequired,
        time: PropTypes.string,
        compact: PropTypes.bool,
    };
}
