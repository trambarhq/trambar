import _ from 'lodash';
import Moment from 'moment';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import * as UserFinder from 'objects/finders/user-finder';
import * as ProjectFinder from 'objects/finders/project-finder';
import * as StoryFinder from 'objects/finders/story-finder';
import * as ProjectUtils from 'objects/utils/project-utils';
import * as TagScanner from 'utils/tag-scanner';

// widgets
import PageContainer from 'widgets/page-container';
import StoryList from 'lists/story-list';
import LoadingAnimation from 'widgets/loading-animation';
import EmptyMessage from 'widgets/empty-message';

import './news-page.scss';

/**
 * Asynchronous component that retrieves data needed by the News page.
 *
 * @extends AsyncComponent
 */
class NewsPage extends AsyncComponent {
    static displayName = 'NewsPage';

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    async renderAsync(meanwhile) {
        let {
            database,
            route,
            payloads,
            env,
            search,
            roleIDs,
            date,
            highlightStoryID,
            scrollToStoryID,
            highlightReactionID,
            scrollToReactionID,
        } = this.props;
        let db = database.use({ by: this });
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
        let props = {
            acceptNewStory: !filtering,
            search,
            roleIDs,
            date,
            highlightStoryID,
            scrollToStoryID,
            highlightReactionID,
            scrollToReactionID,
            database,
            payloads,
            route,
            env,
        };
        // wait for retrieval of fresh story listing on initial render
        let freshListing = meanwhile.revising() ? false : true;
        meanwhile.show(<NewsPageSync {...props} />);
        let currentUserID = await db.start();
        props.currentUser = await UserFinder.findUser(db, currentUserID);
        props.project = await ProjectFinder.findCurrentProject(db);
        meanwhile.show(<NewsPageSync {...props} />);
        if (tags) {
            props.stories = await StoryFinder.findStoriesWithTags(db, tags, props.currentUser);
        } else if (search) {
            props.stories = await StoryFinder.findStoriesMatchingText(db, search, env, props.currentUser);
        } else if (date) {
            props.stories = await StoryFinder.findStoriesOnDate(db, date, props.currentUser);
        } else if (!_.isEmpty(roleIDs)) {
            props.stories = await StoryFinder.findStoriesWithRolesInListing(db, 'news', roleIDs, props.currentUser, freshListing);
        } else {
            props.stories = await StoryFinder.findStoriesInListing(db, 'news', props.currentUser, freshListing);
            meanwhile.show(<NewsPageSync {...props} />);
            props.draftStories = await StoryFinder.findDraftStories(db, props.currentUser);
            let limit = env.getRelativeDate(-1, 'date');
            props.pendingStories = await StoryFinder.findUnlistedStories(db, props.currentUser, props.stories, limit);
        }
        // when we're highlighting a story, make sure the story is actually there
        if (!date) {
            let storyID = highlightStoryID;
            if (storyID) {
                let allStories = _.concat(props.stories, props.draftStories, props.pendingStories);
                if (!_.find(allStories, { id: storyID })) {
                    try {
                        let story = await StoryFinder.findStory(db, storyID);
                        await this.redirectToStory(route.params.schema, story);
                    } catch (err) {
                    }
                }
            }
        }
        return <NewsPageSync {...props} />;
    }

    /**
     * Redirect to page showing stories on the date of a story
     *
     * @param  {String} schema
     * @param  {Story} story
     *
     * @return {Promise|undefined}
     */
    redirectToStory(schema, story) {
        let { route } = this.props;
        let redirect = true;
        if (story.ptime && story.published && story.ready !== false) {
            // don't redirect if the story is very recent
            let elapsed = Moment() - Moment(story.ptime);
            if (elapsed < 60 * 1000) {
                return;
            }
        }
        if (redirect) {
            let params = {
                schema: schema,
                date: Moment(story.ptime).format('YYYY-MM-DD'),
                highlightStoryID: story.id,
            };
            return route.replace(route.name, params);
        }
    }
}

/**
 * Synchronous component that actually renders the News page.
 *
 * @extends PureComponent
 */
class NewsPageSync extends PureComponent {
    static displayName = 'NewsPageSync';

    /**
     * Return the access level
     *
     * @return {String}
     */
    getAccessLevel() {
        let { project, currentUser } = this.props;
        return ProjectUtils.getUserAccessLevel(project, currentUser) || 'read-only';
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        return (
            <PageContainer className="news-page">
                {this.renderList()}
                {this.renderEmptyMessage()}
            </PageContainer>
        );
    }

    /**
     * Render list of stories
     *
     * @return {ReactElement|null}
     */
    renderList() {
        let {
            database,
            route,
            env,
            payloads,
            stories,
            draftStories,
            pendingStories,
            currentUser,
            project,
            acceptNewStory,
            highlightStoryID,
            scrollToStoryID,
            highlightReactionID,
            scrollToReactionID,
        } = this.props;
        // don't render when we haven't done loading
        if (!stories) {
            return null;
        }
        let access = this.getAccessLevel();
        let listProps = {
            access,
            acceptNewStory: acceptNewStory && access === 'read-write',
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
            onMissingStory: this.handleMissingStory,
        };
        return <StoryList {...listProps} />
    }

    /**
     * Render a message if there're no stories
     *
     * @return {ReactElement|null}
     */
    renderEmptyMessage() {
        let { env, stories, date, roleIDs, search } = this.props;
        if (!_.isEmpty(stories)) {
            return null;
        }
        if (!stories) {
            // props.stories is null when they're being loaded
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
            let props = { phrase, env };
            return <EmptyMessage {...props} />;
        }
    }
}

export {
    NewsPage as default,
    NewsPage,
    NewsPageSync
};

import Database from 'data/database';
import Payloads from 'transport/payloads';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    NewsPage.propTypes = {
        roleIDs: PropTypes.arrayOf(PropTypes.number),
        search: PropTypes.string,
        date: PropTypes.string,
        scrollToStoryID: PropTypes.number,
        highlightStoryID: PropTypes.number,
        scrollToReactionID: PropTypes.number,
        highlightReactionID: PropTypes.number,

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
    NewsPageSync.propTypes = {
        roleIDs: PropTypes.arrayOf(PropTypes.number),
        search: PropTypes.string,
        date: PropTypes.string,
        scrollToStoryID: PropTypes.number,
        highlightStoryID: PropTypes.number,
        scrollToReactionID: PropTypes.number,
        highlightReactionID: PropTypes.number,
        acceptNewStory: PropTypes.bool,
        listing: PropTypes.object,
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
}
