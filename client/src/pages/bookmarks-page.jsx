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
            var params = Route.match('/:server/:schema/bookmarks/:roleIds', url);
            if (params) {
                params.roleIds = _.filter(_.map(_.split(params.roleIds, '+'), parseInt));
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
                return params;
            }
        },

        getUrl: function(params) {
            var server = params.server || '~';
            var schema = params.schema;
            return `/${server}/${schema}/bookmarks/`;
        },
    },

    renderAsync: function(meanwhile) {
        var route = this.props.route;
        var server = route.parameters.server;
        var db = this.props.database.use({ server, by: this });
        var props = {
            bookmarks: null,
            currentUserId: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            loading: true,
        };
        meanwhile.show(<BookmarksPageSync {...props} />);
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
            meanwhile.show(<BookmarksPageSync {...props} />);
        }).then(() => {
            // load users who created the bookmarks
            var criteria = {};
            criteria.id = _.map(props.bookmarks, 'user_id');
            return db.find({ table: 'user', criteria });
        }).then((users) => {
            props.users = users;
            return <BookmarksPageSync {...props} />;
        });
    }
});

var BookmarksPageSync = module.exports.Sync = React.createClass({
    displayName: 'BookmarksPage.Sync',
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
        return (
            <div>Bookmarks page</div>
        );
    },
});
