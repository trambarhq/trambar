var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var Tooltip = require('widgets/tooltip');

require('./activity-tooltip.scss');

var storyTypes = [
    'push',
    'issue',
    'milestone',
    'wiki',
    'member',
    'repo',
    'story',
    'survey',
    'task-list',
];

var icons = {
    'push': require('octicons/build/svg/repo-push.svg'),
    'issue': require('octicons/build/svg/issue-opened.svg'),
    'milestone': require('octicons/build/svg/milestone.svg'),
    'wiki': require('octicons/build/svg/file-text.svg'),
    'member': require('octicons/build/svg/person.svg'),
    'repo': require('octicons/build/svg/repo.svg'),
    'story': require('octicons/build/svg/note.svg'),
    'survey': require('octicons/build/svg/list-unordered.svg'),
    'task-list': require('octicons/build/svg/list-ordered.svg'),
};

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
        _.each(storyTypes, (type, i) => {
            var count = this.props.statistics[type];
            if (!count) {
                return;
            }
            var Icon = icons[type];
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
