var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Database = require('data/database');
var Payloads = require('transport/payloads');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var BookmarkList = require('lists/bookmark-list');

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
        parseUrl: function(path, query, hash) {
            return Route.match(path, [
                '/:schema/bookmarks/?',
            ], (params) => {
                params.story = hash ? parseInt(_.replace(hash, /\D/g, '')) : undefined;
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
            var path = `/${params.schema}/bookmarks/`, query, hash;
            if (params.story) {
                hash = `story-${params.story}`;
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
                        roleSelection: false,
                        textSearch: false,
                    },
                    bottom: {
                        section: 'bookmarks'
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
            bookmarks: null,
            currentUserId: null,

            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<BookmarksPageSync {...props} />, delay);
        return db.start().then((userId) => {
            // load current user
            var criteria = {};
            criteria.id = userId;
            return db.findOne({ schema: 'global', table: 'user', criteria, required: true });
        }).then((user) => {
            props.currentUser = user;
            meanwhile.check();
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
            <div className="bookmarks-page">
                {this.renderList()}
            </div>
        );
    },

    /**
     * Render list of bookmarks
     *
     * @return {ReactElement}
     */
    renderList: function() {
        var listProps = {
            bookmarks: this.props.bookmarks,
            currentUser: this.props.currentUser,

            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <BookmarkList {...listProps} />
    }
});
