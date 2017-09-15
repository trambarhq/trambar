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
    displayName: 'PersonPage',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    statics: {
        parseUrl: function(url) {
            return Route.match('//:server/:schema/people/:role/:user/?', url)
                || Route.match('//:server/:schema/people/:role/:user/:date/?', url)
                || Route.match('/:schema/people/:role/:user/?', url)
                || Route.match('/:schema/people/:role/:user/:date/?', url)
        },

        getUrl: function(params) {
            var server = params.server;
            var schema = params.schema;
            var role = params.role || 'all';
            var user = params.user;
            var date = params.date;
            var search = params.search;
            var storyId = params.storyId;
            var url = `/${schema}/people/${role}/${user}/`;
            if (server) {
                url = `//${server}` + url;
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
                roleSelection: false,
                textSearch: true,
            },
            bottom: {
                section: 'people'
            }
        },
    },

    renderAsync: function(meanwhile) {
        var route = this.props.route;
        var date = route.parameters.date;
        var userId = parseInt(route.parameters.user);
        var searchString = route.query.search;
        var server = route.parameters.server;
        var schema = route.parameters.schema;
        var db = this.props.database.use({ server, schema, by: this });
        var props = {
            stories: null,
            currentUser: null,

            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<PersonPageSync {...props} />, 250);
        return db.start().then((userId) => {
            // load current user
            var criteria = {};
            criteria.id = userId;
            return db.findOne({ schema: 'global', table: 'user', criteria });
        }).then((user) => {
            props.currentUser = user;
            meanwhile.show(<PersonPageSync {...props} />);
        }).then(() => {
            if (date || searchString) {
                // load story matching filters
                var criteria = {
                    user_ids: [ userId ],
                };
                if (date) {
                    var s = Moment(date);
                    var e = s.clone().endOf('day');
                    var rangeStart = s.toISOString();
                    var rangeEnd = e.toISOString();
                    var range = `[${rangeStart},${rangeEnd}]`;
                    criteria.time_range = range;
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
                    filters: {
                        user_ids: [ userId ]
                    },
                };
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
                                    var url = require('pages/person-page').getUrl({
                                        server,
                                        schema,
                                        user: userId,
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
            return <PersonPageSync {...props} />;
        });
    },
});

var PersonPageSync = module.exports.Sync = React.createClass({
    displayName: 'PersonPage.Sync',
    mixins: [ UpdateCheck ],
    propTypes: {
        stories: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    render: function() {
        return (
            <div className="person-page">
                {this.renderList()}
            </div>
        );
    },

    renderList: function() {
        var listProps = {
            stories: this.props.stories,
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
