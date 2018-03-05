var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var ProjectSettings = require('objects/settings/project-settings');

var Database = require('data/database');
var Payloads = require('transport/payloads');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var BookmarkList = require('lists/bookmark-list');
var LoadingAnimation = require('widgets/loading-animation');
var EmptyMessage = require('widgets/empty-message');

require('./bookmarks-page.scss');

module.exports = Relaks.createClass({
    displayName: 'BookmarksPage',
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
                '/:schema/bookmarks/?',
            ], (params) => {
                return {
                    schema: params.schema,
                    story: Route.parseId(hash, /S(\d+)/i),
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
            var path = `/${params.schema}/bookmarks/`, query, hash;
            if (params.story) {
                hash = `S${params.story}`;
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
                schema: params.schema
            };
            return {
                navigation: { route, section: 'bookmarks' }
            };
        },
    },

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync: function(meanwhile) {
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: params.schema, by: this });
        var props = {
            bookmarks: null,
            currentUser: null,
            project: null,

            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<BookmarksPageSync {...props} />, 250);
        return db.start().then((userId) => {
            // load current user
            var criteria = {};
            criteria.id = userId;
            return db.findOne({ schema: 'global', table: 'user', criteria, required: true });
        }).then((user) => {
            props.currentUser = user;
            meanwhile.check();
        }).then(() => {
            // load project
            var criteria = { name: params.schema };
            return db.findOne({ schema: 'global', table: 'project', criteria, required: true });
        }).then((project) => {
            props.project = project;
            return meanwhile.show(<BookmarksPageSync {...props} />);
        }).then(() => {
            // load boomarks
            var criteria = {
                target_user_id: props.currentUser.id
            };
            return db.find({ table: 'bookmark', criteria });
        }).then((bookmarks) => {
            props.bookmarks = bookmarks;
            return <BookmarksPageSync {...props} />;
        });
    }
});

var BookmarksPageSync = module.exports.Sync = React.createClass({
    displayName: 'BookmarksPage.Sync',
    propTypes: {
        bookmarks: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,
        project: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
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
            <div className="bookmarks-page">
                {this.renderList()}
                {this.renderEmptyMessage()}
            </div>
        );
    },

    /**
     * Render list of bookmarks
     *
     * @return {ReactElement}
     */
    renderList: function() {
        var params = this.props.route.parameters;
        var listProps = {
            access: this.getAccessLevel(),
            bookmarks: this.props.bookmarks,
            currentUser: this.props.currentUser,
            project: this.props.project,
            selectedStoryId: params.story,

            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,

            onSelectionClear: this.handleSelectionClear,
        };
        return <BookmarkList {...listProps} />
    },

    /**
     * Render a message if there're no bookmarks
     *
     * @return {ReactElement|null}
     */
    renderEmptyMessage: function() {
        var bookmarks = this.props.bookmarks;
        if (!_.isEmpty(bookmarks)) {
            return null;
        }
        if (!bookmarks) {
            // props.stories is null when they're being loaded
            return <LoadingAnimation />;
        } else {
            var props = {
                locale: this.props.locale,
                online: this.props.database.online,
                phrase: 'bookmarks-no-bookmarks',
            };
            return <EmptyMessage {...props} />;
        }
    },

    /**
     * Called when user has scrolled away from selected story
     */
    handleSelectionClear: function() {
        this.props.route.loosen();
    },
});
