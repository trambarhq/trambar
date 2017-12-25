var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Memoize = require('utils/memoize');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var UserList = require('lists/user-list');

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
        parseUrl: function(path, query, hash) {
            return Route.match(path, [
                '/:schema/people/:roles/?',
                '/:schema/people/?',
            ], (params) => {
                params.roles = Route.parseIdList(params.roles);
                params.search = query.search;
                return params;
            });
        },

        /**
         * Generate a URL of this page based on given parameters
         *
         * @param  {Object} params
         *
         * @return {Object}
         */
        getUrl: function(params) {
            var path = `/${params.schema}/people/`, query, hash;
            if (!_.isEmpty(params.roles)) {
                url += `${params.roles.join('+')}/`;
            }
            if (params.search) {
                query = { search: params.search };
            }
            return { path, query, hash };
        },

        /**
         * Generate a URL of this page based on given parameters
         *
         * @param  {Object} params
         *
         * @return {Object}
         */
        getOptions: function(route) {
            return {
                navigation: {
                    top: {
                        dateSelection: false,
                        roleSelection: true,
                        textSearch: true,
                    },
                    bottom: {
                        section: 'people'
                    }
                },
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
            if (params.search) {
                // search for matching stories
                var criteria = {
                    published: true,
                    ready: true,
                    search: {
                        lang: this.props.locale.lang,
                        text: params.search,
                    },
                    per_user_limit: 5
                };
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

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <UserList {...listProps} />
    },
});
