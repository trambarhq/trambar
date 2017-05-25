var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

module.exports = Relaks.createClass({
    displayName: 'BookmarksPage',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    statics: {
        parseUrl: function(url) {
            var params = Route.match('/:server/:schema/bookmarks/:roleIds');
            if (params) {
                params.roleIds = _.filter(_.map(_.split(parts[3], '+'), parseInt));
                params.navigation = {
                    top: {
                        dateSelection: false,
                        roleSelection: true,
                        textSearch: false,
                    },
                    bottom: {
                        section: 'bookmarks'
                    }
                }
            }
        },

        getUrl: function(params) {
            var server = params.server || '~';
            var schema = params.schema;
            return `/${server}/${schema}/notifications/`;
        },
    },

    renderAsync: function(meanwhile) {
        var route = this.props.route;
        var server = route.parameters.server;
        var db = this.props.database.use({ by: this, server: server });
        var props = {
            bookmarks: null,
            currentUserId: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            loading: true,
        };
        meanwhile.show(<BookmarksPage {...props} />);
        return db.start().then((userId) => {
            // load current user
            var criteria = {};
            criteria.id = userId;
            return db.findOne({ tabel: 'user', criteria });
        }).then((currentUser) => {
            props.currentUser = currentUser;
        }).then(() => {
            // load boomarks
            var criteria = {};
            criteria.target_user_id = _.get(props.currentUser, 'id', 0);
            return db.find({ table: 'bookmark', criteria });
        }).then((bookmarks) => {
            props.bookmarks = bookmarks;
        }).then(() => {
            var criteria = {}
            criteria.id = _.map(props.bookmarks, 'story_id');

            return db.find({ table: 'story', criteria });
        }).then((stories) => {
            // save last piece of data and render the page with everything
            props.stories = stories
            meanwhile.show(<BookmarksPage {...props} />);
        }).then(() => {
            // load users who created the bookmarks
            var criteria = {};
            criteria.id = _.map(props.bookmarks, 'user_id');
            return db.find({ table: 'user', criteria });
        }).then((users) => {
            props.users = users;
            return <BookmarksPage {...props} />;
        });
    }
});

module.exports = React.createClass({
    displayName: 'BookmarksPage',
    propTypes: {
        loading: PropTypes.bool,
        bookmarks: PropTypes.arrayOf(PropTypes.object),
        stories: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    render: function() {
    },
});
