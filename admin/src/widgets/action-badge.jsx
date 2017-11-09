var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');

module.exports = ActionBadge;

require('./action-badge.scss')

function ActionBadge(props) {
    var t = props.locale.translate;
    var className = 'action-badge', icon;
    switch (props.type) {
        case 'restore':
        case 'reactivate':
            className += ' add';
            icon = 'plus';
            break;
        case 'archive':
        case 'disable':
            className += ' remove';
            icon = 'times';
            break;
    }
    var label = t(`action-badge-${props.type}`);
    return (
        <div className={className}>
            <i className={`fa fa-${icon}`} /> {label}
        </div>
    );
}

ActionBadge.propTypes = {
    type: PropTypes.string.isRequired,
    locale: PropTypes.instanceOf(Locale).isRequired,
};
