var React = require('react'), PropTypes = React.PropTypes;
var Moment = require('moment');

var Tooltip = require('widgets/tooltip');

module.exports = ModifiedTimeTooltip;

function ModifiedTimeTooltip(props) {
    var m = Moment(props.time);
    var label = m.fromNow();
    var contents = m.format('lll');
    return (
        <Tooltip>
            <inline>{label}</inline>
            <window>{contents}</window>
        </Tooltip>
    );
}

ModifiedTimeTooltip.propTypes = {
    time: PropTypes.string.isRequired,
};
