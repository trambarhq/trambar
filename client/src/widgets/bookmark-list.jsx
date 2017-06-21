var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var MemoizeWeak = require('memoizee/weak');
var Merger = require('data/merger');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var OnDemand = require('widgets/on-demand');
var StoryView = require('widgets/story-view');
var StoryEditor = require('widgets/story-editor');

require('./bookmark-list.scss');

module.exports = Relaks.createClass({
    displayName: 'BookmarkList',
    propTypes: {
        bookmarks: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,

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
            stories: null,
            authors: null,
            bookmarkers: null,
            reactions: null,
            respondents: null,

            bookmarks: this.props.bookmarks,
            currentUser: this.props.currentUser,
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            onStoryChange: this.handleStoryChange,
            onStoryCommit: this.handleStoryCommit,
            onStoryCancel: this.handleStoryCancel,
        };
        meanwhile.show(<BookmarkListSync {...props} />);
        return db.start().then((userId) => {
            // load stories
            var criteria = {}
            criteria.id = _.map(props.bookmarks, 'story_id');
            return db.find({ table: 'story', criteria });
        }).then((stories) => {
            props.stories = stories
        }).then(() => {
            // load authors of stories
            var criteria = {};
            criteria.id = _.uniq(_.flatten(_.map(props.stories, 'user_ids')));
            return db.find({ schema: 'global', table: 'user', criteria });
        }).then((users) => {
            props.authors = users;
            meanwhile.show(<BookmarkListSync {...props} />);
        }).then(() => {
            var criteria = {};
            criteria.id = _.flatten(_.map(props.bookmarks, 'user_ids'));
            return db.find({ schema: 'global', table: 'user', criteria });
        }).then((users) => {
            props.bookmarkers = users;
            meanwhile.show(<BookmarkListSync {...props} />);
        }).then(() => {
            // load reactions to stories
            var criteria = {};
            criteria.story_id = _.map(props.stories, 'id');
            return db.find({ table: 'reaction', criteria });
        }).then((reactions) => {
            props.reactions = reactions;
            meanwhile.show(<BookmarkListSync {...props} />);
        }).then(() => {
            // load users of reactions
            var criteria = {};
            criteria.id = _.map(props.reactions, 'user_id');
            return db.find({ schema: 'global', table: 'user', criteria });
        }).then((users) => {
            props.respondents = users;
            return <BookmarkListSync {...props} />;
        });
    },

    saveStory: function(story) {
        var queue = this.props.queue;
        return queue.queueResources(story).then(() => {
            var route = this.props.route;
            var server = route.parameters.server;
            var schema = route.parameters.schema;
            var db = this.props.database.use({ server, schema, by: this });
            return db.saveOne({ table: 'story' }, story).then((copy) => {
                return queue.sendResources(story);
            });
        });
    },

    removeStory: function(story) {
        var route = this.props.route;
        var server = route.parameters.server;
        var schema = route.parameters.schema;
        var db = this.props.database.use({ server, schema, by: this });
        return db.removeOne({ table: 'story' }, story);
    },

    handleStoryChange: function(evt) {
        var story = evt.story;
        var storyDrafts = _.slice(this.state.storyDrafts);
        var index = _.findIndex(storyDrafts, (s) => {
            return s.id === story.id;
        });
        storyDrafts[index] = story;
        this.setState({ storyDrafts });
        return this.saveStory(story);
    },

    handleStoryCommit: function(evt) {

    },

    handleStoryCancel: function(evt) {

    },
});

var BookmarkListSync = module.exports.Sync = React.createClass({
    displayName: 'BookmarkList.Sync',
    mixins: [ UpdateCheck ],
    propTypes: {
        bookmarks: PropTypes.arrayOf(PropTypes.object),
        bookmarkers: PropTypes.arrayOf(PropTypes.object),
        stories: PropTypes.arrayOf(PropTypes.object),
        authors: PropTypes.arrayOf(PropTypes.object),
        reactions: PropTypes.arrayOf(PropTypes.object),
        respondents: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
        loading: PropTypes.bool,

        onStoryChange: PropTypes.func,
        onStoryCommit: PropTypes.func,
        onStoryCancel: PropTypes.func,
    },

    render: function() {
        return (
            <div className="story-list">
                {this.renderBookmarks()}
            </div>
        );
    },

    renderBookmarks: function() {
        var bookmarks = this.props.bookmarks ? sortBookmark(this.props.bookmarks) : null;
        return _.map(bookmarks, this.renderBookmark);
    },

    renderBookmark: function(bookmark, index) {
        var story = this.props.stories ? findStory(this.props.stories, bookmark.story_id) : null;
        var reactions = this.props.reactions && story ? findReactions(this.props.reactions, story.id) : null;
        var authors = this.props.authors && story ? findUsers(this.props.authors, story.user_ids) : null;
        var respondentIds = _.map(reactions, 'user_id');
        var respondents = this.props.respondents ? findUsers(this.props.respondents, respondentIds) : null
        var storyProps = {
            story,
            reactions,
            authors,
            respondents,
            currentUser: this.props.currentUser,
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

var sortBookmark = MemoizeWeak(function(bookmarks) {
    return _.orderBy(bookmarks, [ 'id' ], [ 'desc' ]);
});

var findStory = MemoizeWeak(function(stories, storyId) {
    return _.find(stories, { id: storyId });
});

var findReactions = MemoizeWeak(function(reactions, storyId) {
    return _.filter(reactions, { story_id: storyId });
});

var findUsers = MemoizeWeak(function(users, userIds) {
    return _.map(_.uniq(userIds), (userId) => {
       return _.find(users, { id: userId }) || {}
    });
});
