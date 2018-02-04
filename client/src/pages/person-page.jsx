var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Moment = require('moment');
var Relaks = require('relaks');
var DateTracker = require('utils/date-tracker');
var DateUtils = require('utils/date-utils');
var TagScanner = require('utils/tag-scanner');

var ProjectSettings = require('objects/settings/project-settings');

var Database = require('data/database');
var Payloads = require('transport/payloads');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var StoryList = require('lists/story-list');
var UserView = require('views/user-view');
var LoadingAnimation = require('widgets/loading-animation');
var EmptyMessage = require('widgets/empty-message');

require('./news-page.scss');

module.exports = Relaks.createClass({
    displayName: 'PersonPage',
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
            ], (params) => {
                return {
                    schema: params.schema,
                    user: Route.parseId(params.user),
                    search: query.search,
                    date: Route.parseDate(query.date),
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
            var path = `/${params.schema}/people/${params.user}/`, query = {}, hash;
            if (params.date != undefined) {
                query.date = params.date;
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
                navigation: { route, section: 'people' }
            };
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
            stories: null,
            user: null,
            roles: null,
            dailyActivities: null,
            currentUser: null,
            project: null,
            selectedDate: params.date,
            today: this.state.today,

            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<PersonPageSync {...props} />, 250);
        return db.start().then((userId) => {
            // load current user
            var criteria = { id: userId };
            return db.findOne({ schema: 'global', table: 'user', criteria, required: true });
        }).then((user) => {
            props.currentUser = user;
            return meanwhile.show(<PersonPageSync {...props} />);
        }).then(() => {
            // load project
            var criteria = { name: params.schema };
            return db.findOne({ schema: 'global', table: 'project', criteria, required: true });
        }).then((project) => {
            props.project = project;
            return meanwhile.show(<PersonPageSync {...props} />);
        }).then(() => {
            // load the selected user
            var criteria = { id: params.user };
            return db.findOne({ schema: 'global', table: 'user', criteria, required: true });
        }).then((user) => {
            props.user = user;
            return meanwhile.show(<PersonPageSync {...props} />);
        }).then(() => {
            // load roles
            var criteria = {
                id: props.user.role_ids
            };
            return db.find({ schema: 'global', table: 'role', criteria });
        }).then((roles) => {
            props.roles = roles;
            return meanwhile.show(<PersonPageSync {...props} />);
        }).then(() => {
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
                        var tags = TagScanner.findTags(params.search);
                        criteria.tags = tags;
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
                                    return this.props.route.replace(require('pages/person-page'), {
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
            props.stories = stories
            return meanwhile.show(<PersonPageSync {...props} />);
        }).then(() => {
            // load daily-activities statistics
            var endDate;
            if (props.selectedDate) {
                endDate = Moment(props.selectedDate).add(6, 'day');
            } else {
                endDate = Moment(this.state.today);
            }
            var startDate = endDate.clone().subtract(14, 'day');
            var ranges = DateUtils.getMonthRanges(startDate, endDate);
            var filters = [];
            _.each(ranges, (range) => {
                filters.push({
                    user_ids: [ props.user.id ],
                    time_range: range,
                });
            });
            var criteria = { type: 'daily-activities', filters };
            return db.findOne({ table: 'statistics', criteria });
        }).then((statistics) => {
            props.dailyActivities = statistics;
            return <PersonPageSync {...props} />;
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

var PersonPageSync = module.exports.Sync = React.createClass({
    displayName: 'PersonPage.Sync',
    mixins: [ UpdateCheck ],
    propTypes: {
        stories: PropTypes.arrayOf(PropTypes.object),
        user: PropTypes.object,
        roles: PropTypes.arrayOf(PropTypes.object),
        dailyActivities: PropTypes.object,
        currentUser: PropTypes.object,
        project: PropTypes.object,
        selectedDate: PropTypes.string,
        today: PropTypes.string,

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

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
            <div className="person-page">
                {this.renderUserView()}
                {this.renderList()}
                {this.renderEmptyMessage()}
            </div>
        );
    },

    renderUserView: function() {
        var userProps = {
            user: this.props.user,
            roles: this.props.roles,
            dailyActivities: this.props.dailyActivities,
            currentUser: this.props.currentUser,
            chartType: this.state.chartType,
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            selectedDate: this.props.selectedDate,
            today: this.props.today,
            onChartSelect: this.handleChartSelect,
        };
        return <UserView {...userProps} />;
    },

    /**
     * Render list of stories authored by selected user
     *
     * @return {ReactElement}
     */
    renderList: function() {
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
     * Render a message if there're no stories
     *
     * @return {ReactElement|null}
     */
    renderEmptyMessage: function() {
        var stories = this.props.stories;
        if (!_.isEmpty(stories)) {
            return null;
        }
        if (!stories) {
            // props.stories is null when they're being loaded
            return <LoadingAnimation />;
        } else {
            var params = this.props.route.parameters;
            var phrase;
            if (params.date) {
                phrase = 'person-no-stories-on-date';
            } else if (params.search) {
                phrase = 'person-no-stories-found';
            } else {
                phrase = 'person-no-stories-yet';
            }
            var props = {
                locale: this.props.locale,
                online: this.props.database.online,
                phrase,
            };
            return <EmptyMessage {...props} />;
        }
    },

    /**
     * Called when user has scrolled away from selected story
     *
     * @param  {Object}
     */
    handleSelectionClear: function(evt) {
        this.props.route.loosen();
    },

    /**
     * Called when user chooses a chart
     *
     * @param  {Object} evt
     */
    handleChartSelect: function(evt) {
        var chartType = evt.chart;
        this.setState({ chartType });
    },
});
