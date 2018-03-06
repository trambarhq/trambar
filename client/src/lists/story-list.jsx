var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Memoize = require('utils/memoize');
var UserFinder = require('objects/finders/user-finder');
var RepoFinder = require('objects/finders/repo-finder');
var BookmarkFinder = require('objects/finders/bookmark-finder');
var ReactionFinder = require('objects/finders/reaction-finder');

var Database = require('data/database');
var Payloads = require('transport/payloads');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var SmartList = require('widgets/smart-list');
var StoryView = require('views/story-view');
var StoryEditor = require('editors/story-editor');
var NewItemsAlert = require('widgets/new-items-alert');

require('./story-list.scss');

module.exports = Relaks.createClass({
    displayName: 'StoryList',
    propTypes: {
        access: PropTypes.oneOf([ 'read-only', 'read-comment', 'read-write' ]).isRequired,
        acceptNewStory: PropTypes.bool,
        refreshList: PropTypes.bool,
        stories: PropTypes.arrayOf(PropTypes.object),
        draftStories: PropTypes.arrayOf(PropTypes.object),
        pendingStories: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,
        project: PropTypes.object,
        selectedStoryId: PropTypes.number,
        selectedReactionId: PropTypes.number,

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onSelectionClear: PropTypes.func,
    },

    /**
     * Return default props
     *
     * @return {Object}
     */
    getDefaultProps: function() {
        return {
            acceptNewStory: false,
        };
    },

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     * @param  {Object} prevProps
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync: function(meanwhile, prevProps) {
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: params.schema, by: this });
        var props = {
            authors: null,
            reactions: null,
            respondents: null,
            recommendations: null,
            recipients: null,
            repos: null,

            selectedStoryId: this.props.selectedStoryId,
            selectedReactionId: this.props.selectedReactionId,
            access: this.props.access,
            acceptNewStory: this.props.acceptNewStory,
            refreshList: this.props.refreshList,
            stories: this.props.stories,
            draftStories: this.props.draftStories,
            pendingStories: this.props.pendingStories,
            currentUser: this.props.currentUser,
            project: this.props.project,
            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,

            onSelectionClear: this.props.onSelectionClear,
        };
        meanwhile.show(<StoryListSync {...props} />, 250);
        return db.start().then((currentUserId) => {
            // load repos first, so "add to issue tracker" option doesn't pop in
            // suddenly in triple-column mode
            return RepoFinder.findProjectRepos(db, props.project).then((repos) => {
                props.repos = repos;
            });
        }).then(() => {
            meanwhile.show(<StoryListSync {...props} />);
            var stories = _.filter(_.concat(props.pendingStories, props.draftStories, props.stories));
            return UserFinder.findStoryAuthors(db, stories).then((users) => {
                props.authors = users;
            });
        }).then(() => {
            meanwhile.show(<StoryListSync {...props} />);
            var stories = _.filter(_.concat(props.pendingStories, props.stories));
            return ReactionFinder.findReactionsToStories(db, stories, props.currentUser).then((reactions) => {
                props.reactions = reactions;
            });
        }).then(() => {
            meanwhile.show(<StoryListSync {...props} />);
            return UserFinder.findReactionAuthors(db, props.reactions).then((users) => {
                props.respondents = users;
            })
        }).then(() => {
            meanwhile.show(<StoryListSync {...props} />);
            var stories = _.filter(_.concat(props.pendingStories, props.stories));
            return BookmarkFinder.findBookmarksByUser(db, props.currentUser, stories).then((bookmarks) => {
                props.recommendations = bookmarks;
            });
        }).then(() => {
            meanwhile.show(<StoryListSync {...props} />);
            return UserFinder.findBookmarkRecipients(db, props.bookmarks).then((users) => {
                props.recipients = users;
            });
        }).then(() => {
            return <StoryListSync {...props} />;
        });
    },
});

var StoryListSync = module.exports.Sync = React.createClass({
    displayName: 'StoryList.Sync',
    mixins: [ UpdateCheck ],
    propTypes: {
        access: PropTypes.oneOf([ 'read-only', 'read-comment', 'read-write' ]).isRequired,
        acceptNewStory: PropTypes.bool,
        refreshList: PropTypes.bool,
        stories: PropTypes.arrayOf(PropTypes.object),
        authors: PropTypes.arrayOf(PropTypes.object),
        draftStories: PropTypes.arrayOf(PropTypes.object),
        pendingStories: PropTypes.arrayOf(PropTypes.object),
        reactions: PropTypes.arrayOf(PropTypes.object),
        respondents: PropTypes.arrayOf(PropTypes.object),
        recommendations: PropTypes.arrayOf(PropTypes.object),
        recipients: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,
        project: PropTypes.object,
        repos: PropTypes.arrayOf(PropTypes.object),
        selectedStoryId: PropTypes.number,
        selectedReactionId: PropTypes.number,

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onSelectionClear: PropTypes.func,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            hiddenStoryIds: [],
            selectedStoryId: null,
        };
    },

    /**
     * Update state on prop changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (this.props.route !== nextProps.route) {
            this.setState({ selectedStoryId: null });
        }
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var stories = sortStories(this.props.stories, this.props.pendingStories);
        if (this.props.acceptNewStory) {
            stories = attachDrafts(stories, this.props.draftStories, this.props.currentUser);
        }
        var anchorId = this.state.selectedStoryId || this.props.selectedStoryId;
        var smartListProps = {
            items: stories,
            offset: 20,
            behind: 4,
            ahead: 8,
            anchor: (anchorId) ? `story-${anchorId}` : undefined,
            fresh: this.props.refreshList,

            onIdentity: this.handleStoryIdentity,
            onRender: this.handleStoryRender,
            onAnchorChange: this.handleStoryAnchorChange,
            onBeforeAnchor: this.handleStoryBeforeAnchor,
        };
        this.freshList = false;
        return (
            <div className="story-list">
                <SmartList {...smartListProps} />
                {this.renderNewStoryAlert()}
            </div>
        );
    },

    /**
     * Render alert indicating there're new stories hidden up top
     *
     * @return {ReactElement}
     */
    renderNewStoryAlert: function() {
        var t = this.props.locale.translate;
        var count = _.size(this.state.hiddenStoryIds);
        var show = (count > 0);
        if (count) {
            this.previousHiddenStoryCount = count;
        } else {
            // show the previous count as the alert transitions out
            count = this.previousHiddenStoryCount || 0;
        }
        var props = {
            show: show,
            onClick: this.handleNewStoryAlertClick,
        };
        return (
            <NewItemsAlert {...props}>
                {t('alert-$count-new-stories', count)}
            </NewItemsAlert>
        );
    },

    /**
     * Called when SmartList wants an item's id
     *
     * @param  {Object} evt
     *
     * @return {String}
     */
    handleStoryIdentity: function(evt) {
        if (evt.alternative && evt.item) {
            // look for temporary id
            var params = this.props.route.parameters;
            var location = { schema: params.schema, table: 'story' };
            var temporaryId = this.props.database.findTemporaryID(location, evt.item.id);
            if (temporaryId) {
                return `story-${temporaryId}`;
            }
        } else {
            if (this.props.acceptNewStory) {
                // use a fixed id for the first editor, so we don't lose focus
                // when the new story acquires an id after being saved automatically
                if (evt.currentIndex === 0) {
                    return 'story-top';
                }
            }
            return `story-${evt.item.id}`;
        }
    },

    /**
     * Called when SmartList wants to render an item
     *
     * @param  {Object} evt
     *
     * @return {ReactElement}
     */
    handleStoryRender: function(evt) {
        var story = evt.item;
        // see if it's being editted
        var isDraft = false;
        var selected = false;
        if (story) {
            if (this.props.access === 'read-write') {
                if (!story.published) {
                    isDraft = true;
                } else {
                    var tempCopy = _.find(this.props.draftStories, { published_version_id: story.id });
                    if (tempCopy) {
                        // edit the temporary copy
                        story = tempCopy;
                        isDraft = true;
                    }
                }
            }
            if (story.id === this.props.selectedStoryId) {
                // don't set select again if we had scrolled away
                if (!this.props.route.loosened) {
                    selected = true;
                }
            }
        } else {
            isDraft = true;
        }
        if (isDraft) {
            var authors = findAuthors(this.props.authors, story);
            var recommendations = findRecommendations(this.props.recommendations, story);
            var recipients = findRecipients(this.props.recipients, recommendations);
            if (!story) {
                authors = array(this.props.currentUser);
            }
            var editorProps = {
                selected,
                story,
                authors,
                recommendations,
                recipients,
                repos: this.props.repos,
                isStationary: evt.currentIndex === 0,
                currentUser: this.props.currentUser,
                database: this.props.database,
                payloads: this.props.payloads,
                route: this.props.route,
                locale: this.props.locale,
                theme: this.props.theme,
            };
            return <StoryEditor {...editorProps}/>
        } else {
            if (evt.needed) {
                var reactions = findReactions(this.props.reactions, story);
                var authors = findAuthors(this.props.authors, story);
                var respondents = findRespondents(this.props.respondents, reactions);
                var recommendations = findRecommendations(this.props.recommendations, story);
                var recipients = findRecipients(this.props.recipients, recommendations);
                var storyProps = {
                    selected,
                    access: this.props.access,
                    story,
                    reactions,
                    authors,
                    respondents,
                    recommendations,
                    recipients,
                    selectedReactionId: (selected) ? this.props.selectedReactionId : undefined,
                    repos: this.props.repos,
                    currentUser: this.props.currentUser,
                    database: this.props.database,
                    payloads: this.props.payloads,
                    route: this.props.route,
                    locale: this.props.locale,
                    theme: this.props.theme,
                };
                return <StoryView {...storyProps} />
            } else {
                var height = evt.previousHeight || evt.estimatedHeight || 100;
                return <div className="story-view" style={{ height }} />
            }
        }
    },

    /**
     * Called when a different story is positioned at the top of the viewport
     *
     * @param  {Object} evt
     */
    handleStoryAnchorChange: function(evt) {
        var storyId = _.get(evt.item, 'id');
        if (this.props.selectedStoryId && storyId !== this.props.selectedStoryId) {
            if (this.props.onSelectionClear) {
                this.props.onSelectionClear({
                    type: 'selectionclear',
                    target: this,
                });
            }
        }
    },

    /**
     * Called when SmartList notice new items were rendered off screen
     *
     * @param  {Object} evt
     */
    handleStoryBeforeAnchor: function(evt) {
        var hiddenStoryIds = _.map(evt.items, 'id');
        this.setState({ hiddenStoryIds });
    },

    /**
     * Called when user clicks on new story alert
     *
     * @param  {Event} evt
     */
    handleNewStoryAlertClick: function(evt) {
        this.setState({
            hiddenStoryIds: [],
            selectedStoryId: _.first(this.state.hiddenStoryIds),
        });
    },
});

var array = Memoize(function(object) {
    return [ object ];
});

var sortStories = Memoize(function(stories, pendingStories) {
    if (!_.isEmpty(pendingStories)) {
        stories = _.slice(stories);
        _.each(pendingStories, (story) => {
            if (!story.published_version_id) {
                stories.push(story);
            }
        });
    }
    return _.orderBy(stories, [ getStoryTime, 'id' ], [ 'desc', 'desc' ]);

    return stories;
});

var attachDrafts = Memoize(function(stories, drafts, currentUser) {
    // add new drafts (drafts includes published stories being edited)
    var newDrafts = _.filter(drafts, (story) => {
        return !story.published_version_id;
    });

    // current user's own drafts are listed first
    var own = function(story) {
        return story.user_ids[0] === currentUser.id;
    };
    newDrafts = _.orderBy(newDrafts, [ own, 'id' ], [ 'desc', 'desc' ]);

    // see if the current user has a draft
    var currentUserDraft = _.find(newDrafts, (story) => {
        if (story.user_ids[0] === currentUser.id) {
            return true;
        }
    });
    if (!currentUserDraft) {
        // add a blank
        newDrafts.unshift(null);
    }
    return _.concat(newDrafts, stories);
}, [ null ]);

var getStoryTime = function(story) {
    return story.btime || story.ptime;
};

var findReactions = Memoize(function(reactions, story) {
    if (story) {
        return _.filter(reactions, { story_id: story.id });
    } else {
        return [];
    }
});

var findAuthors = Memoize(function(users, story) {
    if (story) {
        var hash = _.keyBy(users, 'id');
        return _.filter(_.map(story.user_ids, (userId) => {
            return hash[userId];
        }));
    } else {
        return [];
    }
});

var findRespondents = Memoize(function(users, reactions) {
    var respondentIds = _.uniq(_.map(reactions, 'user_id'));
    var hash = _.keyBy(users, 'id');
    return _.filter(_.map(respondentIds, (userId) => {
        return hash[userId];
    }));
});

var findRecommendations = Memoize(function(recommendations, story) {
    if (story) {
        var storyId = story.published_version_id || story.id;
        return _.filter(recommendations, { story_id: storyId });
    } else {
        return [];
    }
});

var findRecipients = Memoize(function(recipients, recommendations) {
    return _.filter(recipients, (recipient) => {
        return _.some(recommendations, { target_user_id: recipient.id });
    });
});

function getAuthorIds(stories) {
    var userIds = _.flatten(_.map(stories, 'user_ids'));
    return _.uniq(userIds);
}
