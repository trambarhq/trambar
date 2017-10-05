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

require('./news-page.scss');

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
            return Route.match('//:server/:schema/news/:roles/:date/?', url)
                || Route.match('//:server/:schema/news/:roles/?', url)
                || Route.match('//:server/:schema/news/?', url)
                || Route.match('/:schema/news/:roles/:date/?', url)
                || Route.match('/:schema/news/:roles/?', url)
                || Route.match('/:schema/news/?', url);
        },

        getUrl: function(params) {
            var server = params.server;
            var schema = params.schema;
            var roles = params.roles;
            var date = params.date;
            var search = params.search;
            var storyId = params.storyId;
            var url = `/${schema}/news/`;
            if (server) {
                url = `//${server}` + url;
            }
            if (roles instanceof Array) {
                roles = roles.join('+');
            }
            if (roles && roles !== 'all') {
                url += `${roles}/`;
            } else if (date) {
                url += `all/`;
            }
            if (date) {
                url += `${date}/`
            }
            if (search) {
                search = _.replace(encodeURIComponent(search), /%20/g, '+');
                url += `?search=${search}`;
            }
            if (storyId) {
                url += `#story-${storyId}`;
            }
            return url;
        },

        navigation: {
            top: {
                dateSelection: true,
                roleSelection: true,
                textSearch: true,
            },
            bottom: {
                section: 'news'
            }
        },
    },

    renderAsync: function(meanwhile) {
        var route = this.props.route;
        var date = route.parameters.date;
        var roleIds = _.filter(_.map(_.split(route.parameters.roles, '+'), Number));
        var searchString = route.query.search;
        var searching = !!(date || !_.isEmpty(roleIds) || searchString);
        var server = route.parameters.server;
        var schema = route.parameters.schema;
        var db = this.props.database.use({ server, schema, by: this });
        var props = {
            stories: null,
            draftStories: null,
            pendingStories: null,
            currentUser: null,

            showEditors: !searching,
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
            if (searching) {
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
                    criteria.search = {
                        lang: this.props.locale.lang,
                        text: searchString,
                    };
                    criteria.limit = 100;
                } else {
                    criteria.limit = 500;
                }
                return db.find({ table: 'story', criteria });
            } else {
                // load story in listing
                var criteria = {
                    type: 'news',
                    target_user_id: props.currentUser.id,
                    filters: {},
                };
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
                }).then((stories) => {
                    var storyId = parseInt(_.replace(this.props.route.hash, /\D/g, ''));
                    if (storyId) {
                        // see if the story is in the list
                        if (!_.find(stories, { id: storyId })) {
                            // redirect to page showing stories on the date
                            // of the story; to do that, we need the object
                            // itself
                            var criteria = { id: storyId };
                            return db.findOne({ table: 'story', criteria }).then((story) => {
                                if (story) {
                                    var date = Moment(story.ptime).format('YYYY-MM-DD');
                                    var url = require('pages/news-page').getUrl({
                                        server,
                                        schema,
                                        date,
                                        storyId
                                    });
                                    return this.props.route.change(url, true).return([]);
                                }
                                return stories;
                            });
                        }
                    }
                    return stories;
                });
            }
        }).then((stories) => {
            props.stories = stories
            meanwhile.show(<NewsPageSync {...props} />);
        }).then(() => {
            if (!searching) {
                // look for story drafts
                var criteria = {
                    published: false,
                    user_ids: [ props.currentUser.id ],
                };
                return db.find({ table: 'story', criteria });
            }
        }).then((stories) => {
            if (stories) {
                // reattach blobs (lost when saved)
                _.each(stories, (story) => {
                    props.payloads.reattach(story);
                });
                props.draftStories = stories;
                meanwhile.show(<NewsPageSync {...props} />);
            }
        }).then(() => {
            if (!searching) {
                // look for pending stories, those written by the user but
                // haven't found themselves into the listing yet
                var userStoryIds = _.map(props.stories, 'id');
                var criteria = {
                    published: true,
                    exclude_ids: userStoryIds,
                    user_ids: [ props.currentUser.id ],
                };
                return db.find({ table: 'story', criteria });
            }
        }).then((stories) => {
            if (stories) {
                // reattach blobs (lost when saved)
                _.each(stories, (story) => {
                    props.payloads.reattach(story);
                });
                props.pendingStories = stories;
            }
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
            <div className="news-page">
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
