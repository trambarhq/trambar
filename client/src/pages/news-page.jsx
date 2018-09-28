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

class NewsPage extends AsyncComponent {
    static displayName = 'NewsPage';

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
            payloads,
            env,
            search,
            roles,
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
        if (date || !_.isEmpty(roles)) {
            filtering = true;
        }
        let props = {
            stories: null,
            draftStories: null,
            pendingStories: null,
            project: null,
            currentUser: null,

            acceptNewStory: !filtering,
            search,
            roles,
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
        return db.start().then((userId) => {
            return UserFinder.findUser(db, userId).then((user) => {
                props.currentUser = user;
            });
        }).then(() => {
            return ProjectFinder.findCurrentProject(db).then((project) => {
                props.project = project;
            });
        }).then(() => {
            meanwhile.show(<NewsPageSync {...props} />);
            if (tags) {
                return StoryFinder.findStoriesWithTags(db, tags, props.currentUser).then((stories) => {
                    props.stories = stories;
                });
            } else if (search) {
                return StoryFinder.findStoriesMatchingText(db, search, env, props.currentUser).then((stories) => {
                    props.stories = stories;
                });
            } else if (date) {
                return StoryFinder.findStoriesOnDate(db, date, props.currentUser).then((stories) => {
                    props.stories = stories;
                });
            } else if (!_.isEmpty(roles)) {
                return StoryFinder.findStoriesWithRolesInListing(db, 'news', roles, props.currentUser, freshListing).then((stories) => {
                    props.stories = stories;
                });
            } else {
                return StoryFinder.findStoriesInListing(db, 'news', props.currentUser, freshListing).then((stories) => {
                    props.stories = stories;
                }).then(() => {
                    meanwhile.show(<NewsPageSync {...props} />);
                    return StoryFinder.findDraftStories(db, props.currentUser).then((stories) => {
                        props.draftStories = stories;
                    });
                }).then(() => {
                    let limit = env.getRelativeDate(-1, 'date');
                    return StoryFinder.findUnlistedStories(db, props.currentUser, props.stories, limit).then((stories) => {
                        props.pendingStories = stories;
                    });
                });
            }
        }).then(() => {
            // when we're highlighting a story, make sure the story is actually there
            if (!date) {
                let storyID = highlightStoryID;
                if (storyID) {
                    let allStories = _.concat(props.stories, props.draftStories, props.pendingStories);
                    if (!_.find(allStories, { id: storyID })) {
                        return StoryFinder.findStory(db, storyID).then((story) => {
                            return this.redirectToStory(route.params.schema, story);
                        }).catch((err) => {
                        });
                    }
                }
            }
        }).then(() => {
            return <NewsPageSync {...props} />;
        });
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

class NewsPageSync extends PureComponent {
    static displayName = 'NewsPage.Sync';

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
