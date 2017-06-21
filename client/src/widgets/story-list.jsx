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

require('./story-list.scss');

module.exports = Relaks.createClass({
    displayName: 'StoryList',
    propTypes: {
        showEditors: PropTypes.bool,
        stories: PropTypes.arrayOf(PropTypes.object),
        storyDrafts: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    getDefaultProps: function() {
        return {
            showEditors: false,
        };
    },

    getInitialState: function() {
        return {
            blankStory: this.updateBlankStory(this.props.currentUser),
            priorStoryDrafts: [],
            storyDrafts: [],
            pendingStories: [],
        };
    },

    componentWillMount: function() {
        this.setState({
            storyDrafts: this.updateStoryDrafts(this.state.priorStoryDrafts, this.props.storyDrafts, this.props.currentUser)
        });
    },

    componentWillReceiveProps: function(nextProps) {
        var nextState = {};
        if (this.props.currentUser !== nextProps.currentUser) {
            nextState.blankStory = this.updateBlankStory(nextProps.currentUser);
            nextState.priorStoryDrafts = [];
            nextState.storyDrafts = [];
            nextState.pendingStories = [];
        } else if (this.props.storyDrafts !== nextProps.storyDrafts) {
            if (nextProps.storyDrafts) {
                nextState.storyDrafts = this.updateStoryDrafts(this.state.priorStoryDrafts, nextProps.storyDrafts, nextProps.currentUser);
                nextState.priorStoryDrafts = nextProps.storyDrafts;
            }
        }
        if (!_.isEmpty(nextState)) {
            this.setState(nextState);
        }
    },

    updateStoryDrafts: function(prevDrafts, nextDrafts, currentUser) {
        nextDrafts = nextDrafts ? sortStoryDrafts(nextDrafts, currentUser) : [];
        var storyDrafts = _.each(nextDrafts, (nextDraft) => {
            var currentDraft = _.find(this.state.storyDrafts, { id: nextDraft.id });
            if (!currentDraft) {
                // maybe it's the saved copy of a new story
                if (nextDraft.user_ids[0] === currentUser.id) {
                    currentDraft = _.find(this.state.storyDrafts, { id: undefined });
                }
            }
            if (currentDraft) {
                var prevDraft = _.find(prevDrafts, { id: nextDraft.id });
                if (!prevDraft) {
                    prevDraft = this.state.blankStory;
                }
                if (currentDraft !== prevDraft) {
                    // merge changes into remote copy
                    return Merger.mergeObjects(currentDraft, nextDraft, prevDraft);
                }
            }
            return nextDraft;
        });
        if (storyDrafts.length === 0 || storyDrafts[0].user_ids[0] !== currentUser.id) {
            // add empty story when current user doesn't have an active draft
            storyDrafts.unshift(this.state.blankStory);
        }
        return storyDrafts;
    },

    updateBlankStory: function(currentUser) {
        return {
            user_ids: currentUser ? [ currentUser.id ] : [],
            details: {}
        };
    },

    renderAsync: function(meanwhile) {
        var route = this.props.route;
        var server = route.parameters.server;
        var schema = route.parameters.schema;
        var db = this.props.database.use({ server, schema, by: this });
        var props = {
            authors: null,
            reactions: null,
            respondents: null,

            showEditors: this.props.showEditors,
            stories: this.props.stories,
            storyDrafts: this.state.storyDrafts,
            pendingStories: this.state.pendingStories,
            draftAuthors: [ this.props.currentUser ],

            currentUser: this.props.currentUser,
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            onStoryChange: this.handleStoryChange,
            onStoryCommit: this.handleStoryCommit,
            onStoryCancel: this.handleStoryCancel,
            loading: true,
        };
        meanwhile.show(<StoryListSync {...props} />);
        return db.start().then((userId) => {
            // load authors of stories
            var criteria = {};
            criteria.id = _.uniq(_.flatten(_.map(props.stories, 'user_ids')));
            return db.find({ schema: 'global', table: 'user', criteria });
        }).then((users) => {
            props.authors = users;
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
            criteria.id = _.map(props.reactions, 'user_id');
            return db.find({ schema: 'global', table: 'user', criteria });
        }).then((users) => {
            props.respondents = users;
        }).then(() => {
            // load other authors also working on drafts
            var userIds = _.concat(
                _.flatten(_.map(props.storyDrafts, 'user_ids')),
                _.flatten(_.map(props.pendingStories, 'user_ids')),
            );
            var coauthorIds = _.uniq(userIds);
            if (props.currentUser) {
                coauthorIds = _.difference(coauthorIds, [ props.currentUser.id ]);
            }
            if (coauthorIds.length > 0) {
                var criteria = {
                    id: coauthorIds
                };
                return db.find({ schema: 'global', table: 'user', criteria });
            }
        }).then((users) => {
            if (users) {
                props.draftAuthors = _.concat(props.draftAuthors, users);
            }
            props.loading = false;
            return <StoryListSync {...props} />;
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

var StoryListSync = module.exports.Sync = React.createClass({
    displayName: 'StoryList.Sync',
    mixins: [ UpdateCheck ],
    propTypes: {
        stories: PropTypes.arrayOf(PropTypes.object),
        authors: PropTypes.arrayOf(PropTypes.object),
        reactions: PropTypes.arrayOf(PropTypes.object),
        respondents: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,

        storyDrafts: PropTypes.arrayOf(PropTypes.object),
        pendingStories: PropTypes.arrayOf(PropTypes.object),
        draftAuthors: PropTypes.arrayOf(PropTypes.object),

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
                {this.renderEditors()}
                {this.renderPendingStories()}
                {this.renderPublishedStories()}
            </div>
        );
    },

    renderEditors: function() {
        if (!this.props.showEditors) {
            return null;
        }
        return _.map(this.props.storyDrafts, this.renderEditor);
    },

    renderEditor: function(story, index) {
        // always use 0 as the key for the top story, so we don't lose focus
        // when the new story acquires an id after being saved automatically
        var key = (index > 0) ? story.id : 0;
        var authors = this.props.draftAuthors ? findUsers(this.props.draftAuthors, story.user_ids) : [];
        var editorProps = {
            story,
            authors,
            currentUser: this.props.currentUser,
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            onChange: this.props.onStoryChange,
            onCommit: this.props.onStoryCommit,
            onCancel: this.props.onStoryCancel,
            key,
        };
        return <StoryEditor {...editorProps}/>
    },

    renderPendingStories: function() {
        if (!this.props.showEditors) {
            return null;
        }
        var pendingStories = this.props.pendingStories ? sortStories(this.props.pendingStories) : null;
        return _.map(pendingStories, this.renderPendingStory);
    },

    renderPendingStory: function(story, index) {
        var authors = this.props.draftAuthors ? findUsers(this.props.draftAuthors, story.user_ids) : null;
        var storyProps = {
            story,
            authors,
            currentUser: this.props.currentUser,
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            pending: true,
            key: story.id,
        };
        return <StoryView {...storyProps} />;
    },

    renderPublishedStories: function() {
        var stories = this.props.stories ? sortStories(this.props.stories) : null;
        return _.map(stories, this.renderPublishedStory);
    },

    renderPublishedStory: function(story, index) {
        var reactions = this.props.reactions ? findReactions(this.props.reactions, story.id) : null;
        var authors = this.props.authors ? findUsers(this.props.authors, story.user_ids) : null;
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

var sortStories = MemoizeWeak(function(stories) {
    return _.orderBy(stories, [ 'ptime' ], [ 'desc' ]);
});

var sortStoryDrafts = MemoizeWeak(function(stories, currentUser) {
    // current user's own stories are listed first
    var ownStory = function(story) {
        return story.user_ids[0] === currentUser.id;
    };
    return _.orderBy(stories, [ ownStory, 'id' ], [ 'desc', 'desc' ]);
});

var findReactions = MemoizeWeak(function(reactions, storyId) {
    return _.filter(reactions, { story_id: storyId });
});

var findUsers = MemoizeWeak(function(users, userIds) {
    return _.map(_.uniq(userIds), (userId) => {
       return _.find(users, { id: userId }) || {}
    });
});
