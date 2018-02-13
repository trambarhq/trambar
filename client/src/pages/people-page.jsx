var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Moment = require('moment');
var Memoize = require('utils/memoize');
var DateTracker = require('utils/date-tracker');
var DateUtils = require('utils/date-utils');
var TagScanner = require('utils/tag-scanner');

var ProjectSettings = require('objects/settings/project-settings');

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
            if (!currentRoute.parameters.user) {
                var route = {
                    parameters: _.pick(currentRoute.parameters, 'schema')
                };
                var statistics = {
                    type: 'daily-activities',
                    filters: {},
                };
                return {
                    calendar: { route, statistics },
                    filter: { route },
                    search: { route, statistics },
                    navigation: { route, section: 'people' }
                };
            } else {
                var route = {
                    parameters: _.pick(currentRoute.parameters, 'schema', 'user')
                };
                var statistics = {
                    type: 'daily-activities',
                    filters: {
                        user_ids: [ route.parameters.user ]
                    },
                };
                return {
                    calendar: { route, statistics },
                    search: { route, statistics },
                    navigation: {
                        route: {
                            parameters: _.pick(currentRoute.parameters, 'schema')
                        },
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
        var props = {
            project: null,
            users: null,
            stories: null,
            currentUser: null,
            selectedDate: params.date,
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
            return meanwhile.show(<PeoplePageSync {...props} />);
        }).then(() => {
            if (params.search || params.date) {
                // search for matching stories
                var criteria = {
                    published: true,
                    ready: true,
                    per_user_limit: 5
                };
                var remote;
                if (params.search) {
                    if (!TagScanner.removeTags(params.search)) {
                        // search by tags only (which can happen locally)
                        criteria.tags = TagScanner.findTags(params.search);
                    } else {
                        criteria.search = {
                            lang: this.props.locale.languageCode,
                            text: params.search,
                        };
                        // don't scan local cache
                        remote = true;
                    }
                    criteria.limit = 100;
                } else if (params.date) {
                    criteria.time_range = DateUtils.getDayRange(params.date);
                }
                if (!_.isEmpty(params.roles)) {
                    criteria.role_ids = params.roles;
                }
                return db.find({ table: 'story', criteria, remote });
            }
        }).then((stories) => {
            if (stories) {
                // list authors of matching stories
                props.stories = stories;
                var userIds = _.uniq(_.flatten(_.map(stories, 'user_ids')));
                var criteria = {
                    id: userIds,
                    hidden: false
                };
                return db.find({ schema: 'global', table: 'user', criteria });
            } else {
                // find all users that are project members
                var criteria = {
                    id: props.project.user_ids,
                    hidden: false
                };
                if (!_.isEmpty(params.roles)) {
                    criteria.role_ids = params.roles;
                }
                return db.find({ schema: 'global', table: 'user', criteria });
            }
        }).then((users) => {
            props.users = users;
            return meanwhile.show(<PeoplePageSync {...props} />);
        }).then(() => {
            if (!params.user) {
                return;
            }
            // look for stories of selected user
            props.selectedUser = _.find(props.users, { id: params.user });
            if (params.date || params.search) {
                var remote;
                // load story matching filters
                var criteria = {
                    user_ids: [ params.user ],
                };
                if (params.date) {
                    criteria.time_range = DateUtils.getDayRange(params.date);
                }
                if (params.search) {
                    if (!TagScanner.removeTags(params.search)) {
                        // search by tags only (which can happen locally)
                        criteria.tags = TagScanner.findTags(params.search);
                    } else {
                        criteria.search = {
                            lang: this.props.locale.languageCode,
                            text: params.search,
                        };
                        // don't scan local cache
                        remote = true;
                    }
                    criteria.limit = 100;
                } else {
                    criteria.limit = 500;
                }
                return db.find({ table: 'story', criteria, remote });
            } else {
                // load story in listing
                var criteria = {
                    type: 'news',
                    target_user_id: props.currentUser.id,
                    filters: {
                        user_ids: [ params.user ]
                    },
                };
                return db.findOne({ table: 'listing', criteria }).then((listing) => {
                    if (!listing) {
                        return [];
                    }
                    var criteria = {};
                    criteria.id = listing.story_ids;
                    return db.find({ table: 'story', criteria });
                }).then((stories) => {
                    if (params.story) {
                        // see if the story is in the list
                        if (!_.find(stories, { id: params.story })) {
                            // redirect to page showing stories on the date
                            // of the story; to do that, we need the object
                            // itself
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
        }).then((stories) => {
            props.selectedUserStories = stories;
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
        users: PropTypes.arrayOf(PropTypes.object),
        listings: PropTypes.arrayOf(PropTypes.object),
        stories: PropTypes.arrayOf(PropTypes.object),
        selectedUser: PropTypes.object,
        selectedUserStories: PropTypes.arrayOf(PropTypes.object),
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
        if (!this.props.currentUser || !this.props.users) {
            return null;
        }
        var listProps = {
            users: this.props.users,
            stories: this.props.stories,
            currentUser: this.props.currentUser,
            selectedDate: this.props.selectedDate,
            selectedUser: this.props.selectedUser,

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
        if (!this.props.selectedUserStories) {
            return null;
        }
        var params = this.props.route.parameters;
        var listProps = {
            access: this.getAccessLevel(),
            stories: this.props.selectedUserStories,
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
            list = this.props.users;
        } else {
            list = this.props.selectedUserStories;
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
