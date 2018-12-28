import _ from 'lodash';
import Promise from 'bluebird';
import Moment from 'moment';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import { memoizeWeak } from 'utils/memoize';
import * as ProjectFinder from 'objects/finders/project-finder';
import * as ProjectUtils from 'objects/utils/project-utils';
import * as StatisticsFinder from 'objects/finders/statistics-finder';
import * as StoryFinder from 'objects/finders/story-finder';
import * as UserFinder from 'objects/finders/user-finder';
import * as TagScanner from 'utils/tag-scanner';

// widgets
import PageContainer from 'widgets/page-container';
import UserList from 'lists/user-list';
import StoryList from 'lists/story-list';
import LoadingAnimation from 'widgets/loading-animation';
import EmptyMessage from 'widgets/empty-message';

import './people-page.scss';

/**
 * Asynchronous component that retrieves data needed by the People or
 * Person page, depending on whether selectedUserID is given.
 *
 * @extends AsyncComponent
 */
class PeoplePage extends AsyncComponent {
    static displayName = 'PeoplePage';

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
            date,
            roleIDs,
            search,
            selectedUserID,
            scrollToUserID,
            highlightStoryID,
            scrollToStoryID,
        } = this.props;
        let db = database.use({ by: this });
        let tags;
        if (search) {
            if (!TagScanner.removeTags(search)) {
                tags = TagScanner.findTags(search);
            }
        }
        let props = {
            date,
            roleIDs,
            search,
            selectedUserID,
            scrollToUserID,
            highlightStoryID,
            scrollToStoryID,
            database,
            route,
            payloads,
            env,
        };
        // wait for retrieval of fresh story listing on initial render
        let freshListing = meanwhile.revising() ? false : true;
        meanwhile.show(<PeoplePageSync {...props} />);
        let currentUserID = await db.start();
        props.currentUser = await UserFinder.findUser(db, currentUserID);
        props.project = await ProjectFinder.findCurrentProject(db);
        props.members = await UserFinder.findProjectMembers(db, props.project);
        if (selectedUserID) {
            // find the selected user
            let user = _.find(props.members, { id: selectedUserID });
            if (!user) {
                // not on the member list
                user = await UserFinder.findUser(db, selectedUserID);
            }
            props.selectedUser = user;
            props.visibleUsers = [ user ];
        } else {
            // if we're not searching for stories, then we know which
            // users to list at this point
            if (!(search || date)) {
                if (!_.isEmpty(roleIDs)) {
                    // show users with roles
                    props.visibleUsers = findUsersWithRoles(props.members, roleIDs);
                } else {
                    // all project members are shown
                    props.visibleUsers = props.members;
                }
            }
        }
        if (env.isWiderThan('double-col')) {
            // don't render without stats in single-column mode, since
            // that affects the height of the view
            meanwhile.show(<PeoplePageSync {...props} />);
        }
        let publicOnly = (props.currentUser.type === 'guest');
        props.dailyActivities = await StatisticsFinder.findDailyActivitiesOfUsers(db, props.project, props.members, publicOnly);

        if (!props.visibleUsers) {
            // find users with stories using stats
            let users;
            if (date) {
                users = findUsersWithActivitiesOnDate(props.members, statistics, date);
            } else if (search) {
                if (tags) {
                    users = findUsersWithStoriesWithTags(props.members, statistics, tags);
                }
            }
            if (users) {
                if (!_.isEmpty(roleIDs)) {
                    props.visibleUsers = findUsersWithRoles(users, roleIDs);
                } else {
                    props.visibleUsers = users;
                }
            }
        } else if (props.selectedUser) {
            // load statistics of selected user if he's not a member
            if (!_.some(props.members, { id: props.selectedUser })) {
                let selectedUserStats = await StatisticsFinder.findDailyActivitiesOfUser(db, props.project, props.selectedUser, publicOnly);
                _.set(props.dailyActivities, props.selectedUser.id, selectedUserStats);
            }
        }

        // force progress update initially to avoid flicking
        meanwhile.show(<PeoplePageSync {...props} />, 'initial');
        if (search) {
            if (tags) {
                props.stories = await StoryFinder.findStoriesWithTags(db, tags, 5);
            } else {
                props.stories = await StoryFinder.findStoriesMatchingText(db, search, env, 5);
            }
        } else if (date) {
            props.stories = await StoryFinder.findStoriesOnDate(db, date, 5);
            if (!props.selectedUser) {
                // we have used stats to narrow down the user list earlier; do
                // it again based on the story list in case we got an incomplete
                // list due to out-of-date stats
                props.visibleUsers = null;
            }
        } else {
            props.stories = await StoryFinder.findStoriesByUsersInListings(db, 'news', props.visibleUsers, props.currentUser, 5, freshListing);
        }
        if (!props.visibleUsers) {
            // now that we have the stories, we can see whom should be shown
            props.visibleUsers = findUsersWithStories(props.members, props.stories);
        }
        meanwhile.show(<PeoplePageSync {...props} />);
        if (props.selectedUser) {
            // load stories of selected user
            if (search) {
                if (tags) {
                    props.selectedUserStories = await StoryFinder.findStoriesByUserWithTags(db, props.selectedUser, tags);
                } else {
                    props.selectedUserStories = await StoryFinder.findStoriesByUserMatchingText(db, props.selectedUser, search, env);
                }
            } else if (date) {
                props.selectedUserStories = await StoryFinder.findStoriesByUserOnDate(db, props.selectedUser, date);
            } else {
                props.selectedUserStories = await StoryFinder.findStoriesByUserInListing(db, 'news', props.selectedUser, props.currentUser, freshListing);
            }
        } else {
            // deal with situation where we're showing stories by someone
            // who're not on the team (only when we're searching for stories)
            if (search || date) {
                let authorIDs = _.uniq(_.flatten(_.map(props.stories, 'user_ids')));
                let memberIDs = _.map(props.members, 'id');
                let nonMemberUserIDs = _.difference(authorIDs, memberIDs);
                let publicOnly = (props.currentUser.type === 'guest');
                if (!_.isEmpty(nonMemberUserIDs)) {
                    let users = await UserFinder.findUsers(db, nonMemberUserIDs);
                    // add non-members
                    if (props.visibleUsers) {
                        props.visibleUsers = _.concat(props.visibleUsers, users);
                    } else {
                        props.visibleUsers = users;
                    }
                    meanwhile.show(<PeoplePageSync {...props} />);
                    let nonMemberStats = await StatisticsFinder.findDailyActivitiesOfUsers(db, props.project, users, publicOnly);
                    props.dailyActivities = _.assign({}, props.dailyActivities, stats);
                }
            }
        }

        // when we're highlighting a story, make sure the story is actually there
        if (!date) {
            if (highlightStoryID) {
                let allStories = props.selectedUserStories;
                if (!_.find(allStories, { id: highlightStoryID })) {
                    try {
                        let story = await StoryFinder.findStory(db, highlightStoryID);
                        await this.redirectToStory(story);
                    } catch (err) {
                    }
                }
            }
        }
        return <PeoplePageSync {...props} />;
    }

    /**
     * Redirect to page showing stories on the date of a story
     *
     * @param  {Story} story
     *
     * @return {Promise}
     */
    redirectToStory(story) {
        let { route, selectedUserID } = this.props;
        if (story.ptime && story.published && story.ready !== false) {
            // don't redirect if the story is very recent
            let elapsed = Moment() - Moment(story.ptime);
            if (elapsed < 60 * 1000) {
                return;
            }
        }
        let params = {
            date: Moment(story.ptime).format('YYYY-MM-DD'),
            selectedUserID,
            highlightStoryID: story.id,
        };
        return route.replace(route.name, params);
    }
}

/**
 * Synchronous component that actually renders the People/Person page.
 *
 * @extends PureComponent
 */
class PeoplePageSync extends PureComponent {
    static displayName = 'PeoplePageSync';

    constructor(props) {
        super(props);
        this.state = {
            chartType: undefined
        };
    }

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
     * Remember the previously selected user
     */
    componentWillReceiveProps(nextProps) {
        let { selectedUser } = this.props;
        if (nextProps.selectedUser !== selectedUser) {
            this.previouslySelectedUser = selectedUser;
        }
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        return (
            <PageContainer className="people-page">
                {this.renderUserList()}
                {this.renderSelectedUserStoryList()}
                {this.renderEmptyMessage()}
            </PageContainer>
        );
    }

    /**
     * Render list of users
     *
     * @return {ReactElement}
     */
    renderUserList() {
        let {
            database,
            route,
            env,
            visibleUsers,
            dailyActivities,
            listings,
            stories,
            currentUser,
            date,
            selectedUserID,
            scrollToUserID,
        } = this.props;
        let listProps = {
            users: visibleUsers,
            dailyActivities,
            listings,
            stories,
            currentUser,
            selectedDate: date,
            link: (selectedUserID) ? 'team' : 'user',
            scrollToUserID,
            database,
            route,
            env,
        };
        return <UserList {...listProps} />
    }

    /**
     * Render list of stories authored by selected user
     *
     * @return {ReactElement|null}
     */
    renderSelectedUserStoryList() {
        let {
            database,
            route,
            env,
            payloads,
            selectedUser,
            project,
            selectedUserStories,
            currentUser,
            highlightStoryID,
            scrollToStoryID,
        } = this.props;
        if (!selectedUser || !selectedUserStories) {
            return null;
        }
        let listProps = {
            access: this.getAccessLevel(),
            stories: selectedUserStories,
            currentUser,
            project,
            highlightStoryID,
            scrollToStoryID,

            database,
            payloads,
            route,
            env,
        };
        return <StoryList {...listProps} />
    }

    /**
     * Render a message if there're no bookmarks
     *
     * @return {ReactElement|null}
     */
    renderEmptyMessage() {
        let {
            env,
            selectedUser,
            selectedUserStories,
            visibleUsers,
            date,
            roleIDs,
            search,
        } = this.props;
        let list = (selectedUser) ? selectedUserStories : visibleUsers;
        if (!_.isEmpty(list)) {
            return null;
        }
        if (!list) {
            // props.users and props.stories are null when they're being loaded
            return <LoadingAnimation />;
        } else {
            let phrase;
            if (date) {
                phrase = 'people-no-stories-on-date';
            } else if (!_.isEmpty(roleIDs)) {
                phrase = 'people-no-users-by-role';
            } else if (search) {
                phrase = 'people-no-stories-found';
            } else {
                phrase = 'people-no-users-yet';
            }
            let props = { phrase, env };
            return <EmptyMessage {...props} />;
        }
    }
}

const findUsersWithRoles = memoizeWeak(null, function(users, roleIDs) {
    return _.filter(users, (user) => {
        return _.some(user.role_ids, (roleID) => {
            return _.includes(roleIDs, roleID);
        });
    });
});

const findUsersWithActivitiesOnDate = memoizeWeak(null, function(users, statistics, date) {
    return _.filter(users, (user) => {
        let userStats = statistics[user.id];
        if (userStats) {
            return userStats.daily[date];
        }
    });
});

const findUsersWithStoriesWithTags = memoizeWeak(null, function(users, statistics, tags) {
    return _.filter(users, (user) => {
        let userStats = statistics[user.id];
        if (userStats) {
            return _.some(userStats.daily, (counts, date) => {
                return _.some(tags, (tag) => {
                    return !!counts[tag];
                });
            });
        }
    });
});

const findUsersWithStories = memoizeWeak(null, function(users, stories) {
    return _.filter(users, (user) => {
        return _.some(stories, (story) => {
            return _.includes(story.user_ids, user.id);
        });
    });
});

export {
    PeoplePage as default,
    PeoplePage,
    PeoplePageSync,
};

import Database from 'data/database';
import Payloads from 'transport/payloads';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    PeoplePage.propTypes = {
        roleIDs: PropTypes.arrayOf(PropTypes.number),
        search: PropTypes.string,
        date: PropTypes.string,
        selectedUserID: PropTypes.number,
        scrollToUserID: PropTypes.number,
        highlightStoryID: PropTypes.number,
        scrollToStoryID: PropTypes.number,

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
    PeoplePageSync.propTypes = {
        roleIDs: PropTypes.arrayOf(PropTypes.number),
        search: PropTypes.string,
        date: PropTypes.string,
        scrollToUserID: PropTypes.number,
        highlightStoryID: PropTypes.number,
        scrollToStoryID: PropTypes.number,
        project: PropTypes.object,
        members: PropTypes.arrayOf(PropTypes.object),
        selectedUser: PropTypes.object,
        visibleUsers: PropTypes.arrayOf(PropTypes.object),
        dailyActivities: PropTypes.object,
        listings: PropTypes.arrayOf(PropTypes.object),
        stories: PropTypes.arrayOf(PropTypes.object),
        selectedUserStories: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
