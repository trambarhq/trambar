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
        parseUrl: function(url) {
            return Route.match('/:schema/bookmarks/?', url)
                || Route.match('/:schema/bookmarks/:roles/?', url)
                || Route.match('//:server/:schema/bookmarks/?', url)
                || Route.match('//:server/:schema/bookmarks/:roles/?', url);
        },

        getUrl: function(params) {
            var server = params.server;
            var schema = params.schema;
            var roles = params.roles
            var url = `/${schema}/bookmarks/`;
            if (server) {
                url = `//${server}${url}`;
            }
            if (roles instanceof Array) {
                roles = roles.join('+');
            }
            if (roles && roles !== 'all') {
                url += `${roles}/`;
            }
            return url;
        },

        navigation: {
            top: {
                dateSelection: false,
                roleSelection: true,
                textSearch: false,
            },
            bottom: {
                section: 'bookmarks'
            }
        },
    },

    /**
     * Retrieve data needed by synchronous component
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync: function(meanwhile) {
        var route = this.props.route;
        var server = route.parameters.server;
        var schema = route.parameters.schema;
        var roleIds = _.filter(_.map(_.split(route.parameters.roles, '+'), Number));
        var db = this.props.database.use({ server, schema, by: this });
        var props = {
            bookmarks: null,
            currentUserId: null,

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
            return db.findOne({ schema: 'global', table: 'user', criteria });
        }).then((currentUser) => {
            props.currentUser = currentUser;
            meanwhile.check();
        }).then(() => {
            // load boomarks
            var criteria = {};
            criteria.target_user_id = _.get(props.currentUser, 'id', 0);
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
