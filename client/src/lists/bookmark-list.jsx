import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import Memoize from 'utils/memoize';
import Empty from 'data/empty';
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

import './bookmark-list.scss';

class BookmarkList extends AsyncComponent {
    static displayName = 'BookmarkList';

    /**
     * Extract id from URL hash
     *
     * @param  {String} hash
     *
     * @return {Object}
     */
    static parseHash(hash) {
        let story, highlighting;
        if (story = Route.parseId(hash, /S(\d+)/)) {
            highlighting = true;
        } else if (story = Route.parseId(hash, /s(\d+)/)) {
            highlighting = false;
        }
        return { story, highlighting };
    }

    /**
     * Get URL hash based on given parameters
     *
     * @param  {Object} params
     *
     * @return {String}
     */
    static getHash(params) {
        if (params.story) {
            if (params.highlighting) {
                return `S${params.story}`;
            } else {
                return `s${params.story}`;
            }
        }
        return '';
    }

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync(meanwhile) {
        let {
            database,
            route,
            env,
            payloads,
            access,
            bookmarks,
            currentUser,
            project,
        } = this.props;
        let db = database.use({ by: this });
        let props = {
            stories: null,
            draftStories: null,
            authors: null,
            senders: null,
            reactions: null,
            respondents: null,
            recommendations: null,
            recipients: null,
            repos: null,

            access,
            bookmarks,
            currentUser,
            project,
            database,
            payloads,
            route,
            env,
        };
        meanwhile.show(<BookmarkListSync {...props} />);
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
            let stories = _.filter(_.concat(props.draftStories, props.stories));
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
    }
}

class BookmarkListSync extends PureComponent {
    static displayName = 'BookmarkList.Sync';

    constructor(props) {
        super(props);
        this.state = {
            hiddenStoryIds: [],
        };
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { route, bookmarks } = this.props;
        let storyID = route.params.showingStory || route.params.highlightingStory;
        let smartListProps = {
            items: bookmarks,
            behind: 4,
            ahead: 8,
            anchor: (storyID) ? `story-${storyID}` : undefined,
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
        let { hiddenStoryIds } = this.state;
        let { t } = env.locale;
        let count = _.size(hiddenStoryIds);
        let url = route.find(route.name, {
            highlightingStory: _.first(hiddenStoryIds),
        });
        let props = {
            url,
            route,
            onClick: this.handleNewBookmarkAlertClick,
        };
        return (
            <NewItemsAlert {...props}>
                {t('alert-$count-new-bookmarks', count)}
            </NewItemsAlert>
        );
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
        let {
            database,
            route,
            env,
            payloads,
            currentUser,
            stories,
            reactions,
            draftStories,
            authors,
            recommendations,
            senders,
            recipients,
            repos,
            access,
        } = this.props;
        let bookmark = evt.item;
        let story = findStory(stories, bookmark);
        if (!story) {
            return null;
        }

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

            if (story.id === route.params.highlightingStory) {
                highlighting = true;
                // suppress highlighting after a second
                setTimeout(() => {
                    // TODO
                    //this.props.route.reanchor(_.toLower(hash));
                }, 1000);
            }
        }
        if (editing) {
            let storyAuthors = findAuthors(authors, story);
            let storyRecommendations = findRecommendations(recommendations, story);
            let storyRecipients = findRecipients(recipients, recommendations);
            if (!story) {
                authors = [ currentUser ];
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
                <BookmarkView {...bookmarkProps}>
                    <StoryEditor {...editorProps}/>
                </BookmarkView>
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
                };
                return (
                    <BookmarkView {...bookmarkProps}>
                        <StoryView {...storyProps} />
                    </BookmarkView>
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
        // TODO
        /*
        let params = {
            story: _.get(evt.item, 'story_id')
        };
        let hash = BookmarkList.getHash(params);
        this.props.route.reanchor(hash);
        */
    }

    /**
     * Called when SmartList notice new items were rendered off screen
     *
     * @param  {Object} evt
     */
    handleBookmarkBeforeAnchor = (evt) => {
        let hiddenStoryIds = _.map(evt.items, 'story_id');
        this.setState({ hiddenStoryIds });
    }

    /**
     * Called when user clicks on new story alert
     *
     * @param  {Event} evt
     */
    handleNewBookmarkAlertClick = (evt) => {
        this.setState({ hiddenStoryIds: [] });
    }
}

let array = Memoize(function(object) {
    return [ object ];
});

let sortBookmark = Memoize(function(bookmarks) {
    return _.orderBy(bookmarks, [ 'id' ], [ 'desc' ]);
});

let findStory = Memoize(function(stories, bookmark) {
    if (bookmark) {
        return _.find(stories, { id: bookmark.story_id });
    } else {
        return null;
    }
});

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
        let list = _.filter(_.map(story.user_ids, (userId) => {
           return _.find(users, { id: userId });
        }));
        if (!_.isEmpty(list)) {
            return list;
        }
    }
    return Empty.array;
});
let findSenders = findAuthors;

let findRespondents = Memoize(function(users, reactions) {
    let respondentIds = _.uniq(_.map(reactions, 'user_id'));
    let list = _.filter(_.map(respondentIds, (userId) => {
        return _.find(users, { id: userId });
    }));
    if (!_.isEmpty(list)) {
        return list;
    }
    return Empty.array;
})

let findRecommendations = Memoize(function(recommendations, story) {
    if (story) {
        let storyId = story.published_version_id || story.id;
        let list = _.filter(recommendations, { story_id: storyId });
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

function getAuthorIds(stories, currentUser) {
    let userIds = _.flatten(_.map(stories, 'user_ids'));
    if (currentUser) {
        userIds.push(currentUser.id);
    }
    return _.uniq(userIds);
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
        selectedStoryId: PropTypes.number,

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

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
