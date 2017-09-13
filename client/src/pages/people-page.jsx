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
        parseUrl: function(url) {
            return Route.match('//:server/:schema/people/:roles/?', url)
                || Route.match('//:server/:schema/people/?', url)
                || Route.match('/:schema/people/:roles/?', url)
                || Route.match('/:schema/people/?', url);
        },

        getUrl: function(params) {
            var server = params.server;
            var schema = params.schema;
            var roles = params.roles;
            var search = params.search;
            var url = `/${schema}/people/`;
            if (server) {
                url = `//${server}` + url;
            }
            if (roles instanceof Array) {
                roles = roles.join('+');
            }
            if (roles && roles !== 'all') {
                url += `${roles}/`;
            }
            if (search) {
                search = _.replace(encodeURIComponent(search), /%20/g, '+');
                url += `?search=${search}`;
            }
            return url;
        },

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
    },

    renderAsync: function(meanwhile) {
        var route = this.props.route;
        var server = route.parameters.server;
        var schema = route.parameters.schema;
        var searchString = route.query.search;
        var db = this.props.database.use({ server, schema, by: this });
        var props = {
            stories: null,
            currentUserId: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<PeoplePageSync {...props} />, 250);
        return db.start().then((userId) => {
            // load current user
            var criteria = {};
            criteria.id = userId;
            return db.findOne({ schema: 'global', table: 'user', criteria });
        }).then((currentUser) => {
            props.currentUser = currentUser;
            meanwhile.check();
        }).then(() => {
            var roleIds = _.filter(_.map(_.split(route.parameters.roles, '+'), Number));
            var criteria = {
                hidden: false
            };
            if (!_.isEmpty(roleIds)) {
                criteria.role_ids = roleIds;
            }
            return db.find({ schema: 'global', table: 'user', criteria });
        }).then((users) => {
            if (searchString) {
                users = findMatchingUsers(users, searchString);
            }
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

    render: function() {
        return (
            <div>
                {this.renderList()}
            </div>
        );
    },

    renderList: function() {
        if (!this.props.currentUser || !this.props.users) {
            return null;
        }
        var listProps = {
            users: this.props.users,
            currentUser: this.props.currentUser,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <UserList {...listProps} />
    },
});

var findMatchingUsers = Memoize(function(users, search) {
    var searchWords = _.split(_.toLower(search), /\+/);
    return _.filter(users, (user) => {
        // not using a short-circuited construct here for easier debugging
        if (match(user.details.name, searchWords)) {
            return true;
        }
        if (match(user.username, searchWords)) {
            return true;
        }
        if (match(user.details.email, searchWords)) {
            return true;
        }
    });
});

function match(text, searchWords) {
    if (text instanceof Object) {
        for (var lang in text) {
            if (match(text[lang], searchWords)) {
                return true;
            }
        }
    }
    var words = _.split(_.toLower(_.trim(text)), /\s+/);
    // require matching of every search word
    return _.every(searchWords, (searchWord) => {
        // it's a match when the string starts with the search word
        return _.some(words, (word) => {
            return _.startsWith(word, searchWord);
        });
    });
}
