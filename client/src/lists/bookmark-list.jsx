import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import { memoizeWeak } from 'utils/memoize';
import Merger from 'data/merger';
import * as UserFinder from 'objects/finders/user-finder';
import * as StoryFinder from 'objects/finders/story-finder';
import * as RepoFinder from 'objects/finders/repo-finder';
import * as BookmarkFinder from 'objects/finders/bookmark-finder';
import * as ReactionFinder from 'objects/finders/reaction-finder';

// widgets
import SmartList from 'widgets/smart-list';
import BookmarkView from 'views/bookmark-view';
import StoryView from 'views/story-view';
import StoryEditor from 'editors/story-editor';
import NewItemsAlert from 'widgets/new-items-alert';
import ErrorBoundary from 'widgets/error-boundary';

import './bookmark-list.scss';

/**
 * Asynchronous component that retrieves data needed by a bookmark list
 * (in addition to the bookmarks given to it)
 *
 * @extends AsyncComponent
 */
class BookmarkList extends AsyncComponent {
    static displayName = 'BookmarkList';

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    async renderAsync(meanwhile) {
        let { database, route, payloads, env } = this.props;
        let { access, bookmarks, currentUser, project } = this.props;
        let { highlightStoryID, scrollToStoryID } = this.props;
        let db = database.use({ by: this });
        let props = {
            access,
            bookmarks,
            currentUser,
            project,
            highlightStoryID,
            scrollToStoryID,
            database,
            route,
            payloads,
            env,
        };
        meanwhile.show(<BookmarkListSync {...props} />);
        let currentUserID = await db.start();
        props.repos = await RepoFinder.findProjectRepos(db, props.project);
        props.stories = await StoryFinder.findStoriesOfBookmarks(db, props.bookmarks, props.currentUser)
        meanwhile.show(<BookmarkListSync {...props} />);
        props.draftStories = await StoryFinder.findDraftStories(db, props.currentUser)
        meanwhile.show(<BookmarkListSync {...props} />);
        let stories = _.filter(_.concat(props.draftStories, props.stories));
        props.authors = await UserFinder.findStoryAuthors(db, stories);
        meanwhile.show(<BookmarkListSync {...props} />);
        props.senders = await UserFinder.findBookmarkSenders(db, props.bookmarks);
        meanwhile.show(<BookmarkListSync {...props} />);
        props.reactions = await ReactionFinder.findReactionsToStories(db, props.stories, props.currentUser);
        meanwhile.show(<BookmarkListSync {...props} />);
        props.respondents = await UserFinder.findReactionAuthors(db, props.reactions);
        meanwhile.show(<BookmarkListSync {...props} />);
        props.recommendations = await BookmarkFinder.findBookmarksByUser(db, props.currentUser);
        meanwhile.show(<BookmarkListSync {...props} />);
        props.recipients = await UserFinder.findBookmarkRecipients(db, props.recommendations);
        return <BookmarkListSync {...props} />;
    }
}

/**
 * Synchronous component that actually renders the list, with the help of
 * SmartList.
 *
 * @extends PureComponent
 */
class BookmarkListSync extends PureComponent {
    static displayName = 'BookmarkListSync';

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
        let { bookmarks, stories, highlightStoryID, scrollToStoryID } = this.props;
        let anchorStoryID = highlightStoryID || scrollToStoryID;
        bookmarks = sortBookmarks(bookmarks, stories);
        let smartListProps = {
            items: bookmarks,
            behind: 4,
            ahead: 8,
            anchor: (anchorStoryID) ? `story-${anchorStoryID}` : undefined,
            offset: 20,

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
                highlightingStory: _.first(hiddenStoryIDs),
            });
        }
        let props = { url, onClick: this.handleNewBookmarkAlertClick };
        return (
            <NewItemsAlert {...props}>
                {t('alert-$count-new-bookmarks', count)}
            </NewItemsAlert>
        );
    }

    /**
     * Change the URL hash so page is anchor at given story
     *
     * @param  {Number|undefined} scrollToStoryID
     */
    reanchorAtStory(scrollToStoryID) {
        let { route } = this.props;
        let params = {
            scrollToStoryID,
            highlightStoryID: undefined,
        };
        route.reanchor(params);
    }

    /**
     * Return id of bookmark view in response to event triggered by SmartList
     *
     * @param  {Object} evt
     *
     * @return {String}
     */
    handleBookmarkIdentity = (evt) => {
        return `story-${evt.item.story_id}`;
    }

    /**
     * Render a bookmark
     *
     * @param  {Object} evt
     *
     * @return {ReactElement|null}
     */
    handleBookmarkRender = (evt) => {
        let { database, route, env, payloads } = this.props;
        let { stories, draftStories, reactions, recommendations } = this.props;
        let { currentUser, authors, senders, recipients, respondents } = this.props;
        let { repos, access, highlightStoryID } = this.props;
        let bookmark = evt.item;
        let story = findStory(stories, bookmark);

        // see if it's being editted
        let editing = false;
        let highlighting = false;
        if (story) {
            if (access === 'read-write') {
                if (!story.published) {
                    editing = true;
                } else {
                    let tempCopy = _.find(draftStories, { published_version_id: story.id });
                    if (tempCopy) {
                        // edit the temporary copy
                        story = tempCopy;
                        editing = true;
                    }
                }
            }
            highlighting = (story.id === highlightStoryID);
        }
        let bookmarkProps;
        if (editing || evt.needed) {
            let bookmarkSenders = findSenders(senders, bookmark);
            bookmarkProps = {
                highlighting,
                bookmark,
                senders: bookmarkSenders,
                currentUser,
                database,
                route,
                env,
            };
        }
        if (editing) {
            let storyAuthors = findAuthors(authors, story);
            let storyRecommendations = findRecommendations(recommendations, story);
            let storyRecipients = findRecipients(recipients, recommendations);
            if (!story) {
                authors = array(currentUser);
            }
            let editorProps = {
                story,
                authors: storyAuthors,
                recommendations: storyRecommendations,
                recipients: storyRecipients,
                currentUser,
                database,
                payloads,
                route,
                env,
            };
            return (
                <ErrorBoundary env={env}>
                    <BookmarkView {...bookmarkProps}>
                        <StoryEditor {...editorProps}/>
                    </BookmarkView>
                </ErrorBoundary>
            );
        } else {
            if (evt.needed) {
                let storyReactions = findReactions(reactions, story);
                let storyAuthors = findAuthors(authors, story);
                let storyRespondents = findRespondents(respondents, storyReactions);
                let storyRecommendations = findRecommendations(recommendations, story);
                let storyRecipients = findRecipients(recipients, recommendations);
                let storyProps = {
                    access,
                    story,
                    bookmark,
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
                    onEdit: this.handleStoryEdit,
                };
                return (
                    <ErrorBoundary env={env}>
                        <BookmarkView {...bookmarkProps}>
                            <StoryView {...storyProps} />
                        </BookmarkView>
                    </ErrorBoundary>
                );
            } else {
                let height = evt.previousHeight || evt.estimatedHeight || 100;
                return <div className="bookmark-view" style={{ height }} />
            }
        }
    }

    /**
     * Called when a different story is positioned at the top of the viewport
     *
     * @param  {Object} evt
     */
    handleBookmarkAnchorChange = (evt) => {
        this.reanchorAtStory((evt.item) ? evt.item.story_id : undefined);
    }

    /**
     * Called when SmartList notice new items were rendered off screen
     *
     * @param  {Object} evt
     */
    handleBookmarkBeforeAnchor = (evt) => {
        let hiddenStoryIDs = _.map(evt.items, 'story_id');
        this.setState({ hiddenStoryIDs });
    }

    /**
     * Called when user clicks on new story alert
     *
     * @param  {Event} evt
     */
    handleNewBookmarkAlertClick = (evt) => {
        this.setState({ hiddenStoryIDs: [] });
    }

    /**
     * Stop StoryView from highlighting a second time when it eventual remounts
     *
     * @param  {Object} evt
     */
    handleStoryEdit = (evt) => {
        let { highlightStoryID } = this.props;
        if (evt.target.props.story.id === highlightStoryID) {
            this.reanchorAtStory(highlightStoryID);
        }
    }
}

const array = memoizeWeak([], function(object) {
    return [ object ];
});

const sortBookmarks = memoizeWeak(null, function(bookmarks, stories) {
    bookmarks = _.filter(bookmarks, (bookmark) => {
        return _.find(stories, { id: bookmark.story_id });
    });
    return _.orderBy(bookmarks, [ 'id' ], [ 'desc' ]);
});

const findStory = memoizeWeak(null, function(stories, bookmark) {
    if (bookmark) {
        return _.find(stories, { id: bookmark.story_id });
    }
});

const findReactions = memoizeWeak(null, function(reactions, story) {
    if (story) {
        return _.filter(reactions, { story_id: story.id });
    }
});

const findAuthors = memoizeWeak(null, function(users, story) {
    if (story) {
        return _.filter(_.map(story.user_ids, (userID) => {
           return _.find(users, { id: userID });
        }));
    }
});
let findSenders = findAuthors;

const findRespondents = memoizeWeak(null, function(users, reactions) {
    let respondentIDs = _.uniq(_.map(reactions, 'user_id'));
    return _.filter(_.map(respondentIDs, (userID) => {
        return _.find(users, { id: userID });
    }));
});

const findRecommendations = memoizeWeak(null, function(recommendations, story) {
    if (story) {
        let storyID = story.published_version_id || story.id;
        return _.filter(recommendations, { story_id: storyID });
    }
});

const findRecipients = memoizeWeak(null, function(recipients, recommendations) {
    return _.filter(recipients, (recipient) => {
        return _.some(recommendations, { target_user_id: recipient.id });
    });
});

function getAuthorIDs(stories, currentUser) {
    let userIDs = _.flatten(_.map(stories, 'user_ids'));
    if (currentUser) {
        userIDs.push(currentUser.id);
    }
    return _.uniq(userIDs);
}

export {
    BookmarkList as default,
    BookmarkList,
    BookmarkListSync,
};

import Database from 'data/database';
import Payloads from 'transport/payloads';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    BookmarkList.propTypes = {
        access: PropTypes.oneOf([ 'read-only', 'read-comment', 'read-write' ]).isRequired,
        bookmarks: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,
        project: PropTypes.object,
        highlightStoryID: PropTypes.number,
        scrollToStoryID: PropTypes.number,

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
    BookmarkList.propTypes = {
        access: PropTypes.oneOf([ 'read-only', 'read-comment', 'read-write' ]).isRequired,
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
        highlightStoryID: PropTypes.number,
        scrollToStoryID: PropTypes.number,

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
