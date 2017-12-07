var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Moment = require('moment');

var Locale = require('locale/locale');

module.exports = React.createClass({
    displayName: 'Time',
    propTypes: {
        locale: PropTypes.instanceOf(Locale).isRequired,
        time: PropTypes.string,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        var time = Moment(this.props.time);
        var nextState = {
            time: time,
            day: time.clone().startOf('day'),
        };
        this.updateClassName(nextState);
        this.updateText(nextState);
        return nextState;
    },

    /**
     * Update class name stored in state
     *
     * @param  {Object} nextState
     */
    updateClassName: function(nextState) {
        var className;
        if (nextState.time.isValid()) {
            var elapsedDays = (lastRecordedDay - nextState.day) / (24 * 60 * 60 * 1000);
            if (elapsedDays === 0) {
                className = 'today';
            } else if (elapsedDays === 1) {
                className = 'yesterday';
            } else {
                className = 'older';
            }
        } else {
            className = 'invalid';
        }
        nextState.className = className;
    },

    /**
     * Update text stored in state
     *
     * @param  {Object} nextState
     */
    updateText: function(nextState) {
        var time = nextState.time.clone().locale(this.props.locale.languageCode);
        var text;
        if (nextState.className === 'today') {
            text = _.capitalize(time.fromNow());
        } else if (nextState.className === 'yesterday') {
            var t = this.props.locale.translate;
            text = t('time-yesterday');
        } else if (nextState.className === 'older') {
            text = time.format('ll');
        } else {
            text = '';
        }
        nextState.text = text;
    },

    /**
     * Update text after passage of time
     */
    update: function() {
        var nextState = _.clone(this.state);
        this.updateClassName(nextState);
        this.updateText(nextState);
        var diff = _.shallowDiff(nextState, this.state);
        if (!_.isEmpty(diff)) {
            this.setState(diff);
        }
    },

    /**
     * Update state on prop changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        var nextState = _.clone(this.state);
        var time = Moment(nextProps.time);
        nextState.time = time;
        nextState.day = time.clone().startOf('day');
        this.updateClassName(nextState);
        this.updateText(nextState);
        var diff = _.shallowDiff(nextState, this.state);
        if (!_.isEmpty(diff)) {
            this.setState(diff);
        }
    },

    /**
     * Render component
     *
     * @return {[type]}
     */
    render: function() {
        return (
            <span className={`time ` + this.state.className}>
                {this.state.text}
            </span>
        );
    },

    /**
     * Add update hook on mount
     */
    componentDidMount: function() {
        this.componentDidUpdate();
    },

    /**
     * Add update hook if relative
     */
    componentDidUpdate: function(prevProps, prevState) {
        if (this.state.className === 'today' || this.state.className === 'yesterday') {
            if (!_.includes(relativeTimeComponents, this)) {
                relativeTimeComponents.push(this);
            }
        } else {
            _.pull(relativeTimeComponents, this);
        }
    },

    /**
     * Remove update hook on unmount
     */
    componentWillUnmount: function() {
        _.pull(relativeTimeComponents, this);
    },
})

var relativeTimeComponents = [];
var lastRecordedTime, lastRecordedDay;

function recordTime() {
    lastRecordedTime = Moment();
    lastRecordedDay = lastRecordedTime.clone().startOf('day');
}

function updateTime() {
    recordTime();
    _.each(relativeTimeComponents, (component) => {
        component.update();
    });
}

setInterval(updateTime, 30 * 1000);
recordTime();
