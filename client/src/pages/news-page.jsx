import _ from 'lodash';
import Moment from 'moment';
import React from 'react';
import Relaks, { useProgress } from 'relaks';
import * as UserFinder from 'common/objects/finders/user-finder.mjs';
import * as ProjectFinder from 'common/objects/finders/project-finder.mjs';
import * as StoryFinder from 'common/objects/finders/story-finder.mjs';
import * as ProjectUtils from 'common/objects/utils/project-utils.mjs';
import * as TagScanner from 'common/utils/tag-scanner.mjs';

// widgets
import { PageContainer } from '../widgets/page-container.jsx';
import { StoryList } from '../lists/story-list.jsx';
import { LoadingAnimation } from '../widgets/loading-animation.jsx';
import { EmptyMessage } from '../widgets/empty-message.jsx';

import './news-page.scss';

async function NewsPage(props) {
    const { database, route, payloads, env, search, roleIDs, date } = props;
    const { highlightStoryID, scrollToStoryID, highlightReactionID, scrollToReactionID } = props;
    const [ show ] = useProgress();
    let filtering = false;
    let tags;
    if (search) {
        if (!TagScanner.removeTags(search)) {
            tags = TagScanner.findTags(search);
        }
        filtering = true;
    }
    if (date || !_.isEmpty(roleIDs)) {
        filtering = true;
    }

    render();
    const currentUserID = await database.start();
    const currentUser = await UserFinder.findUser(database, currentUserID);
    const project = await ProjectFinder.findCurrentProject(database);
    render();
    let stories, draftStories, pendingStories;
    if (tags) {
        stories = await StoryFinder.findStoriesWithTags(database, tags, currentUser);
    } else if (search) {
        stories = await StoryFinder.findStoriesMatchingText(database, search, env, currentUser);
    } else if (date) {
        stories = await StoryFinder.findStoriesOnDate(database, date, currentUser);
    } else if (!_.isEmpty(roleIDs)) {
        stories = await StoryFinder.findStoriesWithRolesInListing(database, 'news', roleIDs, currentUser);
    } else {
        stories = await StoryFinder.findStoriesInListing(database, 'news', currentUser);
        render();
        draftStories = await StoryFinder.findDraftStories(database, currentUser);
        render();
        const limit = env.getRelativeDate(-1, 'date');
        pendingStories = await StoryFinder.findUnlistedStories(database, currentUser, stories, limit);
    }
    render();

    // when we're highlighting a story, make sure the story is actually there
    if (!date) {
        const storyID = highlightStoryID;
        if (storyID) {
            const allStories = _.concat(stories, draftStories, pendingStories);
            if (!_.find(allStories, { id: storyID })) {
                try {
                    const story = await StoryFinder.findStory(database, storyID);
                    await redirectToStory(route.params.schema, story);
                } catch (err) {
                }
            }
        }
    }

    function render() {
        show(
            <PageContainer className="news-page">
                {renderList()}
                {renderEmptyMessage()}
            </PageContainer>
        );
    }

    function renderList() {
        // don't render when we haven't done loading
        if (!stories) {
            return null;
        }
        const access = ProjectUtils.getUserAccessLevel(project, currentUser) || 'read-only';
        const listProps = {
            access,
            acceptNewStory: !filtering && access === 'read-write',
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
        return <StoryList {...listProps} />
    }

    function renderEmptyMessage() {
        if (!_.isEmpty(stories)) {
            return null;
        }
        if (!stories) {
            // stories is undefined when they're being loaded
            return <LoadingAnimation />;
        } else {
            let phrase;
            if (date) {
                phrase = 'news-no-stories-on-date';
            } else if (!_.isEmpty(roleIDs)) {
                phrase = 'news-no-stories-by-role';
            } else if (search) {
                phrase = 'news-no-stories-found';
            } else {
                phrase = 'news-no-stories-yet';
            }
            const props = { phrase, env };
            return <EmptyMessage {...props} />;
        }
    }

    function redirectToStory(schema, story) {
        let redirect = true;
        if (story.ptime && story.published && story.ready !== false) {
            // don't redirect if the story is very recent
            const elapsed = Moment() - Moment(story.ptime);
            if (elapsed < 60 * 1000) {
                return;
            }
        }
        if (redirect) {
            const params = {
                schema: schema,
                date: Moment(story.ptime).format('YYYY-MM-DD'),
                highlightStoryID: story.id,
            };
            return route.replace(route.name, params);
        }
    }
}

const component = Relaks.memo(NewsPage);

export {
    component as default,
    component as NewsPage,
};
