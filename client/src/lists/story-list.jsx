var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var MemoizeWeak = require('memoizee/weak');
var Merger = require('data/merger');

var Database = require('data/database');
var UploadQueue = require('transport/upload-queue');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var OnDemand = require('widgets/on-demand');
var StoryView = require('views/story-view');
var StoryEditor = require('editors/story-editor');

require('./story-list.scss');

module.exports = Relaks.createClass({
    displayName: 'StoryList',
    propTypes: {
        showEditors: PropTypes.bool,
        stories: PropTypes.arrayOf(PropTypes.object),
        storyDrafts: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        queue: PropTypes.instanceOf(UploadQueue).isRequired,
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
        var nextState = {
            blankStory: null,
            priorStoryDrafts: [],
            storyDrafts: [],
            draftAuthors: [],
            pendingStories: [],
        };
        this.updateBlankStory(nextState, this.props);
        this.updateStoryDrafts(nextState, this.props);
        return nextState;
    },

    componentWillReceiveProps: function(nextProps) {
        var nextState = _.clone(this.state);
        if (this.props.currentUser !== nextProps.currentUser) {
            this.updateBlankStory(nextState, nextProps);
            nextState.priorStoryDrafts = [];
            nextState.storyDrafts = [];
            nextState.pendingStories = [];
            nextState.draftAuthors = [ nextProps.currentUser ];
        }
        if (this.props.storyDrafts !== nextProps.storyDrafts) {
            this.updateStoryDrafts(nextState, nextProps);
        }
        if (this.props.stories !== nextProps.stories) {
            this.updatePendingStories(nextState, nextProps);
        }
        var changes = _.pickBy(nextState, (value, name) => {
            return this.state[name] !== value;
        });
        if (!_.isEmpty(changes)) {
            this.setState(changes);
        }
    },

    updateBlankStory: function(nextState, nextProps) {
        nextState.blankStory = {
            id: undefined,  // without this _.find() wouldn't work
            user_ids: nextProps.currentUser ? [ nextProps.currentUser.id ] : [],
            details: {}
        };
    },

    updateStoryDrafts: function(nextState, nextProps) {
        var priorDrafts = nextState.priorStoryDrafts;
        var currentUser = nextProps.currentUser;
        var currentDrafts = nextState.storyDraft;
        var blankStory = nextState.blankStory;
        var nextDrafts;
        if (nextProps.storyDrafts) {
            nextDrafts = sortStoryDrafts(nextProps.storyDrafts, currentUser);
        }
        nextState.priorStoryDrafts = nextProps.storyDrafts;
        nextState.storyDrafts = _.map(nextDrafts, (nextDraft) => {
            var currentDraft = _.find(currentDrafts, { id: nextDraft.id });
            if (!currentDraft) {
                // maybe it's the saved copy of a new story
                if (nextDraft.user_ids[0] === currentUser.id) {
                    currentDraft = _.find(currentDrafts, { id: undefined });
                }
            }
            if (currentDraft) {
                var priorDraft = _.find(priorDrafts, { id: nextDraft.id });
                if (!priorDraft) {
                    priorDrafts = blankStory;
                }
                if (currentDraft !== prevDraft) {
                    // merge changes into remote copy
                    nextDraft = Merger.mergeObjects(currentDraft, nextDraft, priorDraft);
                }
            }

            // reattach blobs that are lost when the object is saved
            var queue = this.props.queue;
            if (!queue.attachResources(nextDraft)) {
                // not every file is available locally
                this.downloadStoryResources(nextDraft);
            }
            return nextDraft;
        });
        this.addUserDraft(nextState.storyDrafts, currentUser, blankStory);
    },

    updatePendingStories: function(nextState, nextProps) {
        var stories = nextProps.stories;
        var pendingStories = nextState.pendingStories;
        nextState.pendingStories = _.filter(pendingStories, (pendingStory) => {
            // it's still pending if it hasn't gotten onto the list
            if (!_.find(stories, { id: pendingStory.id })) {
                return true;
            }
        });
    },

    addUserDraft: function(storyDrafts, currentUser, blankStory) {
        var currentUserDraft = _.find(storyDrafts, (story) => {
            if (story.user_ids[0] === currentUser.id) {
                return true;
            }
        });
        if (!currentUserDraft) {
            // add empty story when current user doesn't have an active draft
            storyDrafts.unshift(blankStory);
        }
    },

    downloadStoryResources: function(story) {
        var queue = this.props.queue;
        return queue.downloadNextResource(story).then((succeeded) => {
            if (succeeded) {
                var update = (propName) => {
                    var stories = this.state[propName];
                    var index = _.findIndex(this.state.storyDrafts, { id: story.id });
                    if (index === -1) {
                        return false;
                    }
                    var currentDraft = stories[index];
                    var nextDraft = _.clone(currentDraft);
                    if (!queue.attachResources(nextDraft)) {
                        // more files to download
                        this.downloadStoryResources(nextDraft);
                    }
                    stories = _.slice(stories);
                    stories[index] = nextDraft;
                    var nextState = {};
                    nextState[propName] = stories;
                    this.setState(nextState);
                    return true;
                };
                return update('storyDrafts') || update('pendingStories');
            }
        });
    },

    renderAsync: function(meanwhile) {
        var route = this.props.route;
        var server = route.parameters.server;
        var schema = route.parameters.schema;
        var db = this.props.database.use({ server, schema, by: this });

        // render StoryListSync with previously retrieved props initially
        // so we can render it without delay
        if (!this.childProps) {
            this.childProps = {
                authors: null,
                reactions: null,
                respondents: null,
            };
        }
        var props = _.assign(this.childProps, {
            showEditors: this.props.showEditors,
            stories: this.props.stories,

            storyDrafts: this.state.storyDrafts,
            pendingStories: this.state.pendingStories,
            draftAuthors: this.state.draftAuthors,

            currentUser: this.props.currentUser,
            database: this.props.database,
            queue: this.props.queue,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            onStoryChange: this.handleStoryChange,
            onStoryCommit: this.handleStoryCommit,
            onStoryCancel: this.handleStoryCancel,
            loading: true,
        });
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
            if (props.currentUser) {
                userIds.push(props.currentUser.id);
            }
            var authorIds = _.uniq(userIds);
            if (authorIds.length > 1) {
                var criteria = {
                    id: authorIds
                };
                return db.find({ schema: 'global', table: 'user', criteria });
            }
        }).then((users) => {
            if (users) {
                props.draftAuthors = users;
            }
            props.loading = false;
            return <StoryListSync {...props} />;
        });
    },

    saveStory: function(story, delay) {
        if (this.autosaveTimeout) {
            clearTimeout(this.autosaveTimeout);
            this.autosaveTimeout = 0;
        }
        if (delay) {
            this.autosaveTimeout = setTimeout(() => {
                this.saveStory(story);
            }, delay);
            return;
        }
        var queue = this.props.queue;
        return queue.queueResources(story).then(() => {
            var route = this.props.route;
            var server = route.parameters.server;
            var schema = route.parameters.schema;
            var db = this.props.database.use({ server, schema, by: this });
            return db.saveOne({ table: 'story' }, story).then((copy) => {
                queue.sendResources(story);
                queue.attachResources(copy);
                return copy;
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
        var index = _.findIndex(storyDrafts, { id: story.id });
        if (index !== -1) {
            storyDrafts[index] = story;

            var delay;
            switch (evt.path) {
                case 'details.resources':
                case 'user_ids':
                    delay = 0;
                    break;
                default:
                    delay = 2000;
            }
            this.setState({ storyDrafts });
            this.saveStory(story, delay);
        }
    },

    handleStoryCommit: function(evt) {
        var story = _.clone(evt.story);
        story.published = true;
        var storyDrafts = _.slice(this.state.storyDrafts);
        var index = _.findIndex(storyDrafts, { id: story.id });
        if (index !== -1) {
            storyDrafts[index] = story;
            this.setState({ storyDrafts });
            return this.saveStory(story).then((story) => {
                if (story) {
                    var pendingStories = _.slice(this.state.pendingStories);
                    pendingStories.unshift(story);
                    this.setState({ pendingStories });
                }
            });
        }
        return Promise.resolve();
    },

    handleStoryCancel: function(evt) {
        var story = evt.story;
        var index = _.findIndex(this.state.storyDrafts, { id: story.id });
        // TODO: cancel uploads
        if (index !== -1) {
            // cancel a draft
            var storyDrafts = _.slice(this.state.storyDrafts);
            storyDrafts.splice(index, 1);
            this.addUserDraft(storyDrafts, this.props.currentUser, this.state.blankStory);
            this.setState({ storyDrafts });
            if (story.id > 0) {
                return this.removeStory(story);
            }
        }
        return Promise.resolve();
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
        queue: PropTypes.instanceOf(UploadQueue).isRequired,
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
        var authors = this.props.draftAuthors ? findAuthors(this.props.draftAuthors, story) : [];
        var editorProps = {
            story,
            authors,
            currentUser: this.props.currentUser,
            database: this.props.database,
            queue: this.props.queue,
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
        var authors = this.props.draftAuthors ? findAuthors(this.props.draftAuthors, story) : null;
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
        var reactions = this.props.reactions ? findReactions(this.props.reactions, story) : null;
        var authors = this.props.authors ? findAuthors(this.props.authors, story) : null;
        var respondents = this.props.respondents ? findRespondents(this.props.respondents, reactions) : null
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

var findReactions = MemoizeWeak(function(reactions, story) {
    if (story) {
        return _.filter(reactions, { story_id: story.id });
    } else {
        return [];
    }
});

var findAuthors = MemoizeWeak(function(users, story) {
    if (story) {
        return _.map(story.user_ids, (userId) => {
            return _.find(users, { id: userId }) || {}
        });
    } else {
        return [];
    }
});

var findRespondents = MemoizeWeak(function(users, reactions) {
    var respondentIds = _.uniq(_.map(reactions, 'user_id'));
    return _.map(respondentIds, (userId) => {
        return _.find(users, { id: userId }) || {}
    });
})
