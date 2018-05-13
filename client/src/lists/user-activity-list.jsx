var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Memoize = require('utils/memoize');
var DateTracker = require('utils/date-tracker');

var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var ProfileImage = require('widgets/profile-image');
var Time = require('widgets/time');

require('./user-activity-list.scss');

module.exports = React.createClass({
    displayName: 'UserActivityList',
    mixins: [ UpdateCheck ],
    propTypes: {
        user: PropTypes.object,
        stories: PropTypes.arrayOf(PropTypes.object),
        storyCountEstimate: PropTypes.number,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        if (this.props.stories) {
            var stories = sortStories(this.props.stories);
            return (
                <div className="user-activity-list">
                    {_.map(stories, this.renderActivity)}
                </div>
            );
        } else {
            var indices = _.range(0, this.props.storyCountEstimate);
            return (
                <div className="user-activity-list">
                    {_.map(indices, this.renderActivityPlaceholder)}
                </div>
            );
        }
    },

    /**
     * Render a brief description about a story
     *
     * @param  {Story} story
     *
     * @return {ReactElement}
     */
    renderActivity: function(story) {
        var route = this.props.route;
        var components = [
            require('pages/people-page'),
            require('lists/story-list')
        ];
        var params = _.pick(route.parameters, 'schema', 'date', 'search');
        params.user = this.props.user.id;
        params.story = story.id;
        params.highlighting = true;
        var url = route.find(components, params);
        var text = this.renderText(story);
        var labelClass = 'label';
        var time = story.btime || story.ptime;
        if (time >= DateTracker.todayISO || time >= DateTracker.yesterdayISO) {
            labelClass += ' recent';
        }
        return (
            <div key={story.id} className="activity">
                <Time time={story.ptime} locale={this.props.locale} compact={true} />
                <div className={labelClass}>
                    <a href={url}>{text}</a>
                </div>
            </div>
        );
    },

    /**
     * Render a placeholder
     *
     * @param  {Number} index
     *
     * @return {ReactElement}
     */
    renderActivityPlaceholder: function(index) {
        return <div key={index} className="activity">{'\u00a0'}</div>;
    },

    /**
     * Return short summary about story
     *
     * @param  {Story} story
     *
     * @return {String}
     */
    renderText: function(story) {
        var t = this.props.locale.translate;
        var n = this.props.locale.name;
        var user = this.props.user;
        var name = n(_.get(user, 'details.name'), _.get(user, 'details.gender'));
        switch (story.type) {
            case 'push':
                return t(`user-activity-$name-pushed-code`, name);
            case 'merge':
                return t(`user-activity-$name-merged-code`, name);
            case 'branch':
                return t(`user-activity-$name-created-branch`, name);
            case 'issue':
                return t(`user-activity-$name-reported-issue`, name);
            case 'milestone':
                return t(`user-activity-$name-created-milestone`, name);
            case 'merge-request':
                return t(`user-activity-$name-created-merge-request`, name);
            case 'wiki':
                return t(`user-activity-$name-edited-wiki-page`, name);
            case 'member':
            case 'repo':
                var action = story.details.action;
                return t(`user-activity-$name-${action}-repo`, name);
            case 'post':
                var resources = story.details.resources;
                var counts = _.countBy(resources, 'type');
                if (counts.video > 0) {
                    return t(`user-activity-$name-posted-$count-video-clips`, name, counts.video);
                } else if (counts.image > 0) {
                    return t(`user-activity-$name-posted-$count-pictures`, name, counts.image);
                } else if (counts.audio > 0) {
                    return t(`user-activity-$name-posted-$count-audio-clips`, name, counts.audio);
                } else if (counts.website > 0) {
                    return t(`user-activity-$name-posted-$count-links`, name, counts.website);
                } else {
                    return t(`user-activity-$name-wrote-post`, name);
                }
            case 'survey':
                return t(`user-activity-$name-started-survey`, name);
            case 'task-list':
                return t(`user-activity-$name-started-task-list`, name);
            default:
                return story.type;
        }
    },
});

var sortStories = Memoize(function(stories) {
    stories = _.orderBy(stories, [ getStoryTime ], [ 'desc' ]);
    return stories;
});

var getStoryTime = function(story) {
    return story.btime || story.ptime;
};
