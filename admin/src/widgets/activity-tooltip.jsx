var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var Tooltip = require('widgets/tooltip');

module.exports = ActivityTooltip;

var storyTypes = [
    'push',
    'issue',
    'wiki',
    'milestone',
    'story',
    'survey',
    'task-list',
];

function ActivityTooltip(props) {
    if (props.dailyActivities == null) {
        return null;
    }
    var t = props.locale.translate;
    var dailyActivities = _.orderBy(props.dailyActivities, 'details.filters.time_range', 'desc');
    var selectedActivities = _.filter(props.dailyActivities, (stats, i) => {
        switch (props.month) {
            case 'all': return true;
            case 'this': return i === 0;
            case 'last': return i === 1;
        }
    });
    var total = countStory(activities)
    var label = t('activity-tooltip-$count', 0);
    var list = [];
    _.each(storyTypes, (type, i) => {
        var count = countStoryType(activities, type);
        if (!count) {
            return;
        }
        var icon;
        list.push(
            <div key={i}>
            </div>
        )
    });
    return (
        <Tooltip className="repository">
            <inline>{label}</inline>
            <window>
                {list}
            </window>
        </Tooltip>
    );
}

ActivityTooltip.propTypes = {
    repos: PropTypes.arrayOf(PropTypes.object),
    project: PropTypes.object.isRequired,
    locale: PropTypes.instanceOf(Locale),
    theme: PropTypes.instanceOf(Theme),
};

function countStory(dailyActivities) {
    var count = 0;
    _.each(dailyActivities, (stats) => {
        _.each(stats.details, (value) => {
            count += value;
        });
    });
    return count;
}

function countStoryType(dailyActivities, type) {
    var count = 0;
    _.each(dailyActivities, (stats) => {
        var value = stats.details[type];
        if (value) {
            count += value;
        }
    });
    return count;
}
