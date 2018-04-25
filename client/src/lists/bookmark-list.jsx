var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Memoize = require('utils/memoize');
var Empty = require('data/empty');
var Merger = require('data/merger');
var UserFinder = require('objects/finders/user-finder');
var StoryFinder = require('objects/finders/story-finder');
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
var BookmarkView = require('views/bookmark-view');
var StoryView = require('views/story-view');
var StoryEditor = require('editors/story-editor');
var NewItemsAlert = require('widgets/new-items-alert');

require('./bookmark-list.scss');

module.exports = Relaks.createClass({
    displayName: 'BookmarkList',
    propTypes: {
        access: PropTypes.oneOf([ 'read-only', 'read-comment', 'read-write' ]).isRequired,
        refreshList: PropTypes.bool,
        bookmarks: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,
        project: PropTypes.object,
        selectedStoryId: PropTypes.number,

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onSelectionClear: PropTypes.func,
    },

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync: function(meanwhile) {
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: params.schema, by: this });
        var props = {
            stories: null,
            draftStories: null,
            authors: null,
            senders: null,
            reactions: null,
            respondents: null,
            recommendations: null,
            recipients: null,
            repos: null,

            selectedStoryId: this.props.selectedStoryId,
            access: this.props.access,
            bookmarks: this.props.bookmarks,
            currentUser: this.props.currentUser,
            project: this.props.project,
            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            refreshList: this.props.refreshList,

            onSelectionClear: this.props.onSelectionClear,

        };
        meanwhile.show(<BookmarkListSync {...props} />, 250);
        return db.start().then((userId) => {
            return RepoFinder.findProjectRepos(db, props.project).then((repos) => {
                props.repos = repos;
            });
        }).then(() => {
            return StoryFinder.findStoriesOfBookmarks(db, props.bookmarks, props.currentUser).then((stories) => {
                props.stories = stories
            });
        }).then(() => {
            meanwhile.show(<BookmarkListSync {...props} />);
            return StoryFinder.findDraftStories(db, props.currentUser).then((stories) => {
                props.draftStories = stories;
            });
        }).then(() => {
            meanwhile.show(<BookmarkListSync {...props} />);
            var stories = _.filter(_.concat(props.draftStories, props.stories));
            return UserFinder.findStoryAuthors(db, stories).then((users) => {
                props.authors = users;
            });
        }).then(() => {
            meanwhile.show(<BookmarkListSync {...props} />);
            return UserFinder.findBookmarkSenders(db, props.bookmarks).then((users) => {
                props.senders = users;
            });
        }).then(() => {
            meanwhile.show(<BookmarkListSync {...props} />);
            return ReactionFinder.findReactionsToStories(db, props.stories, props.currentUser).then((reactions) => {
                props.reactions = reactions;
            });
        }).then(() => {
            meanwhile.show(<BookmarkListSync {...props} />);
            return UserFinder.findReactionAuthors(db, props.reactions).then((users) => {
                props.respondents = users;
            });
        }).then(() => {
            meanwhile.show(<BookmarkListSync {...props} />);
            return BookmarkFinder.findBookmarksByUser(db, props.currentUser).then((bookmarks) => {
                props.recommendations = bookmarks;
            });
        }).then(() => {
            meanwhile.show(<BookmarkListSync {...props} />);
            return UserFinder.findBookmarkRecipients(db, props.recommendations).then((users) => {
                props.recipients = users;
            });
        }).then(() => {
            return <BookmarkListSync {...props} />;
        });
    },
});

var BookmarkListSync = module.exports.Sync = React.createClass({
    displayName: 'BookmarkList.Sync',
    mixins: [ UpdateCheck ],
    propTypes: {
        access: PropTypes.oneOf([ 'read-only', 'read-comment', 'read-write' ]).isRequired,
        refreshList: PropTypes.bool,
        bookmarks: PropTypes.arrayOf(PropTypes.object),
        senders: PropTypes.arrayOf(PropTypes.object),
        stories: PropTypes.arrayOf(PropTypes.object),
        authors: PropTypes.arrayOf(PropTypes.object),
        draftStories: PropTypes.arrayOf(PropTypes.object),
        draftAuthors: PropTypes.arrayOf(PropTypes.object),
        reactions: PropTypes.arrayOf(PropTypes.object),
        respondents: PropTypes.arrayOf(PropTypes.object),
        recommendations: PropTypes.arrayOf(PropTypes.object),
        recipients: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,
        project: PropTypes.object,
        repos: PropTypes.arrayOf(PropTypes.object),
        selectedStoryId: PropTypes.number,

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
            selectedStoryId: this.props.selectedStoryId || 0,
        };
    },

    /**
     * Update state on prop changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (this.props.selectedStoryId !== nextProps.selectedStoryId) {
            this.setState({ selectedStoryId: nextProps.selectedStoryId });
            this.selectionCleared = false;
        }
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var bookmarks = sortBookmark(this.props.bookmarks);
        var anchor;
        if (this.state.selectedStoryId) {
            anchor = `story-${this.state.selectedStoryId}`;
        }
        var smartListProps = {
            items: bookmarks,
            behind: 4,
            ahead: 8,
            anchor: anchor,
            offset: 20,
            fresh: this.props.refreshList,

            onIdentity: this.handleBookmarkIdentity,
            onRender: this.handleBookmarkRender,
            onAnchorChange: this.handleBookmarkAnchorChange,
            onBeforeAnchor: this.handleBookmarkBeforeAnchor,
        };
        return (
            <div className="bookmark-list">
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
            onClick: this.handleNewBookmarkAlertClick,
        };
        return (
            <NewItemsAlert {...props}>
                {t('alert-$count-new-bookmarks', count)}
            </NewItemsAlert>
        );
    },

    /**
     * Return id of bookmark view in response to event triggered by SmartList
     *
     * @param  {Object} evt
     *
     * @return {String}
     */
    handleBookmarkIdentity: function(evt) {
        return `story-${evt.item.story_id}`;
    },

    /**
     * Render a bookmark
     *
     * @param  {Object} evt
     *
     * @return {ReactElement|null}
     */
    handleBookmarkRender: function(evt) {
        var bookmark = evt.item;
        var story = findStory(this.props.stories, bookmark);
        if (!story) {
            return null;
        }

        // see if it's being editted
        var editing = false;
        var highlighting = false;
        if (story) {
            if (this.props.access === 'read-write') {
                if (!story.published) {
                    editing = true;
                } else {
                    var tempCopy = _.find(this.props.draftStories, { published_version_id: story.id });
                    if (tempCopy) {
                        // edit the temporary copy
                        story = tempCopy;
                        editing = true;
                    }
                }
            }
            if (story.id === this.state.selectedStoryId) {
                if (story.id !== this.highlightedStoryId) {
                    highlighting = true;
                    setTimeout(() => {
                        this.highlightedStoryId = story.id;
                    }, 5000);
                }
            }
        }
        if (editing || evt.needed) {
            var senders = findSenders(this.props.senders, bookmark);
            var bookmarkProps = {
                highlighting,
                bookmark,
                senders,
                currentUser: this.props.currentUser,

                database: this.props.database,
                route: this.props.route,
                locale: this.props.locale,
                theme: this.props.theme,
            };
        }
        if (editing) {
            var authors = findAuthors(this.props.authors, story);
            var recommendations = findRecommendations(this.props.recommendations, story);
            var recipients = findRecipients(this.props.recipients, recommendations);
            if (!story) {
                authors = array(this.props.currentUser);
            }
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
            };
            return (
                <BookmarkView {...bookmarkProps}>
                    <StoryEditor {...editorProps}/>
                </BookmarkView>
            );
        } else {
            if (evt.needed) {
                var reactions = findReactions(this.props.reactions, story);
                var authors = findAuthors(this.props.authors, story);
                var respondents = findRespondents(this.props.respondents, reactions);
                var recommendations = findRecommendations(this.props.recommendations, story);
                var recipients = findRecipients(this.props.recipients, recommendations);
                var storyProps = {
                    access: this.props.access,
                    story,
                    bookmark,
                    reactions,
                    authors,
                    respondents,
                    recommendations,
                    recipients,
                    repos: this.props.repos,
                    currentUser: this.props.currentUser,
                    database: this.props.database,
                    payloads: this.props.payloads,
                    route: this.props.route,
                    locale: this.props.locale,
                    theme: this.props.theme,
                };
                return (
                    <BookmarkView {...bookmarkProps}>
                        <StoryView {...storyProps} />
                    </BookmarkView>
                );
            } else {
                var height = evt.previousHeight || evt.estimatedHeight || 100;
                return <div className="bookmark-view" style={{ height }} />
            }
        }

    },

    /**
     * Called when a different story is positioned at the top of the viewport
     *
     * @param  {Object} evt
     */
    handleBookmarkAnchorChange: function(evt) {
        var storyId = _.get(evt.item, 'story_id');
        if (this.props.selectedStoryId && storyId !== this.props.selectedStoryId) {
            if (!this.selectionClear) {
                if (this.props.onSelectionClear) {
                    this.props.onSelectionClear({
                        type: 'selectionclear',
                        target: this,
                    });
                }
                this.selectionClear = false;
            }
        }
    },

    /**
     * Called when SmartList notice new items were rendered off screen
     *
     * @param  {Object} evt
     */
    handleBookmarkBeforeAnchor: function(evt) {
        var hiddenStoryIds = _.map(evt.items, 'story_id');
        this.setState({ hiddenStoryIds });
    },

    /**
     * Called when user clicks on new story alert
     *
     * @param  {Event} evt
     */
    handleNewBookmarkAlertClick: function(evt) {
        var firstStoryId = _.first(this.state.hiddenStoryIds);
        this.setState({
            hiddenStoryIds: [],
            selectedStoryId: firstStoryId,
        });
    },
});

var array = Memoize(function(object) {
    return [ object ];
});

var sortBookmark = Memoize(function(bookmarks) {
    return _.orderBy(bookmarks, [ 'id' ], [ 'desc' ]);
});

var findStory = Memoize(function(stories, bookmark) {
    if (bookmark) {
        return _.find(stories, { id: bookmark.story_id });
    } else {
        return null;
    }
});

var findReactions = Memoize(function(reactions, story) {
    if (story) {
        var list = _.filter(reactions, { story_id: story.id });
        if (!_.isEmpty(list)) {
            return list;
        }
    }
    return Empty.array;
});

var findAuthors = Memoize(function(users, story) {
    if (story) {
        var list = _.filter(_.map(story.user_ids, (userId) => {
           return _.find(users, { id: userId });
        }));
        if (!_.isEmpty(list)) {
            return list;
        }
    }
    return Empty.array;
});
var findSenders = findAuthors;

var findRespondents = Memoize(function(users, reactions) {
    var respondentIds = _.uniq(_.map(reactions, 'user_id'));
    var list = _.filter(_.map(respondentIds, (userId) => {
        return _.find(users, { id: userId });
    }));
    if (!_.isEmpty(list)) {
        return list;
    }
    return Empty.array;
})

var findRecommendations = Memoize(function(recommendations, story) {
    if (story) {
        var storyId = story.published_version_id || story.id;
        var list = _.filter(recommendations, { story_id: storyId });
        if (!_.isEmpty(list)) {
            return list;
        }
    }
    return Empty.array;
});

var findRecipients = Memoize(function(recipients, recommendations) {
    var list = _.filter(recipients, (recipient) => {
        return _.some(recommendations, { target_user_id: recipient.id });
    });
    if (!_.isEmpty(list)) {
        return list;
    }
    return Empty.array;
});

function getAuthorIds(stories, currentUser) {
    var userIds = _.flatten(_.map(stories, 'user_ids'));
    if (currentUser) {
        userIds.push(currentUser.id);
    }
    return _.uniq(userIds);
}
