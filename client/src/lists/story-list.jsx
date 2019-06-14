import _ from 'lodash';
import React, { useState } from 'react';
import Relaks, { useProgress } from 'relaks';
import { memoizeWeak } from 'common/utils/memoize.mjs';
import * as UserFinder from 'common/objects/finders/user-finder.mjs';
import * as RepoFinder from 'common/objects/finders/repo-finder.mjs';
import * as BookmarkFinder from 'common/objects/finders/bookmark-finder.mjs';
import * as ReactionFinder from 'common/objects/finders/reaction-finder.mjs';

// widgets
import { SmartList } from 'common/widgets/smart-list.jsx';
import { StoryView } from '../views/story-view.jsx';
import { StoryEditor } from '../editors/story-editor.jsx';
import { NewItemsAlert } from '../widgets/new-items-alert.jsx';
import { ErrorBoundary } from 'common/widgets/error-boundary.jsx';

import './story-list.scss';

async function StoryList(props) {
    const { database, route, payloads, env } = props;
    const { stories, draftStories, pendingStories } = props;
    const { currentUser, project } = props;
    const { access, acceptNewStory } = props;
    const { highlightStoryID, scrollToStoryID, highlightReactionID, scrollToReactionID } = props;
    const { t } = env.locale;
    const allStories = _.filter(_.concat(pendingStories, draftStories, stories));
    const [ hiddenStoryIDs, setHiddenStoryIDs ] = useState([]);
    const [ show ] = useProgress();

    const handleStoryIdentity = (evt) => {
        if (evt.alternative && evt.item && evt.item.id >= 1) {
            // look for temporary id
            const location = { table: 'story' };
            const tempID = database.findTemporaryID(location, evt.item.id);
            return getAnchor(tempID);
        } else {
            if (acceptNewStory) {
                // use a fixed id for the first editor, so we don't lose focus
                // when the new story acquires an id after being saved automatically
                if (evt.currentIndex === 0) {
                    return getAnchor('top');
                }
            }
            return getAnchor(evt.item.id);
        }
    };
    const handleStoryRender = (evt) => {
        return renderStory(evt.item, evt.needed, evt.previousHeight, evt.estimatedHeight, evt.currentIndex);
    };
    const handleStoryAnchorChange = (evt) => {
        reanchorAtStory((evt.item) ? evt.item.id : undefined);
    };
    const handleStoryBeforeAnchor = (evt) => {
        setHiddenStoryIDs(_.map(evt.items, 'id'));
    };
    const handleNewStoryAlertClick = (evt) => {
        setHiddenStoryIDs([]);
    };
    const handleStoryBump = (evt) => {
        reanchorAtStory(null);
    };
    const handleStoryEdit = (evt) => {
        if (evt.target.props.story.id === highlightStoryID) {
            reanchorAtStory(highlightStoryID, highlightReactionID);
        }
    };

    function reanchorAtStory(scrollToStoryID, scrollToReactionID) {
        route.replace({
            scrollToStoryID,
            highlightStoryID: undefined,
            scrollToReactionID,
            highlightReactionID: undefined,
        });
    }

    function getAnchor(storyID) {
        return (storyID) ? `story-${storyID}` : undefined
    }

    render();
    // load repos first, so "add to issue tracker" option doesn't pop in
    // suddenly in triple-column mode
    const repos = await RepoFinder.findProjectRepos(database, project);
    render();
    const authors = await UserFinder.findStoryAuthors(database, allStories);
    render();
    const reactions = await ReactionFinder.findReactionsToStories(database, allStories, currentUser)
    render();
    const respondents = await UserFinder.findReactionAuthors(database, reactions);
    render();
    const bookmarks = await BookmarkFinder.findBookmarksByUser(database, currentUser, allStories);
    render();
    const recipients = await UserFinder.findBookmarkRecipients(database, bookmarks);
    render();

    function render() {
        let list = sortStories(stories, pendingStories);
        if (acceptNewStory) {
            list = attachDrafts(list, draftStories, currentUser);
        }
        const smartListProps = {
            items: list,
            offset: 20,
            behind: 4,
            ahead: 8,
            anchor: getAnchor(scrollToStoryID || highlightStoryID),

            onIdentity: handleStoryIdentity,
            onRender: handleStoryRender,
            onAnchorChange: handleStoryAnchorChange,
            onBeforeAnchor: handleStoryBeforeAnchor,
        };
        show(
            <div className="story-list">
                <SmartList {...smartListProps} />
                {renderNewStoryAlert()}
            </div>
        );
    }

    function renderNewStoryAlert() {
        const count = _.size(hiddenStoryIDs);
        let url;
        if (count > 0) {
            url = route.find(route.name, {
                highlightStoryID: _.first(hiddenStoryIDs)
            });
        }
        const props = { url, onClick: handleNewStoryAlertClick };
        return (
            <NewItemsAlert {...props}>
                {t('alert-$count-new-stories', count)}
            </NewItemsAlert>
        );
    }

    function renderStory(story, needed, previousHeight, estimatedHeight, index) {
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
            const editorProps = {
                highlighting,
                story,
                authors: findDraftAuthors(currentUser, authors, story),
                bookmarks: findBookmarks(bookmarks, story, currentUser),
                recipients: findRecipients(recipients, bookmarks, story, currentUser),
                repos,
                isStationary: (index === 0),
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
            if (needed) {
                const pending = !_.includes(stories, story);
                const storyProps = {
                    highlighting,
                    pending,
                    access,
                    highlightReactionID,
                    scrollToReactionID,
                    story,
                    reactions: findReactions(reactions, story),
                    authors: findAuthors(authors, story),
                    respondents: findRespondents(respondents, reactions),
                    bookmarks: findBookmarks(bookmarks, story, currentUser),
                    recipients: findRecipients(recipients, bookmarks, story, currentUser),
                    repos,
                    currentUser,
                    database,
                    payloads,
                    route,
                    env,
                    onBump: handleStoryBump,
                    onEdit: handleStoryEdit,
                };
                return (
                    <ErrorBoundary env={env}>
                        <StoryView {...storyProps} />
                    </ErrorBoundary>
                );
            } else {
                const height = previousHeight || estimatedHeight || 100;
                return <div className="story-view" style={{ height }} />
            }
        }
    }
}

const sortStories = memoizeWeak(null, function(stories, pendingStories) {
    if (!_.isEmpty(pendingStories)) {
        stories = _.slice(stories);
        for (let story of pendingStories) {
            if (!story.published_version_id) {
                stories.push(story);
            } else {
                // copy pending changes into story
                const index = _.findIndex(stories, { id: story.published_version_id });
                if (index !== -1) {
                    stories[index] = {
                        ...stories[index],
                        details: story.details,
                        user_ids: story.user_ids,
                    };
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
    const own = function(story) {
        return story.user_ids[0] === currentUser.id;
    };
    newDrafts = _.orderBy(newDrafts, [ own, 'id' ], [ 'desc', 'desc' ]);

    // see if the current user has a draft
    const currentUserDraft = _.find(newDrafts, (story) => {
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

const getStoryTime = function(story) {
    return story.btime || story.ptime;
};

const findReactions = memoizeWeak(null, function(reactions, story) {
    if (story) {
        return _.filter(reactions, { story_id: story.id });
    }
});

const findAuthors = memoizeWeak(null, function(users, story) {
    if (story) {
        const hash = _.keyBy(users, 'id');
        const list = _.filter(_.map(story.user_ids, (userID) => {
            return hash[userID];
        }));
        return list;
    }
});

const findDraftAuthors = memoizeWeak(null, function(currentUser, users, story) {
    if (story && users) {
        return findAuthors(users, story);
    }
    return [ currentUser ];
});

const findRespondents = memoizeWeak(null, function(users, reactions) {
    const respondentIDs = _.uniq(_.map(reactions, 'user_id'));
    const hash = _.keyBy(users, 'id');
    return _.filter(_.map(respondentIDs, (userID) => {
        return hash[userID];
    }));
});

const findBookmarks = memoizeWeak(null, function(bookmarks, story, currentUser) {
    if (story) {
        let storyID = story.published_version_id || story.id;
        return _.filter(bookmarks, (bookmark) => {
            if (bookmark.story_id === storyID) {
                // omit those hidden by the current user
                if (!(bookmark.hidden && bookmark.target_user_id === currentUser.id)) {
                    return true;
                }
            }
        });
    }
});

const findRecipients = memoizeWeak(null, function(recipients, bookmarks, story, currentUser) {
    const storyBookmarks = findBookmarks(bookmarks, story, currentUser);
    return _.filter(recipients, (recipient) => {
        return _.some(storyBookmarks, { target_user_id: recipient.id });
    });
});

const component = Relaks.memo(StoryList);

component.defaultProps = {
    acceptNewStory: false,
};

export {
    component as default,
    component as StoryList,
};
