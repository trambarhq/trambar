var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var MemoizeWeak = require('memoizee/weak');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var OnDemand = require('widgets/on-demand');
var StoryView = require('widgets/story-view');

module.exports = Relaks.createClass({
    displayName: 'StoryList',
    mixings: [ UpdateCheck ],
    propTypes: {
        stories: PropTypes.arrayOf(PropTypes.object).isRequired,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    renderAsync: function(meanwhile) {
        var route = this.props.route;
        var server = route.parameters.server;
        var schema = route.parameters.schema;
        var db = this.props.database.use({ server, schema, by: this });
        var props = {
            reactions: null,
            users: null,
            currentUser: null,

            stories: this.props.stories,
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            loading: true,
        };
        meanwhile.show(<StoryListSync {...props} />);
        return db.start().then((userId) => {
            // load current user
            var criteria = {};
            criteria.id = userId;
            return db.findOne({ schema: 'global', table: 'user', criteria });
        }).then((currentUser) => {
            props.currentUser = currentUser;
        }).then(() => {
            // load authors of stories
            var criteria = {};
            criteria.id = _.uniq(_.flatten(_.map(props.stories, 'user_ids')));
            return db.find({ schema: 'global', table: 'user', criteria });
        }).then((users) => {
            props.users = users;
            meanwhile.show(<StoryListSync {...props} />);
        }).then(() => {
            // load reactions to stories
            var criteria = {};
            criteria.story_id = _.map(props.stories, 'id');
            return db.find({ table: 'reaction', criteria });
        }).then((reactions) => {
            props.reactions = reactions;
            meanwhile.show(<StoryListSync {...props} />);
        }).then(() => {
            // load users of reactions
            var criteria = {};
            criteria.id = _.map(props.reactions, 'user_id').filter((userId) => {
                // don't ask for the ones we have already
                return !_.find(props.users, { id: userId });
            });
            return db.find({ schema: 'global', table: 'user', criteria });
        }).then((users) => {
            props.users = _.concat(props.users, users),
            props.loading = false;
            return <StoryListSync {...props} />;
        });
    }
});

var StoryListSync = module.exports.Sync = React.createClass({
    displayName: 'StoryList.Sync',
    mixins: [ UpdateCheck ],
    propTypes: {
        stories: PropTypes.arrayOf(PropTypes.object).isRequired,
        reactions: PropTypes.arrayOf(PropTypes.object),
        users: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object.isRequired,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
        loading: PropTypes.bool,
    },

    render: function() {
        var stories = this.props.stories ? sortStories(this.props.stories) : null;
        return (
            <div className="story-list">
                {_.map(stories, this.renderStory)}
            </div>
        );
    },

    renderStory: function(story, index) {
        var respondentIds = _.map(this.props.reactions, 'id');
        var storyProps = {
            story,
            reactions: this.props.reactions ? findReactions(this.props.reactions, story.id) : null,
            authors: this.props.users ? findUsers(this.props.users, story.user_ids) : null,
            respondents: this.props.users ? findUsers(this.props.users, respondentIds) : null,
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            key: story.id,
        };
        return (
            <OnDemand key={story.id} type="stories" initial={index < 10}>
                <StoryView {...storyProps} />
            </OnDemand>
        );
    },
});

var sortStories = MemoizeWeak(function(stories) {
    return _.orderBy(stories, [ 'ptime' ], [ 'desc' ]);
});

var findReactions = MemoizeWeak(function(reactions, storyId) {
    return _.filter(reactions, { story_id: storyId });
});

var findUsers = MemoizeWeak(function(users, userIds) {
    return _.map(_.uniq(userIds), (userId) => {
       return _.find(users, { id: userId }) || {}
    });
});
