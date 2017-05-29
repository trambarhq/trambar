var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var StoryList = require('widgets/story-list');

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
            var params = Route.match('/:server/:schema/news/:roleIds/:date/', url)
                      || Route.match('/:server/:schema/news/:roleIds/', url);
            if (params) {
                params.roleIds = _.filter(_.map(_.split(params.roleIds, '+'), parseInt));
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
        var db = this.props.database.use({ server, by: this });
        var props = {
            stories: null,
            currentUser: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            loading: true,
        };
        meanwhile.show(<NewsPageSync {...props} />);
        return db.start().then((userId) => {
            var date = route.parameters.date;
            var roleIds = route.parameters.roleIds;
            var searchString = route.query.q;
            if (date || searchString) {
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
                criteria.user_id = userId;
                if (!_.isEmpty(roleIds)) {
                    criteria.filters = {
                        role_id: roleIds
                    };
                }
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
            return <NewsPageSync {...props} />;
        });
    }
});

var NewsPageSync = module.exports.Sync = React.createClass({
    displayName: 'NewsPage.Sync',
    propTypes: {
        loading: PropTypes.bool,
        stories: PropTypes.arrayOf(PropTypes.object),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    render: function() {
        return (
            <div>
                <h2>News page</h2>
                {this.renderList()}
            </div>
        );
    },

    renderList: function() {
        if (!this.props.stories) {
            return;
        }
        var listProps = {
            stories: this.props.stories,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <StoryList {...listProps} />
    },
});
