var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Memoize = require('utils/memoize');

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
        draftStories: PropTypes.arrayOf(PropTypes.object),
        pendingStories: PropTypes.arrayOf(PropTypes.object),
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

    renderAsync: function(meanwhile) {
        var route = this.props.route;
        var server = route.parameters.server;
        var schema = route.parameters.schema;
        var db = this.props.database.use({ server, schema, by: this });
        var defaultAuthors = array(this.props.currentUser);
        var props = {
            authors: defaultAuthors,
            draftAuthors: defaultAuthors,
            pendingAuthors: defaultAuthors,
            reactions: null,
            respondents: null,
            recommendations: null,
            recipients: null,

            showEditors: this.props.showEditors,
            stories: this.props.stories,
            draftStories: this.props.draftStories,
            pendingStories: this.props.pendingStories,
            currentUser: this.props.currentUser,
            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<StoryListSync {...props} />, 250);
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
            // load other authors of pending stories
            var authorIds = getAuthorIds(props.pendingStories, props.currentUser);
            if (authorIds.length > 1) {
                var criteria = {
                    id: authorIds
                };
                return db.find({ schema: 'global', table: 'user', criteria });
            }
        }).then((users) => {
            if (users) {
                props.pendingAuthors = users;
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
});

var StoryListSync = module.exports.Sync = React.createClass({
    displayName: 'StoryList.Sync',
    mixins: [ UpdateCheck ],
    propTypes: {
        stories: PropTypes.arrayOf(PropTypes.object),
        authors: PropTypes.arrayOf(PropTypes.object),
        draftStories: PropTypes.arrayOf(PropTypes.object),
        draftAuthors: PropTypes.arrayOf(PropTypes.object),
        pendingStories: PropTypes.arrayOf(PropTypes.object),
        pendingAuthors: PropTypes.arrayOf(PropTypes.object),
        reactions: PropTypes.arrayOf(PropTypes.object),
        respondents: PropTypes.arrayOf(PropTypes.object),
        recommendations: PropTypes.arrayOf(PropTypes.object),
        recipients: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
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
        var newDrafts = _.filter(this.props.draftStories, (story) => {
            return !story.published_version_id;
        });
        newDrafts = sortStoryDrafts(newDrafts, this.props.currentUser);

        // see if the current user has a draft
        var currentUserDraft = _.find(newDrafts, (story) => {
            if (story.user_ids[0] === this.props.currentUser.id) {
                return true;
            }
        });
        if (!currentUserDraft) {
            newDrafts = _.concat(null, newDrafts);
        }
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
        var pendingStories = sortStories(this.props.pendingStories);
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
        var authors = findAuthors(this.props.pendingAuthors, story);
        var storyProps = {
            story,
            authors,
            currentUser: this.props.currentUser,
            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            pending: true,
            onCancel: this.props.onStoryCancel,
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
        var stories = sortStories(this.props.stories);
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
        var draft = _.find(this.props.draftStories, { published_version_id: story.id });
        if (draft) {
            return this.renderEditor(draft);
        }
        var reactions = findReactions(this.props.reactions, story);
        var authors = findAuthors(this.props.authors, story);
        var respondents = findRespondents(this.props.respondents, reactions);
        var recommendations = findRecommendations(this.props.recommendations, story);
        var recipients = findRecipients(this.props.recipients, recommendations);
        var storyProps = {
            story,
            reactions,
            authors,
            respondents,
            recommendations,
            recipients,
            currentUser: this.props.currentUser,
            database: this.props.database,
            payloads: this.props.payloads,
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

var array = Memoize(function(object) {
    return [ object ];
});

var sortStories = Memoize(function(stories) {
    return _.orderBy(stories, [ 'ptime' ], [ 'desc' ]);
});

var sortStoryDrafts = Memoize(function(stories, currentUser) {
    // current user's own stories are listed first
    var ownStory = function(story) {
        return story.user_ids[0] === currentUser.id;
    };
    return _.orderBy(stories, [ ownStory, 'id' ], [ 'desc', 'desc' ]);
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
        return _.map(story.user_ids, (userId) => {
            return _.find(users, { id: userId });
        });
    } else {
        return [];
    }
});

var findRespondents = Memoize(function(users, reactions) {
    var respondentIds = _.uniq(_.map(reactions, 'user_id'));
    return _.map(respondentIds, (userId) => {
        return _.find(users, { id: userId });
    });
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

function getAuthorIds(stories, currentUser) {
    var userIds = _.flatten(_.map(stories, 'user_ids'));
    if (currentUser) {
        userIds.push(currentUser.id);
    }
    return _.uniq(userIds);
}
