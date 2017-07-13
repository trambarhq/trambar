var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Moment = require('moment');
var Relaks = require('relaks');

var Database = require('data/database');
var Payloads = require('transport/payloads');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var StoryList = require('lists/story-list');

module.exports = Relaks.createClass({
    displayName: 'NewsPage',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
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
        var date = route.parameters.date;
        var roleIds = route.parameters.roleIds;
        var searchString = route.query.q;
        var server = route.parameters.server;
        var schema = route.parameters.schema;
        var db = this.props.database.use({ server, schema, by: this });
        var props = {
            stories: null,
            draftStories: null,
            pendingStories: null,
            currentUser: null,

            showEditors: !(date || !_.isEmpty(roleIds) || searchString),
            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<NewsPageSync {...props} />, 250);
        return db.start().then((userId) => {
            // load current user
            var criteria = {};
            criteria.id = userId;
            return db.findOne({ schema: 'global', table: 'user', criteria });
        }).then((user) => {
            props.currentUser = user;
            meanwhile.show(<NewsPageSync {...props} />);
        }).then(() => {
            if (date || searchString) {
                // load story matching filters
                var criteria = {};
                if (date) {
                    var s = Moment(date);
                    var e = s.clone().endOf('day');
                    var rangeStart = s.toISOString();
                    var rangeEnd = e.toISOString();
                    var range = `[${rangeStart},${rangeEnd}]`;
                    criteria.time_range = range;
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
                criteria.target_user_id = props.currentUser.id;
                criteria.filters = {};
                if (!_.isEmpty(roleIds)) {
                    criteria.filters.role_ids = roleIds;
                }
                return db.findOne({ table: 'listing', criteria }).then((listing) => {
                    if (!listing) {
                        return [];
                    }
                    var criteria = {};
                    criteria.id = listing.story_ids;
                    return db.find({ table: 'story', criteria });
                });
            }
        }).then((stories) => {
            props.stories = stories
            meanwhile.show(<NewsPageSync {...props} />);
        }).then(() => {
            // look for story drafts
            var criteria = {
                published: false,
                user_ids: [ props.currentUser.id ],
            };
            return db.find({ table: 'story', criteria });
        }).then((stories) => {
            props.draftStories = stories;
        }).then(() => {
            // look for pending stories
            var criteria = {
                published: true,
                ready: false,
                user_ids: [ props.currentUser.id ],
            };
            return db.find({ table: 'story', criteria });
        }).then((stories) => {
            props.pendingStories = stories;
            return <NewsPageSync {...props} />;
        });
    },
});

var NewsPageSync = module.exports.Sync = React.createClass({
    displayName: 'NewsPage.Sync',
    mixins: [ UpdateCheck ],
    propTypes: {
        showEditors: PropTypes.bool,
        stories: PropTypes.arrayOf(PropTypes.object),
        draftStories: PropTypes.arrayOf(PropTypes.object),
        pendingStories: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
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
        var listProps = {
            showEditors: this.props.showEditors,
            stories: this.props.stories,
            draftStories: this.props.draftStories,
            pendingStories: this.props.pendingStories,
            currentUser: this.props.currentUser,

            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <StoryList {...listProps} />
    },
});
