import _ from 'lodash';
import Promise from 'bluebird';
import Moment from 'moment';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import Memoize from 'utils/memoize';
import Empty from 'data/empty';
import DateTracker from 'utils/date-tracker';
import ProjectFinder from 'objects/finders/project-finder';
import ProjectSettings from 'objects/settings/project-settings';
import StatisticsFinder from 'objects/finders/statistics-finder';
import StoryFinder from 'objects/finders/story-finder';
import UserFinder from 'objects/finders/user-finder';
import TagScanner from 'utils/tag-scanner';

// widgets
import PageContainer from 'widgets/page-container';
import UserList from 'lists/user-list';
import StoryList from 'lists/story-list';
import LoadingAnimation from 'widgets/loading-animation';
import EmptyMessage from 'widgets/empty-message';

import './people-page.scss';

class PeoplePage extends AsyncComponent {
    static displayName = 'PeoplePage';

    constructor(props) {
        super(props);
        this.state = {
            today: DateTracker.today,
        };
    }

    /**
     * Match current URL against the page's
     *
     * @param  {String} path
     * @param  {Object} query
     *
     * @return {Object|null}
     */
    static parseURL(path, query) {
        return Route.match(path, [
            '/:schema/people/:user/?',
            '/:schema/people/?',
        ], (params) => {
            return {
                schema: params.schema,
                search: query.search,
                user: Route.parseId(params.user),
                date: Route.parseDate(query.date),
                roles: Route.parseIdList(query.roles),
            };
        });
    }

    /**
     * Generate a URL of this page based on given parameters
     *
     * @param  {Object} params
     *
     * @return {Object}
     */
    static getURL(params) {
        var path = `/${params.schema}/people/`, query = {};
        if (params.user) {
            path += `${params.user}/`;
        }
        if (params.date != undefined) {
            query.date = params.date;
        }
        if (params.roles != undefined) {
            query.roles = params.roles.join(' ');
        }
        if (params.search != undefined) {
            query.search = params.search;
        }
        return { path, query };
    }

    /**
     * Return configuration info for global UI elements
     *
     * @param  {Route} currentRoute
     *
     * @return {Object}
     */
    static configureUI(currentRoute) {
        var params = currentRoute.parameters;
        var route = {
            schema: params.schema,
            user: params.user,
        };
        var statistics = {
            type: 'daily-activities',
            schema: params.schema,
            user_id: params.user,
        };
        if (!params.user) {
            return {
                calendar: { route, statistics },
                filter: { route },
                search: { route, statistics },
                navigation: { route, section: 'people' }
            };
        } else {
            return {
                calendar: { route, statistics },
                search: { route, statistics },
                navigation: {
                    // go back to full list
                    route: _.omit(route, 'user'),
                    section: 'people'
                }
            };
        }
    }

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync(meanwhile) {
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: params.schema, by: this });
        var tags;
        if (params.search && !TagScanner.removeTags(params.search)) {
            tags = TagScanner.findTags(params.search);
            if (_.isEmpty(tags)) {
                tags = null;
            }
        }
        var props = {
            project: null,
            members: null,
            stories: null,
            currentUser: null,
            selectedUser: null,
            visibleUsers: null,

            selectedDate: params.date,
            today: this.state.today,
            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        // wait for retrieval of fresh story listing on initial render
        var freshListing = meanwhile.revising() ? false : true;
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
                if (params.user) {
                    // find the selected user
                    var user = _.find(users, { id: params.user });
                    if (!user) {
                        props.selectedUser = user;
                        props.visibleUsers = [ user ];
                    } else {
                        // not on the member list
                        return UserFinder.findUser(db, params.user).then((user) => {
                            props.selectedUser = user;
                            props.visibleUsers = [ user ];
                        });
                    }
                } else {
                    // if we're not searching for stories, then we know which
                    // users to list at this point
                    if (!(params.search || params.date)) {
                        if (!_.isEmpty(params.roles)) {
                            // show users with roles
                            props.visibleUsers = findUsersWithRoles(users, params.roles);
                        } else {
                            // all project members are shown
                            props.visibleUsers = users;
                        }
                    }
                }
            });
        }).then(() => {
            if (this.props.theme.mode !== 'single-col') {
                // don't render without stats in single-column mode, since
                // that affects the height of the view
                meanwhile.show(<PeoplePageSync {...props} />);
            }
            var publicOnly = (props.currentUser.type === 'guest');
            return StatisticsFinder.findDailyActivitiesOfUsers(db, props.project, props.members, publicOnly).then((statistics) => {
                props.dailyActivities = statistics;
                if (!props.visibleUsers) {
                    // find users with stories using stats
                    var users;
                    if (params.date) {
                        users = findUsersWithActivitiesOnDate(props.members, statistics, params.date);
                    } else if (params.search) {
                        if (tags) {
                            users = findUsersWithStoriesWithTags(props.members, statistics, tags);
                        }
                    }
                    if (users) {
                        if (!_.isEmpty(params.roles)) {
                            props.visibleUsers = findUsersWithRoles(users, params.roles);
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
            if (params.search) {
                if (tags) {
                    return StoryFinder.findStoriesWithTags(db, tags, 5).then((stories) => {
                        props.stories = stories;
                        if (!props.selectedUser) {
                            // now that we have the stories, we can see whom should be shown
                            props.visibleUsers = findUsersWithStories(props.members, stories);
                        }
                    });
                } else {
                    return StoryFinder.findStoriesMatchingText(db, params.search, this.props.locale, 5).then((stories) => {
                        props.stories = stories;
                        if (!props.selectedUser) {
                            // now that we have the stories, we can see whom should be shown
                            props.visibleUsers = findUsersWithStories(props.members, stories);
                        }
                    });
                }
            } else if (params.date) {
                return StoryFinder.findStoriesOnDate(db, params.date, 5).then((stories) => {
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
                if (params.search) {
                    if (tags) {
                        return StoryFinder.findStoriesByUserWithTags(db, props.selectedUser, tags).then((stories) => {
                            props.selectedUserStories = stories;
                        });
                    } else {
                        return StoryFinder.findStoriesByUserMatchingText(db, props.selectedUser, params.search, this.props.locale).then((stories) => {
                            props.selectedUserStories = stories;
                        });
                    }
                } else if (params.date) {
                    return StoryFinder.findStoriesByUserOnDate(db, props.selectedUser, params.date).then((stories) => {
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
                var authorIds = _.uniq(_.flatten(_.map(props.stories, 'user_ids')));
                var memberIds = _.map(props.members, 'id');
                var nonMemberUserIds = _.difference(authorIds, memberIds);
                var publicOnly = (props.currentUser.type === 'guest');
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
            if (!params.date) {
                var hashParams = StoryList.parseHash(this.props.route.hash);
                if (hashParams.story && hashParams.highlighting) {
                    var allStories = props.selectedUserStories;
                    if (!_.find(allStories, { id: hashParams.story })) {
                        return StoryFinder.findStory(db, hashParams.story).then((story) => {
                            return this.redirectToStory(params.schema, story);
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
     * @param  {String} schema
     * @param  {Story} story
     *
     * @return {Promise}
     */
    redirectToStory(schema, story) {
        var redirect = true;
        if (story.ptime && story.published && story.ready !== false) {
            // don't redirect if the story is very recent
            var elapsed = Moment() - Moment(story.ptime);
            if (elapsed < 60 * 1000) {
                return;
            }
        }
        if (redirect) {
            var components = [
                require('pages/people-page'),
                require('lists/story-list'),
            ];
            var params = {
                schema: schema,
                date: Moment(story.ptime).format('YYYY-MM-DD'),
                user: story.user_ids[0],
                story: story.id,
                highlighting: true,
            };
            return this.props.route.replace(components, params);
        }
    }

    /**
     * Listen for date change event
     */
    componentDidMount() {
        DateTracker.addEventListener('change', this.handleDateChange);
    }

    /**
     * Remove event listener
     */
    componentWillUnmount() {
        DateTracker.removeEventListener('change', this.handleDateChange);
    }

    /**
     * Force rerendering by setting today's date
     */
    handleDateChange = (evt) => {
        // force rerendering
        this.setState({ today: DateTracker.today });
    }
}

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
        var { project, currentUser } = this.props;
        return ProjectSettings.getUserAccessLevel(project, currentUser) || 'read-only';
    }

    /**
     * Remember the previously selected user
     */
    componentWillReceiveProps(nextProps) {
        if (this.props.selectedUser && !nextProps.selectedUser) {
            this.previouslySelectedUser = this.props.selectedUser;
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
        var params = this.props.route.parameters;
        var listProps = {
            users: this.props.visibleUsers,
            dailyActivities: this.props.dailyActivities,
            listings: this.props.listings,
            stories: this.props.stories,
            currentUser: this.props.currentUser,
            selectedDate: this.props.selectedDate,
            today: this.props.today,
            link: (this.props.selectedUser) ? 'team' : 'user',

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <UserList {...listProps} />
    }

    /**
     * Render list of stories authored by selected user
     *
     * @return {ReactElement|null}
     */
    renderSelectedUserStoryList() {
        if (!this.props.selectedUser || !this.props.selectedUserStories) {
            return null;
        }
        var params = this.props.route.parameters;
        var listProps = {
            access: this.getAccessLevel(),
            stories: this.props.selectedUserStories,
            currentUser: this.props.currentUser,
            project: this.props.project,

            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <StoryList {...listProps} />
    }

    /**
     * Render a message if there're no bookmarks
     *
     * @return {ReactElement|null}
     */
    renderEmptyMessage() {
        var list;
        if (this.props.selectedUser) {
            list = this.props.selectedUserStories;
        } else {
            list = this.props.visibleUsers;
        }
        if (!_.isEmpty(list)) {
            return null;
        }
        if (!list) {
            // props.users and props.stories are null when they're being loaded
            return <LoadingAnimation />;
        } else {
            var params = this.props.route.parameters;
            var phrase;
            if (params.date) {
                phrase = 'people-no-stories-on-date';
            } else if (!_.isEmpty(params.roles)) {
                phrase = 'people-no-users-by-role';
            } else if (params.search) {
                phrase = 'people-no-stories-found';
            } else {
                phrase = 'people-no-users-yet';
            }
            var props = {
                locale: this.props.locale,
                online: this.props.database.online,
                phrase,
            };
            return <EmptyMessage {...props} />;
        }
    }
}

var findUsersWithRoles = Memoize(function(users, roleIds) {
    return _.filter(users, (user) => {
        return _.some(user.role_ids, (roleId) => {
            return _.includes(roleIds, roleId);
        });
    });
    if (!_.isEmpty(list)) {
        return list;
    }
    return Empty.array;
});

var findUsersWithActivitiesOnDate = Memoize(function(users, statistics, date) {
    var list = _.filter(users, (user) => {
        var userStats = statistics[user.id];
        if (userStats) {
            return userStats.daily[date];
        }
    });
    if (!_.isEmpty(list)) {
        return list;
    }
    return list;
});

var findUsersWithStoriesWithTags = Memoize(function(users, statistics, tags) {
    var list = _.filter(users, (user) => {
        var userStats = statistics[user.id];
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
    return list;
});

var findUsersWithStories = Memoize(function(users, stories) {
    var list = _.filter(users, (user) => {
        return _.some(stories, (story) => {
            return _.includes(story.user_ids, user.id);
        });
    });
    if (!_.isEmpty(list)) {
        return list;
    }
    return list;
});

export {
    PeoplePage as default,
    PeoplePage,
    PeoplePageSync,
};

import Database from 'data/database';
import Payloads from 'transport/payloads';
import Route from 'routing/route';
import Locale from 'locale/locale';
import Theme from 'theme/theme';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    PeoplePage.propTypes = {
        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    };
    PeoplePageSync.propTypes = {
        project: PropTypes.object,
        members: PropTypes.arrayOf(PropTypes.object),
        selectedUser: PropTypes.object,
        visibleUsers: PropTypes.arrayOf(PropTypes.object),
        dailyActivities: PropTypes.object,
        listings: PropTypes.arrayOf(PropTypes.object),
        stories: PropTypes.arrayOf(PropTypes.object),
        selectedUserStories: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,
        selectedDate: PropTypes.string,
        today: PropTypes.string,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    };
}
