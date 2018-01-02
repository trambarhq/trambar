var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Moment = require('moment');

var Locale = require('locale/locale');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var Tooltip = require('widgets/tooltip');

module.exports = React.createClass({
    displayName: 'ModifiedTimeTooltip',
    propTypes: {
        time: PropTypes.string,
        disabled: PropTypes.bool,

        locale: PropTypes.instanceOf(Locale).isRequired,
    },

    /**
     * Set the text labels on mount
     */
    componentWillMount: function() {
        this.updateLabels();
    },

    /**
     * Update text labels on receiving new props
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        this.updateLabels(nextProps);
    },

    /**
     * Parse time string and format relative and absolute dates
     *
     * @param  {Object} props
     */
    updateLabels: function(props) {
        props = props || this.props;
        var m;
        if (props.time) {
            m = Moment(props.time);
            m.locale(props.locale.localeCode);
        };
        var state = {
            relativeTime: m ? m.fromNow() : null,
            absoluteTime: m ? m.format('lll') : null,
        };
        if (!_.isEqual(state, this.state)) {
            this.setState(state);
        }
    },

    render: function() {
        return (
            <Tooltip disabled={this.props.disabled}>
                <inline>{this.state.relativeTime}</inline>
                <window>{this.state.absoluteTime}</window>
            </Tooltip>
        );
    },

    componentDidMount: function() {
        instances.push(this);
    },

    componentWillUnmount: function() {
        _.pull(instances, this);
    }
});

var instances = [];

// refresh the labels every minute
setInterval(() => {
    _.each(instances, (instance) => {
        instance.updateLabels();
    });
}, 30 * 1000);
