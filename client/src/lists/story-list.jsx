import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import { memoizeWeak } from 'utils/memoize';
import * as UserFinder from 'objects/finders/user-finder';
import * as RepoFinder from 'objects/finders/repo-finder';
import * as BookmarkFinder from 'objects/finders/bookmark-finder';
import * as ReactionFinder from 'objects/finders/reaction-finder';

// widgets
import SmartList from 'widgets/smart-list';
import StoryView from 'views/story-view';
import StoryEditor from 'editors/story-editor';
import NewItemsAlert from 'widgets/new-items-alert';
import ErrorBoundary from 'widgets/error-boundary';

import './story-list.scss';

/**
 * Asynchronous component that retrieves data needed by a story list
 * (in addition to the notifications given to it)
 *
 * @extends AsyncComponent
 */
class StoryList extends AsyncComponent {
    static displayName = 'StoryList';

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    async renderAsync(meanwhile) {
        let { database, route, payloads, env } = this.props;
        let { stories, draftStories, pendingStories } = this.props;
        let { currentUser, project } = this.props;
        let { access, acceptNewStory } = this.props;
        let { highlightStoryID, scrollToStoryID, highlightReactionID, scrollToReactionID } = this.props;
        let allStories = _.filter(_.concat(pendingStories, draftStories, stories));
        let db = database.use({ by: this });
        let props = {
            access,
            acceptNewStory,
            highlightStoryID,
            scrollToStoryID,
            highlightReactionID,
            scrollToReactionID,
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
        let currentUserID = await db.start();
        // load repos first, so "add to issue tracker" option doesn't pop in
        // suddenly in triple-column mode
        props.repos = await RepoFinder.findProjectRepos(db, props.project);
        meanwhile.show(<StoryListSync {...props} />);
        props.authors = await UserFinder.findStoryAuthors(db, allStories);
        meanwhile.show(<StoryListSync {...props} />);
        props.reactions = await ReactionFinder.findReactionsToStories(db, allStories, props.currentUser)
        meanwhile.show(<StoryListSync {...props} />);
        props.respondents = await UserFinder.findReactionAuthors(db, props.reactions);
        meanwhile.show(<StoryListSync {...props} />);
        props.recommendations = await BookmarkFinder.findBookmarksByUser(db, props.currentUser, allStories);
        meanwhile.show(<StoryListSync {...props} />);
        props.recipients = await UserFinder.findBookmarkRecipients(db, props.bookmarks);
        return <StoryListSync {...props} />;
    }
}

/**
 * Synchronous component that actually renders the list, with the help of
 * SmartList.
 *
 * @extends PureComponent
 */
class StoryListSync extends PureComponent {
    static displayName = 'StoryListSync';

    constructor(props) {
        super(props);
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
            highlightStoryID,
            scrollToStoryID,
        } = this.props;
        stories = sortStories(stories, pendingStories);
        if (acceptNewStory) {
            stories = attachDrafts(stories, draftStories, currentUser);
        }
        let anchorStoryID = scrollToStoryID || highlightStoryID;
        let smartListProps = {
            items: stories,
            offset: 20,
            behind: 4,
            ahead: 8,
            anchor: (anchorStoryID) ? `story-${anchorStoryID}` : undefined,

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
        let url;
        if (!_.isEmpty(hiddenStoryIDs)) {
            url = route.find(route.name, {
                highlightStoryID: _.first(hiddenStoryIDs)
            });
        }
        let props = { url, onClick: this.handleNewStoryAlertClick };
        return (
            <NewItemsAlert {...props}>
                {t('alert-$count-new-stories', count)}
            </NewItemsAlert>
        );
    }

    /**
     * Change the URL hash so page is anchor at given story
     *
     * @param  {Number|undefined} scrollToStoryID
     * @param  {Number|undefined} scrollToReactionID
     */
    reanchorAtStory(scrollToStoryID, scrollToReactionID) {
        let { route } = this.props;
        let params = {
            scrollToStoryID,
            highlightStoryID: undefined,
            scrollToReactionID,
            highlightReactionID: undefined,
        };
        route.reanchor(params);
    }

    /**
     * Called when SmartList wants an item's id
     *
     * @param  {Object} evt
     *
     * @return {String}
     */
    handleStoryIdentity = (evt) => {
        let { database, acceptNewStory } = this.props;
        if (evt.alternative && evt.item) {
            // look for temporary id
            let location = { table: 'story' };
            let temporaryID = database.findTemporaryID(location, evt.item.id);
            if (temporaryID) {
                return `story-${temporaryID}`;
            }
        } else {
            if (acceptNewStory) {
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
        let {
            database,
            route,
            payloads,
            env,
            stories,
            draftStories,
            authors,
            reactions,
            respondents,
            recommendations,
            recipients,
            repos,
            currentUser,
            highlightStoryID,
            highlightReactionID,
            scrollToReactionID,
            access
        } = this.props;
        let story = evt.item;
        // see if it's being editted
        let isDraft = false;
        let highlighting = false;
        if (story) {
            if (access === 'read-write') {
                if (!story.published) {
                    isDraft = true;
                } else {
                    let tempCopy = _.find(draftStories, { published_version_id: story.id });
                    if (tempCopy) {
                        // edit the temporary copy
                        story = tempCopy;
                        isDraft = true;
                    }
                }
            }
            highlighting = (story.id === highlightStoryID);
        } else {
            isDraft = true;
        }
        if (isDraft) {
            let storyAuthors = findAuthors(authors, story);
            let storyRecommendations = findRecommendations(recommendations, story, currentUser);
            let storyRecipients = findRecipients(recipients, storyRecommendations);
            if (_.isEmpty(storyAuthors) && currentUser) {
                storyAuthors = array(currentUser);
            }
            let editorProps = {
                highlighting,
                story,
                authors: storyAuthors,
                recommendations: storyRecommendations,
                recipients: storyRecipients,
                repos,
                isStationary: evt.currentIndex === 0,
                currentUser,
                database,
                payloads,
                route,
                env,
            };
            return (
                <ErrorBoundary env={env}>
                    <StoryEditor {...editorProps}/>
                </ErrorBoundary>
            );
        } else {
            if (evt.needed) {
                let storyReactions = findReactions(reactions, story);
                let storyAuthors = findAuthors(authors, story);
                let storyRespondents = findRespondents(respondents, reactions);
                let storyRecommendations = findRecommendations(recommendations, story, currentUser);
                let storyRecipients = findRecipients(recipients, recommendations);
                let pending = !_.includes(stories, story);
                let storyProps = {
                    highlighting,
                    pending,
                    access,
                    highlightReactionID,
                    scrollToReactionID,
                    story,
                    reactions: storyReactions,
                    authors: storyAuthors,
                    respondents: storyRespondents,
                    recommendations: storyRecommendations,
                    recipients: storyRecipients,
                    repos,
                    currentUser,
                    database,
                    payloads,
                    route,
                    env,
                    onBump: this.handleStoryBump,
                    onEdit: this.handleStoryEdit,
                };
                return (
                    <ErrorBoundary env={env}>
                        <StoryView {...storyProps} />
                    </ErrorBoundary>
                );
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
        this.reanchorAtStory((evt.item) ? evt.item.id : undefined);
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
        this.reanchorAtStory(null);
    }

    /**
     * Stop StoryView from highlighting a second time when it eventual remounts
     *
     * @param  {Object} evt
     */
    handleStoryEdit = (evt) => {
        let { highlightStoryID, highlightReactionID } = this.props;
        if (evt.target.props.story.id === highlightStoryID) {
            this.reanchorAtStory(highlightStoryID, highlightReactionID);
        }
    }
}

const array = memoizeWeak([], function(object) {
    return [ object ];
});

const sortStories = memoizeWeak(null, function(stories, pendingStories) {
    if (!_.isEmpty(pendingStories)) {
        stories = _.slice(stories);
        for (let story of pendingStories) {
            if (!story.published_version_id) {
                stories.push(story);
            } else {
                // copy pending changes into story
                let index = _.findIndex(stories, { id: story.published_version_id });
                if (index !== -1) {
                    let publishedStory = stories[index] = _.clone(stories[index]);
                    publishedStory.details = story.details;
                    publishedStory.user_ids = story.user_ids;
                }
            }
        }
    }
    return _.orderBy(stories, [ getStoryTime, 'id' ], [ 'desc', 'desc' ]);
});

const attachDrafts = memoizeWeak([ null ], function(stories, drafts, currentUser) {
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
});

let getStoryTime = function(story) {
    return story.btime || story.ptime;
};

const findReactions = memoizeWeak(null, function(reactions, story) {
    if (story) {
        return _.filter(reactions, { story_id: story.id });
    }
});

const findAuthors = memoizeWeak(null, function(users, story) {
    if (story) {
        let hash = _.keyBy(users, 'id');
        return _.filter(_.map(story.user_ids, (userID) => {
            return hash[userID];
        }));
    }
});

const findRespondents = memoizeWeak(null, function(users, reactions) {
    let respondentIDs = _.uniq(_.map(reactions, 'user_id'));
    let hash = _.keyBy(users, 'id');
    return _.filter(_.map(respondentIDs, (userID) => {
        return hash[userID];
    }));
});

const findRecommendations = memoizeWeak(null, function(recommendations, story, currentUser) {
    if (story) {
        let storyID = story.published_version_id || story.id;
        return _.filter(recommendations, (bookmark) => {
            if (bookmark.story_id === storyID) {
                // omit those hidden by the current user
                if (!(bookmark.hidden && bookmark.target_user_id === currentUser.id)) {
                    return true;
                }
            }
        });
    }
});

const findRecipients = memoizeWeak(null, function(recipients, recommendations) {
    return _.filter(recipients, (recipient) => {
        return _.some(recommendations, { target_user_id: recipient.id });
    });
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
        highlightStoryID: PropTypes.number,
        scrollToStoryID: PropTypes.number,
        highlightReactionID: PropTypes.number,
        scrollToReactionID: PropTypes.number,
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
        highlightStoryID: PropTypes.number,
        scrollToStoryID: PropTypes.number,
        highlightReactionID: PropTypes.number,
        scrollToReactionID: PropTypes.number,
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
