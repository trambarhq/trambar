var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Memoize = require('utils/memoize');
var Merger = require('data/merger');

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

require('./bookmark-list.scss');

module.exports = Relaks.createClass({
    displayName: 'BookmarkList',
    propTypes: {
        bookmarks: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,
        anchorStoryId: PropTypes.number,

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync: function(meanwhile) {
        var route = this.props.route;
        var server = route.parameters.server;
        var schema = route.parameters.schema;
        var db = this.props.database.use({ server, schema, by: this });
        var defaultAuthors = array(this.props.currentUser);
        var props = {
            stories: null,
            authors: defaultAuthors,
            draftStories: null,
            draftAuthors: defaultAuthors,
            senders: null,
            reactions: null,
            respondents: null,
            recommendations: null,
            recipients: null,
            repos: null,

            anchorStoryId: this.props.anchorStoryId,
            bookmarks: this.props.bookmarks,
            currentUser: this.props.currentUser,
            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<BookmarkListSync {...props} />, 250);
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
            props.senders = users;
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
            meanwhile.show(<BookmarkListSync {...props} />);
        }).then(() => {
            if (props.currentUser) {
                // look for story drafts
                var criteria = {
                    published: false,
                    user_ids: [ props.currentUser.id ],
                };
                return db.find({ table: 'story', criteria });
            }
        }).then((stories) => {
            if (stories) {
                props.draftStories = stories;
                meanwhile.show(<BookmarkListSync {...props} />);
            }
        }).then(() => {
            // load other authors also working on drafts
            var authorIds = getAuthorIds(props.draftStories, props.currentUser);
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
            meanwhile.show(<BookmarkListSync {...props} />);
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
            meanwhile.show(<BookmarkListSync {...props} />);
        }).then(() => {
            // load repos from which the stories came
            var repoIds = _.uniq(_.filter(_.map(props.stories, 'repo_id')));
            if (!_.isEmpty(repoIds)) {
                var criteria = {
                    id: repoIds
                };
                return db.find({ schema: 'global', table: 'repo', criteria });
            }
        }).then((repos) => {
            props.repos = repos;
            return <BookmarkListSync {...props} />;
        });
    },
});

var BookmarkListSync = module.exports.Sync = React.createClass({
    displayName: 'BookmarkList.Sync',
    mixins: [ UpdateCheck ],
    propTypes: {
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
        repos: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,
        anchorStoryId: PropTypes.number,

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
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
        var bookmarks = sortBookmark(this.props.bookmarks);
        var anchorId = this.props.anchorStoryId;
        var smartListProps = {
            items: bookmarks,
            offset: 20,
            behind: 2,
            ahead: 8,
            anchor: (anchorId) ? `story-${anchorId}` : undefined,

            onIdentity: this.handleBookmarkIdentity,
            onRender: this.handleBookmarkRender,
            onAnchorChange: this.handleBookmarkAnchorChange,
        };
        return (
            <div className="story-list">
                <SmartList {...smartListProps} />
            </div>
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
     * @return {ReactElement}
     */
    handleBookmarkRender: function(evt) {
        if (evt.needed) {
            var bookmark = evt.item;
            var story = findStory(this.props.stories, bookmark);
            var senders = findSenders(this.props.senders, bookmark);
            var bookmarkProps = {
                bookmark,
                senders,
                currentUser: this.props.currentUser,

                database: this.props.database,
                route: this.props.route,
                locale: this.props.locale,
                theme: this.props.theme,
            };
            return (
                <BookmarkView {...bookmarkProps}>
                    {this.renderStory(story)}
                </BookmarkView>
            );
        } else {
            var height = evt.previousHeight || evt.estimatedHeight || 100;
            return <div className="bookmark-view" style={{ height }} />
        }
    },

    /**
     * Render given story
     *
     * @param  {Story} story
     *
     * @return {ReactElement|null}
     */
    renderStory: function(story) {
        if (!story) {
            return;
        }
        var draft = _.find(this.props.draftStories, { published_version_id: story.id });
        if (draft) {
            return this.renderEditor(draft);
        }
        var reactions = findReactions(this.props.reactions, story);
        var authors = findAuthors(this.props.authors, story);
        var respondents = findRespondents(this.props.respondents, reactions);
        var recommendations = findRecommendations(this.props.recommendations, story);
        var recipients = findRecipients(this.props.recipients, recommendations);
        var repo = findRepo(this.props.repos, story);
        var storyProps = {
            story,
            reactions,
            authors,
            respondents,
            recommendations,
            recipients,
            repo,
            currentUser: this.props.currentUser,

            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <StoryView {...storyProps} />;
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
        var authors = findAuthors(this.props.draftAuthors, story);
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
        return <StoryEditor {...editorProps}/>
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
        return _.filter(reactions, { story_id: story.id });
    } else {
        return [];
    }
});

var findAuthors = Memoize(function(users, story) {
    if (story) {
        return _.filter(_.map(story.user_ids, (userId) => {
           return _.find(users, { id: userId });
        }));
    } else {
        return [];
    }
});
var findSenders = findAuthors;

var findRespondents = Memoize(function(users, reactions) {
    var respondentIds = _.uniq(_.map(reactions, 'user_id'));
    return _.filter(_.map(respondentIds, (userId) => {
        return _.find(users, { id: userId });
    }));
})

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

var findRepo = Memoize(function(repos, story) {
    if (story && story.repo_id) {
        return _.find(repos, { id: story.repo_id });
    } else {
        return null;
    }
});

function getAuthorIds(stories, currentUser) {
    var userIds = _.flatten(_.map(stories, 'user_ids'));
    if (currentUser) {
        userIds.push(currentUser.id);
    }
    return _.uniq(userIds);
}
