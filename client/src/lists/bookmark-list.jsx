var _ = require('lodash');
var Promise = require('bluebird');
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
var BookmarkFrame = require('widgets/bookmark-frame');
var StoryView = require('views/story-view');
var StoryList = require('lists/story-list');
var StoryEditor = require('editors/story-editor');

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

    handleStoryChange: StoryList.prototype.handleStoryChange,

    handleStoryCommit: StoryList.prototype.handleStoryChange,

    handleStoryCancel: StoryList.prototype.handleCancel,
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
        var story = this.props.stories ? findStory(this.props.stories, bookmark) : null;
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
        var bookmarkers = this.props.bookmarkers ? findUsers(this.props.bookmarkers, bookmark.user_ids) : null;
        var frameProps = {
            bookmark,
            bookmarkers,
            currentUser: this.props.currentUser,
            locale: this.props.locale,
            onClose: this.handleBookmarkClose,
        }
        return (
            <OnDemand key={story.id} type="stories" initial={index < 10}>
                <BookmarkFrame {...frameProps}>
                    <StoryView {...storyProps} />
                </BookmarkFrame>
            </OnDemand>
        );
    },
});

var sortBookmark = MemoizeWeak(function(bookmarks) {
    return _.orderBy(bookmarks, [ 'id' ], [ 'desc' ]);
});

var findStory = MemoizeWeak(function(stories, bookmark) {
    if (bookmark) {
        return _.find(stories, { id: bookmark.story_id });
    } else {
        return null;
    }
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
        return _.filter(_.map(story.user_ids, (userId) => {
           return _.find(users, { id: userId });
        }));
    } else {
        return [];
    }
});

var findRespondents = MemoizeWeak(function(users, reactions) {
    var respondentIds = _.uniq(_.map(reactions, 'user_id'));
    return _.filter(_.map(respondentIds, (userId) => {
        return _.find(users, { id: userId });
    }));
})

function getPendingResources(story) {
    return _.filter(story.details.resources, (res) => {
        if (res.file instanceof Blob || res.external_url) {
            if (!res.url && !res.payload_id) {
                return true;
            }
        }
        if (res.poster_file instanceof Blob || res.poster_external_url) {
            if (!res.poster_url && !res.payload_id) {
                return true;
            }
        }
    });
}
