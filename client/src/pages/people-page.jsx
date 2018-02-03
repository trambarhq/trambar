var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Moment = require('moment');
var Memoize = require('utils/memoize');
var DateUtils = require('utils/date-utils');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var UserList = require('lists/user-list');
var LoadingAnimation = require('widgets/loading-animation');
var EmptyMessage = require('widgets/empty-message');

require('./people-page.scss')

module.exports = Relaks.createClass({
    displayName: 'PeoplePage',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
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
                '/:schema/people/?',
            ], (params) => {
                return {
                    schema: params.schema,
                    search: query.search,
                    date: Route.parseDate(query.date),
                    roles: Route.parseIdList(query.roles),
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
            if (params.date != undefined) {
                query.date = params.date;
            }
            if (params.roles != undefined) {
                query.roles = params.roles.join('+');
            }
            if (params.search != undefined) {
                query.search = params.search;
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
        },
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

            database: this.props.database,
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
                if (params.search) {
                    criteria.search = {
                        lang: this.props.locale.languageCode,
                        text: params.search,
                    };
                } else if (params.date) {
                    criteria.time_range = DateUtils.getDayRange(params.date);
                }
                if (!_.isEmpty(params.roles)) {
                    criteria.role_ids = params.roles;
                }
                return db.find({ table: 'story', criteria, remote: true }).then((stories) => {
                    props.stories = stories;
                    var userIds = _.uniq(_.flatten(_.map(stories, 'user_ids')));
                    var criteria = {
                        id: userIds,
                        hidden: false
                    };
                    return db.find({ schema: 'global', table: 'user', criteria });
                });
            } else {
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
            return <PeoplePageSync {...props} />;
        });
    }
});

var PeoplePageSync = module.exports.Sync = React.createClass({
    displayName: 'PeoplePageSync',
    propTypes: {
        users: PropTypes.arrayOf(PropTypes.object),
        listings: PropTypes.arrayOf(PropTypes.object),
        stories: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,
        selectedDate: PropTypes.string,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        return (
            <div className="people-page">
                {this.renderList()}
                {this.renderEmptyMessage()}
            </div>
        );
    },

    /**
     * Render list of users
     *
     * @return {ReactElement}
     */
    renderList: function() {
        if (!this.props.currentUser || !this.props.users) {
            return null;
        }
        var listProps = {
            users: this.props.users,
            stories: this.props.stories,
            currentUser: this.props.currentUser,
            selectedDate: this.props.selectedDate,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <UserList {...listProps} />
    },

    /**
     * Render a message if there're no bookmarks
     *
     * @return {ReactElement|null}
     */
    renderEmptyMessage: function() {
        var users = this.props.users;
        if (!_.isEmpty(users)) {
            return null;
        }
        if (!users) {
            // props.users is null when they're being loaded
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
                phrase: 'people-no-users-yet',
            };
            return <EmptyMessage {...props} />;
        }
    },
});
