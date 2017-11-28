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
var SmartList = require('widgets/smart-list');
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
        anchorStoryId: PropTypes.number,

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
        var defaultAuthors = array(this.props.currentUser);
        var props = {
            authors: defaultAuthors,
            draftAuthors: defaultAuthors,
            pendingAuthors: defaultAuthors,
            reactions: null,
            respondents: null,
            recommendations: null,
            recipients: null,
            repos: null,

            anchorStoryId: this.props.anchorStoryId,
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
            var criteria = {
                id: getAuthorIds(props.stories),
            };
            return db.find({ schema: 'global', table: 'user', criteria });
        }).then((users) => {
            props.authors = users;
            meanwhile.show(<StoryListSync {...props} />);
        }).then(() => {
            // load reactions to stories
            var criteria = {
                story_id: _.map(props.stories, 'id')
            };
            return db.find({ table: 'reaction', criteria });
        }).then((reactions) => {
            // reattach blobs to unpublished reactions (lost when saved)
            var unpunishedReactions = _.filter(reactions, { ptime: null });
            _.each(unpunishedReactions, (reaction) => {
                props.payloads.reattach(params.schema, reaction);
            });
            props.reactions = reactions;
            meanwhile.show(<StoryListSync {...props} />);
        }).then(() => {
            // load users of reactions
            var criteria = {
                id: _.uniq(_.map(props.reactions, 'user_id'))
            };
            return db.find({ schema: 'global', table: 'user', criteria });
        }).then((users) => {
            props.respondents = users;
            meanwhile.show(<StoryListSync {...props} />);
        }).then(() => {
            if (props.draftStories) {
                // load other authors also working on drafts
                var authorIds = getAuthorIds(props.draftStories);
                var otherUserIds = _.difference(authorIds, [ props.currentUser.id ]);
                if (otherUserIds.length > 0) {
                    // always include the current user, since he can immediately
                    // start a draft
                    var criteria = {
                        id: _.union(otherUserIds, [ props.currentUser.id ])
                    };
                    return db.find({ schema: 'global', table: 'user', criteria });
                }
            }
        }).then((users) => {
            if (users) {
                props.draftAuthors = users;
                meanwhile.show(<StoryListSync {...props} />);
            }
        }).then(() => {
            if (props.pendingStories) {
                // load other authors of pending stories (most of the time, this is
                // going to be the current user)
                var authorIds = getAuthorIds(props.pendingStories);
                var otherUserIds = _.difference(authorIds, [ props.currentUser.id ]);
                if (otherUserIds.length > 0) {
                    var criteria = {
                        id: authorIds
                    };
                    return db.find({ schema: 'global', table: 'user', criteria });
                }
            }
        }).then((users) => {
            if (users) {
                props.pendingAuthors = users;
                meanwhile.show(<StoryListSync {...props} />);
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
        repos: PropTypes.arrayOf(PropTypes.object),
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
        var stories = sortStories(this.props.stories, this.props.pendingStories, this.props.draftStories, this.props.currentUser, this.props.showEditors);
        var anchorId = this.props.anchorStoryId;
        var smartListProps = {
            items: stories,
            offset: 20,
            behind: 2,
            ahead: 8,
            anchor: (anchorId) ? `story-${anchorId}` : undefined,

            onIdentity: this.handleStoryIdentity,
            onRender: this.handleStoryRender,
            onAnchorChange: this.handleStoryAnchorChange,
        };
        return <SmartList {...smartListProps} />


        return (
            <div className="story-list">
            </div>
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
        if (this.props.showEditors) {
            // use a fixed id for the first editor, so we don't lose focus
            // when the new story acquires an id after being saved automatically
            if (evt.currentIndex === 0) {
                return 'story-top';
            }
        }
        return `story-${evt.item.id}`;
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
        var renderEditor = false;
        if (story) {
            if (!story.published) {
                renderEditor = true;
            } else {
                var tempCopy = _.find(this.props.draftStories, { published_version_id: story.id });
                if (tempCopy) {
                    // edit the temporary copy
                    story = tempCopy;
                    renderEditor = true;
                }
            }
        } else {
            renderEditor = true;
        }
        if (renderEditor) {
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
        } else {
            if (evt.needed) {
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
                return <StoryView {...storyProps} />
            } else {
                var height = evt.previousHeight || evt.estimatedHeight || 100;
                return <div className="story-view" style={{ height }} />
            }
        }
    },
});

var array = Memoize(function(object) {
    return [ object ];
});

var sortStories = Memoize(function(stories, pendingStories, drafts, currentUser, showEditors) {
    if (!_.isEmpty(pendingStories)) {
        stories = _.slice(stories);
        _.each(pendingStories, (story) => {
            if (!story.published_version_id) {
                stories.push(story);
            }
        });
    }
    stories = _.orderBy(stories, [ getStoryTime ], [ 'desc' ]);

    if (showEditors) {
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
            newDrafts = _.concat(null, newDrafts);
        }
        stories = _.concat(newDrafts, stories);
    }
    return stories;
});

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

var findRepo = Memoize(function(repos, story) {
    if (story && story.repo_id) {
        return _.find(repos, { id: story.repo_id });
    } else {
        return null;
    }
});

function getAuthorIds(stories) {
    var userIds = _.flatten(_.map(stories, 'user_ids'));
    return _.uniq(userIds);
}
