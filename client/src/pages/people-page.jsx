var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Moment = require('moment');
var Memoize = require('utils/memoize');
var DateTracker = require('utils/date-tracker');
var DateUtils = require('utils/date-utils');
var TagScanner = require('utils/tag-scanner');
var ProjectSettings = require('objects/settings/project-settings');
var StatisticsUtils = require('objects/utils/statistics-utils');

var Database = require('data/database');
var Payloads = require('transport/payloads');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var UserList = require('lists/user-list');
var StoryList = require('lists/story-list');
var LoadingAnimation = require('widgets/loading-animation');
var EmptyMessage = require('widgets/empty-message');

require('./people-page.scss')

module.exports = Relaks.createClass({
    displayName: 'PeoplePage',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    statics: {
        /**
         * Match current URL against the page's
         *
         * @param  {String} path
         * @param  {Object} query
         * @param  {String} hash
         *
         * @return {Object|null}
         */
        parseURL: function(path, query, hash) {
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
                    story: Route.parseId(hash, /S(\d+)/i),
                    reaction: Route.parseId(hash, /R(\d+)/i),
                };
            });
        },

        /**
         * Generate a URL of this page based on given parameters
         *
         * @param  {Object} params
         *
         * @return {Object}
         */
        getURL: function(params) {
            var path = `/${params.schema}/people/`, query = {}, hash;
            if (params.user) {
                path += `${params.user}/`;
            }
            if (params.date != undefined) {
                query.date = params.date;
            }
            if (params.roles != undefined) {
                query.roles = params.roles.join('+');
            }
            if (params.search != undefined) {
                query.search = params.search;
            }
            if (params.story) {
                hash = `S${params.story}`;
                if (params.reaction) {
                    hash += `R${params.reaction}`;
                }
            }
            return { path, query, hash };
        },

        /**
         * Return configuration info for global UI elements
         *
         * @param  {Route} currentRoute
         *
         * @return {Object}
         */
        configureUI: function(currentRoute) {
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
        },
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            today: DateTracker.today,
        };
    },

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     * @param  {Object} prevProps
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync: function(meanwhile, prevProps) {
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: params.schema, by: this });
        var delay = (this.props.route !== prevProps.route) ? 100 : 1000;
        var tags;
        if (_.trim(params.search) && !TagScanner.removeTags(params.search)) {
            // search by tags only (which can happen locally)
            tags = TagScanner.findTags(params.search);
        }
        var props = {
            project: null,
            members: null,
            stories: null,
            currentUser: null,
            selectedDate: params.date,
            selectedUser: null,
            visibleUsers: null,
            today: this.state.today,

            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<PeoplePageSync {...props} />, delay);
        return db.start().then((userId) => {
            // load current user
            var criteria = { id: userId };
            return db.findOne({ schema: 'global', table: 'user', criteria, required: true });
        }).then((user) => {
            props.currentUser = user;
            meanwhile.check();
        }).then(() => {
            // load project
            var criteria = {
                name: params.schema
            };
            return db.findOne({ schema: 'global', table: 'project', criteria, required: true });
        }).then((project) => {
            props.project = project;
        }).then(() => {
            // load project members
            var criteria = {
                id: props.project.user_ids,
            };
            return db.find({ schema: 'global', table: 'user', criteria });
        }).then((users) => {
            props.members = users;
            if (params.user) {
                // find the selected user
                var user = _.find(users, { id: params.user });
                if (user) {
                    props.selectedUser = user;
                    props.visibleUsers = [ user ];
                } else {
                    // not on the member list
                    var criteria = { id: params.user };
                    return db.findOne({ schema: 'global', table: 'user', criteria, required: true }).then((user) => {
                        props.selectedUser = user;
                        props.visibleUsers = [ user ];
                    });
                }
            } else {
                if (!(params.search || params.date )) {
                    if (!_.isEmpty(params.roles)) {
                        // show users with roles
                        props.visibleUsers = findUsersWithRoles(users, params.roles);
                    } else {
                        // all project members are shown
                        props.visibleUsers = users;
                    }
                }
            }
        }).then(() => {
            return meanwhile.show(<PeoplePageSync {...props} />);
        }).then(() => {
            // load daily-activities statistics
            return StatisticsUtils.fetchUsersDailyActivities(db, props.project, props.members);
        }).then((statistics) => {
            props.dailyActivities = statistics;
            if (!props.visibleUsers) {
                // find users with stories using stats
                var users;
                if (params.date) {
                    users = findUsersWithActivitiesOnDate(props.members, statistics, params.date);
                } else if (tags) {
                    users = findUsersWithStoriesWithTags(props.members, statistics, tags);
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
                    return StatisticsUtils.fetchUsersDailyActivities(db, props.project, [ props.selectedUser ]).then((selectedUserStats) => {
                        props.dailyActivities = _.assign({}, props.dailyActivities, selectedUserStats);
                    });
                }
            }
        }).then(() => {
            return meanwhile.show(<PeoplePageSync {...props} />);
        }).then(() => {
            if (params.search || params.date) {
                // search for matching stories
                var criteria = {
                    published: true,
                    ready: true
                };
                var remote;
                if (params.search) {
                    if (tags) {
                        criteria.tags = tags;
                    } else {
                        criteria.search = {
                            lang: this.props.locale.languageCode,
                            text: params.search,
                        };
                        // don't scan local cache
                        remote = true;
                    }
                }
                if (params.date) {
                    criteria.time_range = DateUtils.getDayRange(params.date);
                }
                if (props.selectedUser) {
                    criteria.user_ids = [ props.selectedUser.id ];
                    // limit the number of results
                    if (params.search) {
                        criteria.limit = 100;
                    } else {
                        criteria.limit = 500;
                    }
                } else {
                    // fetch only 5 per user for summary display
                    criteria.per_user_limit = 5;
                }
                return db.find({ table: 'story', criteria, remote });
            } else {
                if (!props.selectedUser) {
                    // load story listings, one per user, doing so in separate
                    // requests to enable cache hit when a user is selected
                    return Promise.map(props.visibleUsers, (user) => {
                        var criteria = {
                            type: 'news',
                            target_user_id: props.currentUser.id,
                            filters: {
                                user_ids: [ user.id ]
                            },
                        };
                        return db.findOne({ table: 'listing', criteria });
                    }, { concurrency: 8 }).then((listings) => {
                        props.listings = listings;
                        // load stories in listings
                        var storyIds = _.flatten(_.map(props.listings, (listing) => {
                            // return only the five latest
                            return _.slice(listing.story_ids, -5);
                        }));
                        var criteria = {
                            id: _.uniq(storyIds),
                            published: true,
                            ready: true
                        };
                        return db.find({ table: 'story', criteria });
                    });
                } else {
                    // load listing for selected user
                    var criteria = {
                        type: 'news',
                        target_user_id: props.currentUser.id,
                        filters: {
                            user_ids: [ props.selectedUser.id ]
                        },
                    };
                    return db.findOne({ table: 'listing', criteria }).then((listing) => {
                        if (!listing) {
                            return [];
                        }
                        props.listings = [ listing ];
                        var criteria = {
                            id: listing.story_ids,
                            published: true,
                            ready: true
                        };
                        return db.find({ table: 'story', criteria });
                    }).then((stories) => {
                        // when a user is selected, the URL can point to a specific
                        // story; we need to make sure the story is there
                        if (params.story) {
                            if (!_.find(stories, { id: params.story })) {
                                // redirect to page showing stories on the date of the
                                // story; to do that, we need the object itself
                                var criteria = { id: params.story };
                                return db.findOne({ table: 'story', criteria }).then((story) => {
                                    if (story) {
                                        return this.props.route.replace(require('pages/people-page'), {
                                            date: Moment(story.ptime).format('YYYY-MM-DD'),
                                            user: params.user,
                                            story: params.story
                                        }).return([]);
                                    }
                                    return stories;
                                });
                            }
                        }
                        return stories;
                    });
                }
            }
        }).then((stories) => {
            props.stories = stories;
            if (!props.selectedUser) {
                // now that we have the stories, we can see whom should be shown
                //
                // do this for date search as well, even through
                // we use stats to narrow down the list earlier, just in
                // case we got an incomplete list due to out-of-date stats
                props.visibleUsers = findUsersWithStories(props.members, stories);
            }
            return meanwhile.show(<PeoplePageSync {...props} />);
        }).then(() => {
            if (!props.selectedUser) {
                // deal with situation where we're showing someone who're not on the team
                var authorIds = _.uniq(_.flatten(_.map(props.stories, 'user_ids')));
                var memberIds = _.map(props.members, 'id');
                var nonMemberUserIds = _.difference(authorIds, memberIds);
                if (!_.isEmpty(nonMemberUserIds)) {
                    var criteria = { id: nonMemberUserIds };
                    return db.find({ schema: 'global', table: 'user', criteria }).then((nonmembers) => {
                        props.visibleUsers = _.concat(props.visibleUsers, nonmembers);
                        return StatisticsUtils.fetchUsersDailyActivities(db, props.project, nonmembers).then((nonmemberStats) => {
                            props.dailyActivities = _.assign({}, props.dailyActivities, nonmemberStats);
                        });
                    });
                }
            }
        }).then(() => {
            return <PeoplePageSync {...props} />;
        });
    },

    /**
     * Listen for date change event
     */
    componentDidMount: function() {
        DateTracker.addEventListener('change', this.handleDateChange);
    },

    /**
     * Remove event listener
     */
    componentWillUnmount: function() {
        DateTracker.removeEventListener('change', this.handleDateChange);
    },

    /**
     * Force rerendering by setting today's date
     */
    handleDateChange: function() {
        // force rerendering
        this.setState({ today: DateTracker.today });
    },
});

var PeoplePageSync = module.exports.Sync = React.createClass({
    displayName: 'PeoplePageSync',
    propTypes: {
        project: PropTypes.object,
        members: PropTypes.arrayOf(PropTypes.object),
        selectedUser: PropTypes.object,
        visibleUsers: PropTypes.arrayOf(PropTypes.object),
        dailyActivities: PropTypes.object,
        listings: PropTypes.arrayOf(PropTypes.object),
        stories: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,
        selectedDate: PropTypes.string,
        today: PropTypes.string,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            chartType: undefined
        };
    },

    /**
     * Return the access level
     *
     * @return {String}
     */
    getAccessLevel: function() {
        var { project, currentUser } = this.props;
        return ProjectSettings.getUserAccessLevel(project, currentUser) || 'read-only';
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        return (
            <div className="people-page">
                {this.renderUserList()}
                {this.renderSelectedUserStoryList()}
                {this.renderEmptyMessage()}
            </div>
        );
    },

    /**
     * Render list of users
     *
     * @return {ReactElement}
     */
    renderUserList: function() {
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
    },

    /**
     * Render list of stories authored by selected user
     *
     * @return {ReactElement|null}
     */
    renderSelectedUserStoryList: function() {
        if (!this.props.selectedUser || !this.props.stories) {
            return null;
        }
        var params = this.props.route.parameters;
        var listProps = {
            access: this.getAccessLevel(),
            stories: this.props.stories,
            currentUser: this.props.currentUser,
            project: this.props.project,
            selectedStoryId: params.story,
            selectedReactionId: params.reaction,

            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,

            onSelectionClear: this.handleSelectionClear,
        };
        return <StoryList {...listProps} />
    },

    /**
     * Render a message if there're no bookmarks
     *
     * @return {ReactElement|null}
     */
    renderEmptyMessage: function() {
        var list;
        if (!this.props.selectedUser) {
            list = this.props.visibleUsers;
        } else {
            list = this.props.stories;
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
    },
});

var findUsersWithRoles = Memoize(function(users, roleIds) {
    return _.filter(users, (user) => {
        return _.some(user.role_ids, (roleId) => {
            return _.includes(roleIds, roleId);
        });
    });
});

var findUsersWithActivitiesOnDate = Memoize(function(users, statistics, date) {
    return _.filter(users, (user) => {
        var userStats = statistics[user.id];
        if (userStats) {
            return userStats.daily[date];
        }
    });
});

var findUsersWithStoriesWithTags = Memoize(function(users, statistics, tags) {
    return _.filter(users, (user) => {
        var userStats = statistics[user.id];
        return _.some(userStats.daily, (counts, date) => {
            return _.some(tags, (tag) => {
                return !!counts[tag];
            });
        });
    });
});

var findUsersWithStories = Memoize(function(users, stories) {
    return _.filter(users, (user) => {
        return _.some(stories, (story) => {
            return _.includes(story.user_ids, user.id);
        });
    });
});
