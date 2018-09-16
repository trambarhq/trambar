import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import Memoize from 'utils/memoize';
import Empty from 'data/empty';
import ComponentRefs from 'utils/component-refs';
import * as UserFinder from 'objects/finders/user-finder';
import * as RepoFinder from 'objects/finders/repo-finder';
import * as BookmarkFinder from 'objects/finders/bookmark-finder';
import * as ReactionFinder from 'objects/finders/reaction-finder';

// widgets
import SmartList from 'widgets/smart-list';
import StoryView from 'views/story-view';
import StoryEditor from 'editors/story-editor';
import NewItemsAlert from 'widgets/new-items-alert';

import './story-list.scss';

class StoryList extends AsyncComponent {
    static displayName = 'StoryList';

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     * @param  {Object} prevProps
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync(meanwhile, prevProps) {
        let {
            database,
            route,
            payloads,
            env,

            stories,
            draftStories,
            pendingStories,
            currentUser,
            project,
            access,
            acceptNewStory,
        } = this.props;
        let db = database.use({ by: this });
        let props = {
            authors: null,
            reactions: null,
            respondents: null,
            recommendations: null,
            recipients: null,
            repos: null,

            access,
            acceptNewStory,
            stories,
            draftStories,
            pendingStories,
            currentUser,
            project,
            database,
            payloads,
            route,
            env,
        };
        meanwhile.show(<StoryListSync {...props} />);
        return db.start().then((currentUserID) => {
            // load repos first, so "add to issue tracker" option doesn't pop in
            // suddenly in triple-column mode
            return RepoFinder.findProjectRepos(db, props.project).then((repos) => {
                props.repos = repos;
            });
        }).then(() => {
            meanwhile.show(<StoryListSync {...props} />);
            let stories = _.filter(_.concat(props.pendingStories, props.draftStories, props.stories));
            return UserFinder.findStoryAuthors(db, stories).then((users) => {
                props.authors = users;
            });
        }).then(() => {
            meanwhile.show(<StoryListSync {...props} />);
            let stories = _.filter(_.concat(props.pendingStories, props.stories));
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
            let stories = _.filter(_.concat(props.pendingStories, props.stories));
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
    }
}

class StoryListSync extends PureComponent {
    static displayName = 'StoryList.Sync';

    constructor(props) {
        super(props);
        this.components = ComponentRefs({
            list: SmartList
        });
        this.state = {
            hiddenStoryIDs: [],
        };
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let {
            route,
            stories,
            pendingStories,
            draftStories,
            acceptNewStory,
            currentUser,
        } = this.props;
        let { setters } = this.components;
        let setters = this.components.setters;
        stories = sortStories(stories, pendingStories);
        if (acceptNewStory) {
            stories = attachDrafts(stories, draftStories, currentUser);
        }
        let anchor;
        let hashParams = StoryList.parseHash(this.props.route.hash);
        if (hashParams.story) {
            anchor = `story-${hashParams.story}`;
        }
        let smartListProps = {
            ref: setters.list,
            items: stories,
            offset: 20,
            behind: 4,
            ahead: 8,
            anchor: anchor,

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
    }

    /**
     * Render alert indicating there're new stories hidden up top
     *
     * @return {ReactElement}
     */
    renderNewStoryAlert() {
        let { route, env } = this.props;
        let { hiddenStoryIDs } = this.state;
        let { t } = env.locale;
        let count = _.size(hiddenStoryIDs);
        let url = route.find(route.name, {
            highlightingStory: _.first(hiddenStoryIDs)
        });
        let props = {
            url,
            onClick: this.handleNewStoryAlertClick,
        };
        return (
            <NewItemsAlert {...props}>
                {t('alert-$count-new-stories', count)}
            </NewItemsAlert>
        );
    }

    /**
     * Called when SmartList wants an item's id
     *
     * @param  {Object} evt
     *
     * @return {String}
     */
    handleStoryIdentity = (evt) => {
        if (evt.alternative && evt.item) {
            // look for temporary id
            let params = this.props.route.parameters;
            let location = { schema: params.schema, table: 'story' };
            let temporaryID = this.props.database.findTemporaryID(location, evt.item.id);
            if (temporaryID) {
                return `story-${temporaryID}`;
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
    }

    /**
     * Called when SmartList wants to render an item
     *
     * @param  {Object} evt
     *
     * @return {ReactElement}
     */
    handleStoryRender = (evt) => {
        let story = evt.item;
        // see if it's being editted
        let isDraft = false;
        let highlighting = false;
        if (story) {
            if (this.props.access === 'read-write') {
                if (!story.published) {
                    isDraft = true;
                } else {
                    let tempCopy = _.find(this.props.draftStories, { published_version_id: story.id });
                    if (tempCopy) {
                        // edit the temporary copy
                        story = tempCopy;
                        isDraft = true;
                    }
                }
            }

            let hash = this.props.route.hash;
            let hashParams = StoryList.parseHash(hash);
            if (story.id === hashParams.story) {
                if (hashParams.highlighting) {
                    highlighting = true;
                    // suppress highlighting after a second
                    setTimeout(() => {
                        this.props.route.reanchor(_.toLower(hash));
                    }, 1000);
                }
            }
        } else {
            isDraft = true;
        }
        if (isDraft) {
            let authors = findAuthors(this.props.authors, story);
            let recommendations = findRecommendations(this.props.recommendations, story);
            let recipients = findRecipients(this.props.recipients, recommendations);
            if (!story) {
                authors = array(this.props.currentUser);
            }
            let editorProps = {
                highlighting,
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
                let reactions = findReactions(this.props.reactions, story);
                let authors = findAuthors(this.props.authors, story);
                let respondents = findRespondents(this.props.respondents, reactions);
                let recommendations = findRecommendations(this.props.recommendations, story);
                let recipients = findRecipients(this.props.recipients, recommendations);
                let pending = !_.includes(this.props.stories, story);
                let storyProps = {
                    highlighting,
                    pending,
                    access: this.props.access,
                    story,
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
                    onBump: this.handleStoryBump,
                };
                return <StoryView {...storyProps} />
            } else {
                let height = evt.previousHeight || evt.estimatedHeight || 100;
                return <div className="story-view" style={{ height }} />
            }
        }
    }

    /**
     * Called when a different story is positioned at the top of the viewport
     *
     * @param  {Object} evt
     */
    handleStoryAnchorChange = (evt) => {
        let params = {
            story: _.get(evt.item, 'id')
        };
        let hash = StoryList.getHash(params);
        this.props.route.reanchor(hash);
    }

    /**
     * Called when SmartList notice new items were rendered off screen
     *
     * @param  {Object} evt
     */
    handleStoryBeforeAnchor = (evt) => {
        let hiddenStoryIDs = _.map(evt.items, 'id');
        this.setState({ hiddenStoryIDs });
    }

    /**
     * Called when user clicks on new story alert
     *
     * @param  {Event} evt
     */
    handleNewStoryAlertClick = (evt) => {
        this.setState({ hiddenStoryIDs: [] });
    }

    /**
     * Scroll back to the top when a story is bumped
     *
     * @param  {Object} evt
     */
    handleStoryBump = (evt) => {
        this.components.list.releaseAnchor();
    }
}

let array = Memoize(function(object) {
    return [ object ];
});

let sortStories = Memoize(function(stories, pendingStories) {
    if (!_.isEmpty(pendingStories)) {
        stories = _.slice(stories);
        _.each(pendingStories, (story) => {
            if (!story.published_version_id) {
                stories.push(story);
            }
        });
    }
    return _.orderBy(stories, [ getStoryTime, 'id' ], [ 'desc', 'desc' ]);
});

let attachDrafts = Memoize(function(stories, drafts, currentUser) {
    // add new drafts (drafts includes published stories being edited)
    let newDrafts = _.filter(drafts, (story) => {
        return !story.published_version_id && !story.published;
    });

    // current user's own drafts are listed first
    let own = function(story) {
        return story.user_ids[0] === currentUser.id;
    };
    newDrafts = _.orderBy(newDrafts, [ own, 'id' ], [ 'desc', 'desc' ]);

    // see if the current user has a draft
    let currentUserDraft = _.find(newDrafts, (story) => {
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

let getStoryTime = function(story) {
    return story.btime || story.ptime;
};

let findReactions = Memoize(function(reactions, story) {
    if (story) {
        let list = _.filter(reactions, { story_id: story.id });
        if (!_.isEmpty(list)) {
            return list;
        }
    }
    return Empty.array;
});

let findAuthors = Memoize(function(users, story) {
    if (story) {
        let hash = _.keyBy(users, 'id');
        let list = _.filter(_.map(story.user_ids, (userID) => {
            return hash[userID];
        }));
        if (!_.isEmpty(list)) {
            return list;
        }
    }
    return Empty.array;
});

let findRespondents = Memoize(function(users, reactions) {
    let respondentIDs = _.uniq(_.map(reactions, 'user_id'));
    let hash = _.keyBy(users, 'id');
    let list = _.filter(_.map(respondentIDs, (userID) => {
        return hash[userID];
    }));
    if (!_.isEmpty(list)) {
        return list;
    }
    return Empty.array;
});

let findRecommendations = Memoize(function(recommendations, story) {
    if (story) {
        let storyID = story.published_version_id || story.id;
        let list = _.filter(recommendations, { story_id: storyID });
        if (!_.isEmpty(list)) {
            return list;
        }
    }
    return Empty.array;
});

let findRecipients = Memoize(function(recipients, recommendations) {
    let list = _.filter(recipients, (recipient) => {
        return _.some(recommendations, { target_user_id: recipient.id });
    });
    if (!_.isEmpty(list)) {
        return list;
    }
    return Empty.array;
});

function getAuthorIDs(stories) {
    let userIDs = _.flatten(_.map(stories, 'user_ids'));
    return _.uniq(userIDs);
}

StoryList.defaultProps = {
    acceptNewStory: false,
};

export {
    StoryList as default,
    StoryList,
    StoryListSync,
};

import Database from 'data/database';
import Payloads from 'transport/payloads';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    StoryList.propTypes = {
        access: PropTypes.oneOf([ 'read-only', 'read-comment', 'read-write' ]).isRequired,
        acceptNewStory: PropTypes.bool,
        stories: PropTypes.arrayOf(PropTypes.object),
        draftStories: PropTypes.arrayOf(PropTypes.object),
        pendingStories: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,
        project: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
    StoryListSync.propTypes = {
        access: PropTypes.oneOf([ 'read-only', 'read-comment', 'read-write' ]).isRequired,
        acceptNewStory: PropTypes.bool,
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

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
