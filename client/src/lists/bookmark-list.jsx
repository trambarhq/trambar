import _ from 'lodash';
import Promise from 'bluebird';
import React, { useState } from 'react';
import Relaks, { useProgress } from 'relaks';
import { memoizeWeak } from 'common/utils/memoize.mjs';
import Merger from 'common/data/merger.mjs';
import * as UserFinder from 'common/objects/finders/user-finder.mjs';
import * as StoryFinder from 'common/objects/finders/story-finder.mjs';
import * as RepoFinder from 'common/objects/finders/repo-finder.mjs';
import * as BookmarkFinder from 'common/objects/finders/bookmark-finder.mjs';
import * as ReactionFinder from 'common/objects/finders/reaction-finder.mjs';

// widgets
import { SmartList } from 'common/widgets/smart-list.jsx';
import { BookmarkView } from '../views/bookmark-view.jsx';
import { StoryView } from '../views/story-view.jsx';
import { StoryEditor } from '../editors/story-editor.jsx';
import { NewItemsAlert } from '../widgets/new-items-alert.jsx';
import { ErrorBoundary } from 'common/widgets/error-boundary.jsx';

import './bookmark-list.scss';

async function BookmarkList(props) {
    const { database, route, payloads, env } = props;
    const { access, bookmarks, currentUser, project } = props;
    const { highlightStoryID, scrollToStoryID } = props;
    const { t } = env.locale;
    const db = database.use({ by: this });
    const [ hiddenStoryIDs, setHiddenStoryIDs ] = useState();
    const [ show ] = useProgress();

    const handleBookmarkIdentity = (evt) => {
        return getAnchor(evt.item.story_id);
    };
    const handleBookmarkRender = (evt) => {
        return renderBookmark(evt.item, evt.needed, evt.previousHeight, evt.estimatedHeight);
    };
    const handleBookmarkAnchorChange = (evt) => {
        reanchorAtStory(_.get(evt.item, 'story_id'));
    };
    const handleBookmarkBeforeAnchor = (evt) => {
        setHiddenStoryIDs(_.map(evt.items, 'story_id'));
    };
    const handleNewBookmarkAlertClick = (evt) => {
        setHiddenStoryIDs([]);
    };
    const handleStoryEdit = (evt) => {
        const storyID = evt.target.props.story.id;
        if (storyID === highlightStoryID) {
            reanchorAtStory(highlightStoryID);
        }
    };

    render();
    const currentUserID = await db.start();
    const repos = await RepoFinder.findProjectRepos(db, project);
    const stories = await StoryFinder.findStoriesOfBookmarks(db, bookmarks, currentUser)
    render();
    const draftStories = await StoryFinder.findDraftStories(db, currentUser)
    render();
    const allStories = _.filter(_.concat(draftStories, stories));
    const authors = await UserFinder.findStoryAuthors(db, allStories);
    render();
    const senders = await UserFinder.findBookmarkSenders(db, bookmarks);
    render();
    const reactions = await ReactionFinder.findReactionsToStories(db, allStories, currentUser);
    render();
    const respondents = await UserFinder.findReactionAuthors(db, reactions);
    render();
    const recommendations = await BookmarkFinder.findBookmarksByUser(db, currentUser);
    render();
    const recipients = await UserFinder.findBookmarkRecipients(db, recommendations);
    render();

    function render() {
        const smartListProps = {
            items: sortBookmarks(bookmarks, stories),
            behind: 4,
            ahead: 8,
            anchor: getAnchor(highlightStoryID || scrollToStoryID),
            offset: 20,

            onIdentity: handleBookmarkIdentity,
            onRender: handleBookmarkRender,
            onAnchorChange: handleBookmarkAnchorChange,
            onBeforeAnchor: handleBookmarkBeforeAnchor,
        };
        show(
            <div className="bookmark-list">
                <SmartList {...smartListProps} />
                {renderNewStoryAlert()}
            </div>
        );
    }

    function renderNewStoryAlert() {
        const count = _.size(hiddenStoryIDs);
        let url;
        if (!_.isEmpty(hiddenStoryIDs)) {
            url = route.find(route.name, {
                highlightingStory: _.first(hiddenStoryIDs),
            });
        }
        const props = { url, onClick: handleNewBookmarkAlertClick };
        return (
            <NewItemsAlert {...props}>
                {t('alert-$count-new-bookmarks', count)}
            </NewItemsAlert>
        );
    }

    function renderBookmark(bookmark, needed, previousHeight, estimatedHeight) {
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
        if (editing || needed) {
            bookmarkProps = {
                highlighting,
                bookmark,
                senders: findSenders(senders, bookmark),
                currentUser,
                database,
                route,
                env,
            };
        }
        if (editing) {
            const editorProps = {
                story,
                authors: (story) ? findAuthors(authors, story) : array(currentUser),
                recommendations: findRecommendations(recommendations, story),
                recipients: findRecipients(recipients, recommendations),
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
            if (needed) {
                const storyProps = {
                    access,
                    story,
                    bookmark,
                    reactions: storyReactions,
                    authors: findAuthors(authors, story),
                    respondents: findRespondents(respondents, reactions, story),
                    recommendations: findRecommendations(recommendations, story),
                    recipients: findRecipients(recipients, recommendations),
                    repos,
                    currentUser,
                    database,
                    payloads,
                    route,
                    env,
                    onEdit: handleStoryEdit,
                };
                return (
                    <ErrorBoundary env={env}>
                        <BookmarkView {...bookmarkProps}>
                            <StoryView {...storyProps} />
                        </BookmarkView>
                    </ErrorBoundary>
                );
            } else {
                const height = previousHeight || estimatedHeight || 100;
                return <div className="bookmark-view" style={{ height }} />
            }
        }
    }

    function getAnchor(storyID) {
        return (storyID) ? `story-${storyID}` : undefined;
    }

    function reanchorAtStory(scrollToStoryID) {
        const params = { scrollToStoryID, highlightStoryID: undefined };
        route.reanchor(params);
    }
}

const array = memoizeWeak([], function(object) {
    return [ object ];
});

const sortBookmarks = memoizeWeak(null, function(bookmarks, stories) {
    const withStory = _.filter(bookmarks, (bookmark) => {
        return _.find(stories, { id: bookmark.story_id });
    });
    return _.orderBy(withStory, [ 'id' ], [ 'desc' ]);
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
const findSenders = findAuthors;

const findRespondents = memoizeWeak(null, function(users, reactions, story) {
    const storyReactions = findReactions(reactions, story);
    const respondentIDs = _.uniq(_.map(storyReactions, 'user_id'));
    return _.filter(_.map(respondentIDs, (userID) => {
        return _.find(users, { id: userID });
    }));
});

const findRecommendations = memoizeWeak(null, function(recommendations, story) {
    if (story) {
        const storyID = story.published_version_id || story.id;
        return _.filter(recommendations, { story_id: storyID });
    }
});

const findRecipients = memoizeWeak(null, function(recipients, recommendations) {
    return _.filter(recipients, (recipient) => {
        return _.some(recommendations, { target_user_id: recipient.id });
    });
});

function getAuthorIDs(stories, currentUser) {
    const userIDs = _.flatten(_.map(stories, 'user_ids'));
    if (currentUser) {
        userIDs.push(currentUser.id);
    }
    return _.uniq(userIDs);
}

const component = Relaks.memo(BookmarkList);

export {
    component as default,
    component as BookmarkList,
};
