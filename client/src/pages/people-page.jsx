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
    renderAsync(meanwhile) {
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
            project: null,
            members: null,
            stories: null,
            currentUser: null,
            selectedUser: null,
            visibleUsers: null,

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
        return db.start().then((currentUserId) => {
            return UserFinder.findUser(db, currentUserId).then((user) => {
                props.currentUser = user;
            });
        }).then(() => {
            return ProjectFinder.findCurrentProject(db).then((project) => {
                props.project = project;
            });
        }).then((project) => {
            return UserFinder.findProjectMembers(db, props.project).then((users) => {
                props.members = users;
                if (selectedUserID) {
                    // find the selected user
                    let user = _.find(users, { id: selectedUserID });
                    if (!user) {
                        props.selectedUser = user;
                        props.visibleUsers = [ user ];
                    } else {
                        // not on the member list
                        return UserFinder.findUser(db, selectedUserID).then((user) => {
                            props.selectedUser = user;
                            props.visibleUsers = [ user ];
                        });
                    }
                } else {
                    // if we're not searching for stories, then we know which
                    // users to list at this point
                    if (!(search || date)) {
                        if (!_.isEmpty(roleIDs)) {
                            // show users with roles
                            props.visibleUsers = findUsersWithRoles(users, roleIDs);
                        } else {
                            // all project members are shown
                            props.visibleUsers = users;
                        }
                    }
                }
            });
        }).then(() => {
            if (env.isWiderThan('double-col')) {
                // don't render without stats in single-column mode, since
                // that affects the height of the view
                meanwhile.show(<PeoplePageSync {...props} />);
            }
            let publicOnly = (props.currentUser.type === 'guest');
            return StatisticsFinder.findDailyActivitiesOfUsers(db, props.project, props.members, publicOnly).then((statistics) => {
                props.dailyActivities = statistics;
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
                        return StatisticsFinder.findDailyActivitiesOfUser(db, props.project, props.selectedUser, publicOnly).then((selectedUserStats) => {
                            _.set(props.dailyActivities, props.selectedUser.id, selectedUserStats);
                        });
                    }
                }
            });
        }).then(() => {
            // force progress update initially to avoid flicking
            meanwhile.show(<PeoplePageSync {...props} />, 'initial');
            if (search) {
                if (tags) {
                    return StoryFinder.findStoriesWithTags(db, tags, 5).then((stories) => {
                        props.stories = stories;
                        if (!props.selectedUser) {
                            // now that we have the stories, we can see whom should be shown
                            props.visibleUsers = findUsersWithStories(props.members, stories);
                        }
                    });
                } else {
                    return StoryFinder.findStoriesMatchingText(db, search, env, 5).then((stories) => {
                        props.stories = stories;
                        if (!props.selectedUser) {
                            // now that we have the stories, we can see whom should be shown
                            props.visibleUsers = findUsersWithStories(props.members, stories);
                        }
                    });
                }
            } else if (date) {
                return StoryFinder.findStoriesOnDate(db, date, 5).then((stories) => {
                    props.stories = stories;
                    if (!props.selectedUser) {
                        // do this for date search as well, even through
                        // we use stats to narrow down the list earlier, just in
                        // case we got an incomplete list due to out-of-date stats
                        props.visibleUsers = findUsersWithStories(props.members, stories);
                    }
                })
            } else {
                return StoryFinder.findStoriesByUsersInListings(db, 'news', props.visibleUsers, props.currentUser, 5, freshListing).then((stories) => {
                    props.stories = stories;
                });
            }
        }).then(() => {
            meanwhile.show(<PeoplePageSync {...props} />);
            if (props.selectedUser) {
                // load stories of selected user
                if (search) {
                    if (tags) {
                        return StoryFinder.findStoriesByUserWithTags(db, props.selectedUser, tags).then((stories) => {
                            props.selectedUserStories = stories;
                        });
                    } else {
                        return StoryFinder.findStoriesByUserMatchingText(db, props.selectedUser, search, env).then((stories) => {
                            props.selectedUserStories = stories;
                        });
                    }
                } else if (date) {
                    return StoryFinder.findStoriesByUserOnDate(db, props.selectedUser, date).then((stories) => {
                        props.selectedUserStories = stories;
                    });
                } else {
                    return StoryFinder.findStoriesByUserInListing(db, 'news', props.selectedUser, props.currentUser, freshListing).then((stories) => {
                        props.selectedUserStories = stories;
                    });
                }
            } else {
                // deal with situation where we're showing stories by someone
                // who're not on the team
                let authorIds = _.uniq(_.flatten(_.map(props.stories, 'user_ids')));
                let memberIds = _.map(props.members, 'id');
                let nonMemberUserIds = _.difference(authorIds, memberIds);
                let publicOnly = (props.currentUser.type === 'guest');
                if (!_.isEmpty(nonMemberUserIds)) {
                    return UserFinder.findUsers(db, nonMemberUserIds).then((users) => {
                        // add non-members
                        props.visibleUsers = _.concat(props.visibleUsers, users);
                        meanwhile.show(<PeoplePageSync {...props} />);
                        return StatisticsFinder.findDailyActivitiesOfUsers(db, props.project, users, publicOnly).then((stats) => {
                            // add their stats
                            props.dailyActivities = _.assign({}, props.dailyActivities, stats);
                        });
                    });
                }
            }
        }).then(() => {
            // when we're highlighting a story, make sure the story is actually there
            if (!date) {
                if (highlightStoryID) {
                    let allStories = props.selectedUserStories;
                    if (!_.find(allStories, { id: highlightStoryID })) {
                        return StoryFinder.findStory(db, highlightStoryID).then((story) => {
                            return this.redirectToStory(story);
                        }).catch((err) => {
                        });
                    }
                }
            }
        }).then(() => {
            return <PeoplePageSync {...props} />;
        });
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

const findUsersWithRoles = memoizeWeak(null, function(users, roleIds) {
    let list = _.filter(users, (user) => {
        return _.some(user.role_ids, (roleId) => {
            return _.includes(roleIds, roleId);
        });
    });
    if (!_.isEmpty(list)) {
        return list;
    }
});

const findUsersWithActivitiesOnDate = memoizeWeak(null, function(users, statistics, date) {
    let list = _.filter(users, (user) => {
        let userStats = statistics[user.id];
        if (userStats) {
            return userStats.daily[date];
        }
    });
    if (!_.isEmpty(list)) {
        return list;
    }
});

const findUsersWithStoriesWithTags = memoizeWeak(null, function(users, statistics, tags) {
    let list = _.filter(users, (user) => {
        let userStats = statistics[user.id];
        if (userStats) {
            return _.some(userStats.daily, (counts, date) => {
                return _.some(tags, (tag) => {
                    return !!counts[tag];
                });
            });
        }
    });
    if (!_.isEmpty(list)) {
        return list;
    }
});

const findUsersWithStories = memoizeWeak(null, function(users, stories) {
    let list = _.filter(users, (user) => {
        return _.some(stories, (story) => {
            return _.includes(story.user_ids, user.id);
        });
    });
    if (!_.isEmpty(list)) {
        return list;
    }
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
