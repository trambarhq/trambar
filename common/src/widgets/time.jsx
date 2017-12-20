var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Moment = require('moment');
var DateTracker = require('utils/date-tracker');

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
            date: getDate(time),
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
    },

    /**
     * Update text stored in state
     *
     * @param  {Object} nextState
     */
    updateText: function(nextState) {
        var lang = this.props.locale.languageCode;
        var time = nextState.time.clone().locale(lang);
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
        nextState.date = getDate(time);
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

function getDate(m) {
    return m.format('YYYY-MM-DD')
}

function updateTime() {
    _.each(relativeTimeComponents, (component) => {
        component.update();
    });
}

setInterval(updateTime, 15 * 1000);
