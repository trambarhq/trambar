var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var MemoizeWeak = require('memoizee/weak');
var Merger = require('data/merger');

var Database = require('data/database');
var Payloads = require('transport/payloads');
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
        payloads: PropTypes.instanceOf(Payloads).isRequired,
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
        this.autosaveTimeouts = {};
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

            // reattach blobs lost after saving
            var payloads = this.props.payloads;
            var resources = _.get(nextDraft, 'details.resources');
            _.each(resources, (res) => {
                // these properties also exist in the corresponding payload objects
                var criteria = _.pick(res, 'payload_id', 'url', 'poster_url');
                var payload = payloads.find(criteria);
                if (payload) {
                    // blob are stored under the same names as well
                    var blobs = _.pickBy(payload, (value) => {
                        return value instanceof Blob;
                    });
                    _.assign(res, blobs);
                }
            });
            return nextDraft;
        });
        addBlankDraft(nextState.storyDrafts, currentUser, blankStory);
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
            storyDrafts: this.state.storyDrafts,
            pendingStories: this.state.pendingStories,
            draftAuthors: this.state.draftAuthors,

            showEditors: this.props.showEditors,
            stories: this.props.stories,
            currentUser: this.props.currentUser,
            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            onStoryChange: this.handleStoryChange,
            onStoryCommit: this.handleStoryCommit,
            onStoryCancel: this.handleStoryCancel,
            onStoryEdit: this.handleStoryEdit,
            onStoryBookmark: this.handleStoryBookmark,
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
        }).then(() => {
            // look for bookmark sent by current user
            if (props.currentUser) {
                var criteria = {
                    story_id: _.map(props.stories, 'id'),
                    user_ids: [ props.currentUser.id ],
                };
                return db.find({ table: 'bookmark', criteria });
            }
        }).then((recommendations) => {
            props.recommendations = recommendations;
            return <StoryListSync {...props} />;
        }).then(() => {
            // look for recipient of these bookmarks
            if (props.recommendations) {
                var criteria = {
                    id: _.map(props.recommendations, 'target_user_id')
                };
                return db.find({ schema: 'global', table: 'user', criteria });
            }
        }).then((recipients) => {
            props.recipients = recipients;
            return <StoryListSync {...props} />;
        });
    },

    autosaveStory: function(story, delay) {
        if (delay) {
            if (this.autosaveTimeouts[story.id]) {
                clearTimeout(this.autosaveTimeouts[story.id]);
            }
            this.autosaveTimeouts[story.id] = setTimeout(() => {
                this.saveStory(story);
            }, delay);
        } else {
            this.saveStory(story);
        }
    },

    saveStory: function(story) {
        // clear autosave timeout
        if (this.autosaveTimeouts[story.id]) {
            clearTimeout(this.autosaveTimeouts[story.id]);
            this.autosaveTimeouts = _.omit(this.autosaveTimeouts, story.id);
        }

        // send images and videos to server
        var resources = story.details.resources || [];
        var payloads = this.props.payloads;
        var payloadIds = [];
        return Promise.each(resources, (res) => {
            if (!res.payload_id) {
                return payloads.queue(res).then((payloadId) => {
                    if (payloadId) {
                        res.payload_id = payloadId;
                        payloadIds.push(payloadId);
                    }
                });
            }
        }).then(() => {
            var route = this.props.route;
            var server = route.parameters.server;
            var schema = route.parameters.schema;
            var db = this.props.database.use({ server, schema, by: this });
            return db.start().then(() => {
                return db.saveOne({ table: 'story' }, story).then((copy) => {
                    return Promise.each(payloadIds, (payloadId) => {
                        return payloads.send(payloadId);
                    }).return(copy);
                });
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

    /**
     * Save bookmarks to remote database
     *
     * @param  {Array<Bookmark>} bookmarks
     *
     * @return {Promise<Array<Bookmark>>}
     */
    saveBookmarks: function(bookmarks) {
        if (_.isEmpty(bookmarks)) {
            return Promise.resolve([]);
        }
        var route = this.props.route;
        var server = route.parameters.server;
        var schema = route.parameters.schema;
        var db = this.props.database.use({ server, schema, by: this });
        return db.start().then(() => {
            return db.save({ table: 'bookmark' }, bookmarks);
        });
    },

    /**
     * Remove bookmarks from remote database
     *
     * @param  {Array<Bookmark>} bookmarks
     *
     * @return {Promise<Array<Bookmark>>}
     */
    removeBookmarks: function(bookmarks) {
        if (_.isEmpty(bookmarks)) {
            return Promise.resolve([]);
        }
        var route = this.props.route;
        var server = route.parameters.server;
        var schema = route.parameters.schema;
        var db = this.props.database.use({ server, schema, by: this });
        return db.start().then(() => {
            return db.remove({ table: 'bookmark' }, bookmarks);
        });
    },

    /**
     * Called when user makes changes to a story
     *
     * @param  {Object} evt
     *
     * @return {Promise<Object>}
     */
    handleStoryChange: function(evt) {
        var story = evt.story;
        var index = _.findIndex(this.state.storyDrafts, { id: story.id });
        if (index !== -1) {
            // preserve changes in state first
            return new Promise((resolve, reject) => {
                var storyDrafts = _.slice(this.state.storyDrafts);
                storyDrafts[index] = story;

                var delay;
                switch (evt.path) {
                    // save changes immediately when resources or
                    // co-authors are added
                    case 'details.resources':
                    case 'user_ids':
                        delay = 0;
                        break;
                    default:
                        delay = 2000;
                }
                this.autosaveStory(story, delay);
                this.setState({ storyDrafts }, () => {
                    resolve(story);
                });
            });
        } else {
            // coming from StoryView--save immediately
            return this.saveStory(story);
        }
    },

    /**
     * Called when user posts a new story or finish editting a published one
     *
     * @param  {Object} evt
     *
     * @return {Promise<Object>}
     */
    handleStoryCommit: function(evt) {
        var story = evt.story;
        var storyDrafts = _.map(this.state.storyDrafts, (s) => {
            return (s.id === story.id) ? story : s;
        });
        this.setState({ storyDrafts });
        return this.saveStory(story).then((copy) => {
            if (!story.published_version_id) {
                var pendingStories = _.concat(story, this.state.pendingStories);
                this.setState({ pendingStories });
            }
        });
    },

    /**
     * Called when user cancel a new story
     *
     * @param  {Object} evt
     *
     * @return {Promise<Story>}
     */
    handleStoryCancel: function(evt) {
        // TODO: cancel uploads
        var story = evt.story;
        var storyDrafts = _.filter(this.state.storyDrafts, (s) => {
            return (s.id === story.id);
        });
        addBlankDraft(storyDrafts, this.props.currentUser, this.state.blankStory);
        this.setState({ storyDrafts });
        if (story.id > 0) {
            return this.removeStory(story);
        } else {
            return Promise.resolve(null);
        }
    },

    /**
     * Called when a user wants to edit a published story
     *
     * @param  {Object} evt
     *
     * @return {Promise<Story>}
     */
    handleStoryEdit: function(evt) {
        var story = evt.story;
        var tempCopy = _.omit(story, 'id', 'ptime');
        tempCopy.published_version_id = story.id;
        tempCopy.published = false;
        return this.saveStory(tempCopy);
    },

    /**
     * Called when a user wants create bookmarks to a story
     *
     * @param  {Object} evt
     *
     * @return {Promise<Story>}
     */
    handleStoryBookmark: function(evt) {
        var recipientIds = evt.selection;
        var story = evt.story;
        var userId = this.props.currentUser.id;
        var bookmarks = findRecommendations(this.childProps.recommendations, story);
        var newBookmarks = [];
        // add bookmarks that don't exist yet
        _.each(recipientIds, (recipientId) => {
            if (!_.find(bookmarks, { target_user_id: recipientId })) {
                var newBookmark = {
                    story_id: story.id,
                    user_ids: [ userId ],
                    target_user_id: recipientId,
                };
                newBookmarks.push(newBookmark);
            }
        });
        // delete bookmarks that aren't needed anymore
        // the backend will handle the fact a bookmark can belong to multiple users
        var redundantBookmarks = [];
        _.each(bookmarks, (bookmark) => {
            if (!_.includes(recipientIds, bookmark.target_user_id)) {
                redundantBookmarks.push(bookmark);
            }
        });
        return this.saveBookmarks(newBookmarks).then((newBookmarks) => {
            return this.removeBookmarks(redundantBookmarks).then((redundantBookmarks) => {
                return _.concat(newBookmarks, redundantBookmarks);
            });
        });
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
        recommendations: PropTypes.arrayOf(PropTypes.object),
        recipients: PropTypes.arrayOf(PropTypes.object),

        currentUser: PropTypes.object,

        storyDrafts: PropTypes.arrayOf(PropTypes.object),
        pendingStories: PropTypes.arrayOf(PropTypes.object),
        draftAuthors: PropTypes.arrayOf(PropTypes.object),

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onStoryChange: PropTypes.func,
        onStoryCommit: PropTypes.func,
        onStoryCancel: PropTypes.func,
        onStoryEdit: PropTypes.func,
        onStoryBookmark: PropTypes.func,
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

    /**
     * Render editors for new drafts at the top of the page
     *
     * @return {Array<ReactElement>}
     */
    renderEditors: function() {
        if (!this.props.showEditors) {
            return null;
        }
        var newDrafts = _.filter(this.props.storyDrafts, (story) => {
            return !story.published_version_id;
        });
        return _.map(newDrafts, this.renderEditor);
    },

    /**
     * Render editor for story
     *
     * @param  {Story} story
     * @param  {Number} index
     *
     * @return {ReactElement}
     */
    renderEditor: function(story, index) {
        // always use 0 as the key for the top story, so we don't lose focus
        // when the new story acquires an id after being saved automatically
        var key = (index === 0) ? 0 : story.id;
        var authors = this.props.draftAuthors ? findAuthors(this.props.draftAuthors, story) : [];
        var recommendations = this.props.recommendations ? findRecommendations(this.props.recommendations, story) : null;
        var recipients = this.props.recipients ? findRecipients(this.props.recipients, recommendations) : null;
        var editorProps = {
            story,
            authors,
            recommendations,
            recipients,
            currentUser: this.props.currentUser,
            database: this.props.database,
            payloads: this.props.payloads,
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

    /**
     * Render pending stories
     *
     * @return {Array<ReactElement>}
     */
    renderPendingStories: function() {
        if (!this.props.showEditors) {
            return null;
        }
        var pendingStories = this.props.pendingStories ? sortStories(this.props.pendingStories) : null;
        var newPendingStories = _.filter(pendingStories, (story) => {
            return !story.published_version_id;
        });
        return _.map(pendingStories, this.renderPendingStory);
    },

    /**
     * Render view of story in pending state
     *
     * @param  {Story} story
     * @param  {Number} index
     *
     * @return {ReactElement}
     */
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

    /**
     * Render published stories
     *
     * @return {ReactElement}
     */
    renderPublishedStories: function() {
        var stories = this.props.stories ? sortStories(this.props.stories) : null;
        return _.map(stories, this.renderPublishedStory);
    },

    /**
     * Render a published story
     *
     * @param  {Story} story
     * @param  {Number} index
     *
     * @return {ReactElement}
     */
    renderPublishedStory: function(story, index) {
        // see if it's being editted
        var draft = _.find(this.props.storyDrafts, { published_version_id: story.id });
        if (draft) {
            return this.renderEditor(draft);
        }

        var reactions = this.props.reactions ? findReactions(this.props.reactions, story) : null;
        var authors = this.props.authors ? findAuthors(this.props.authors, story) : null;
        var respondents = this.props.respondents ? findRespondents(this.props.respondents, reactions) : null;
        var recommendations = this.props.recommendations ? findRecommendations(this.props.recommendations, story) : null;
        var recipients = this.props.recipients ? findRecipients(this.props.recipients, recommendations) : null;
        var storyProps = {
            story,
            reactions,
            authors,
            respondents,
            recommendations,
            recipients,
            currentUser: this.props.currentUser,
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            onChange: this.props.onStoryChange,
            onEdit: this.props.onStoryEdit,
            onBookmark: this.props.onStoryBookmark,
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
});

var findRecommendations = MemoizeWeak(function(recommendations, story) {
    if (story) {
        return _.filter(recommendations, { story_id: story.id });
    } else {
        return [];
    }
});

var findRecipients = MemoizeWeak(function(recipients, recommendations) {
    return _.filter(recipients, (recipient) => {
        return _.some(recommendations, { target_user_id: recipient.id });
    });
});

function addBlankDraft(storyDrafts, currentUser, blankStory) {
    var currentDraft = _.find(storyDrafts, (story) => {
        if (story.user_ids[0] === currentUser.id) {
            if (!story.published_version_id) {
                return true;
            }
        }
    });
    if (!currentDraft) {
        storyDrafts.unshift(blankStory);
    }
}
