var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

module.exports = Relaks.createClass({
    displayName: 'NewsPage',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    statics: {
        parseUrl: function(url) {
            var params = Route.match('/:server/:schema:/news/:roleIds/:date/')
                      || Route.match('/:server/:schema:/news/:roleIds/');
            if (params) {
                params.roleIds = _.filter(_.map(_.split(parts[3], '+'), parseInt));
                params.navigation = {
                    top: {
                        dateSelection: true,
                        roleSelection: true,
                        textSearch: true,
                    },
                    bottom: {
                        section: 'news'
                    }
                };
                return params;
            }
        },
        
        getUrl: function(params) {
            var server = params.server || '~';
            var schema = params.schema;
            var roles = _.join(params.roleIds, '+') || 'all';
            var date = params.date;
            if (date) {
                return `/${server}/${schema}/news/${roles}/${date}/`;
            } else {
                return `/${server}/${schema}/news/${roles}/`;
            }
        },
    },

    renderAsync: function(meanwhile) {
        var route = this.props.route;
        var server = route.parameters.server;
        var db = this.props.database.use({ by: this, server: server });
        var props = {
            stories: null,
            currentUserId: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            loading: true,
        };
        meanwhile.show(<NewsPage {...props} />);
        return db.start().then((userId) => {
            // load current user
            var criteria = {};
            crtieria.id = userId;
            return db.findOne({ table: 'user', criteria });
        }).then((currentUser) => {
            props.currentUser = currentUser;
            meanwhile.show(<NewsPage {...props} />);
        }).then(() => {
            var date = route.parameters.date;
            var roleIds = route.parameters.roleIds;
            var searchString = route.query.q;
            if (date || _.isEmpty(roleIds) || searchString) {
                // load story matching filters
                var criteria = {};
                if (date) {
                    criteria.date = date;
                }
                if (!_.isEmpty(roleIds)) {
                    criteria.role_ids = roleIds;
                }
                if (searchString) {
                    criteria.search = searchString;
                    criteria.limit = 200;
                } else {
                    criteria.limit = 500;
                }
                return db.find({ table: 'story', criteria });
            } else {
                // load story in listing
                var criteria = {};
                criteria.type = 'news';
                criteria.user_id = _.get(props.currentUser, 'id', 0);
                return db.findOne({ table: 'listing', criteria }).then((listing) => {
                    var criteria = {};
                    criteria.id = listing.story_ids;
                    return db.find({ table: 'story', criteria });
                });
            }
        }).then((stories) => {
            // save last piece of data and render the page with everything
            props.stories = stories
            props.loading = false;
            return <NewsPage {...props} />;
        });
    }
});

module.exports = React.createClass({
    displayName: 'NewsPage',
    propTypes: {
        loading: PropTypes.bool,
        stories: PropTypes.arrayOf(PropTypes.object),
        currentUserId: PropTypes.number,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    render: function() {
    },
});
