var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');
var Theme = require('theme/theme');

var StoryTypes = require('objects/types/story-types');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var Tooltip = require('widgets/tooltip');

require('./activity-tooltip.scss');

module.exports = React.createClass({
    displayName: 'ActivityTooltip',
    mixins: [ UpdateCheck ],
    propTypes: {
        statistics: PropTypes.object,
        locale: PropTypes.instanceOf(Locale),
        theme: PropTypes.instanceOf(Theme),
    },

    render: function() {
        if (this.props.statistics == null) {
            return null;
        }
        var t = this.props.locale.translate;
        var label = t('activity-tooltip-$count', this.props.statistics.total);
        if (this.props.statistics.total === undefined) {
            label = '-';
        }
        var list = [];
        _.each(StoryTypes, (type, i) => {
            var count = this.props.statistics[type];
            if (!count) {
                return;
            }
            var Icon = StoryTypes.icons[type];
            list.push(
                <div className="item" key={i}>
                    <Icon className="icon" />
                    {' '}
                    {t(`activity-tooltip-$count-${type}`, count)}
                </div>
            )
        });
        return (
            <Tooltip className="activity" disabled={this.props.disabled}>
                <inline>{label}</inline>
                <window>
                    {list}
                </window>
            </Tooltip>
        );
    }
});
