var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var ReactDOM = require('react-dom');
var Moment = require('moment');
var Relaks = require('relaks');
var DateTracker = require('utils/date-tracker');
var ProjectSettings = require('objects/settings/project-settings');

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
                '/:schema/news/:date/?',
                '/:schema/news/?',
            ], (params) => {
                return {
                    schema: params.schema,
                    date: Route.parseDate(params.date),
                    roles: Route.parseIdList(query.roles),
                    search: query.search,
                    story: Route.parseId(hash, /S(\d+)/i),
                    reaction: Route.parseId(hash, /R(\d+)/i),
                };
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
            var path = `/${params.schema}/news/`, query = {}, hash;
            if (params.date != undefined) {
                path += `${params.date || 'date'}/`
            }
            if (params.roles != undefined) {
                query.roles = params.roles.join('+');
            }
            if (params.search != undefined) {
                query.search = params.search;
            }
            if (params.story != undefined) {
                hash = `S${params.story}`;
                if (params.reaction != undefined) {
                    hash += `R${params.reaction}`;
                }
            }
            return { path, query, hash };
        },

        /**
         * Return configuration info for global UI elements
         *
         * @param  {Route} currentRoute
         *
         * @return {Object}
         */
        configureUI: function(currentRoute) {
            var route = {
                parameters: _.pick(currentRoute.parameters, 'schema')
            };
            var statistics = {
                type: 'daily-activities',
                filters: {},
            };
            return {
                calendar: { route, statistics },
                filter: { route },
                search: { route, statistics },
                navigation: { route, section: 'news' }
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
        var searching = !!(params.date || !_.isEmpty(params.roles) || params.search);
        var db = this.props.database.use({ schema: params.schema, by: this });
        var delay = (this.props.route !== prevProps.route) ? 100 : 1000;
        var props = {
            listing: null,
            stories: null,
            draftStories: null,
            pendingStories: null,
            currentUser: null,
            project: null,

            acceptNewStory: !searching,
            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<NewsPageSync {...props} />, delay);
        return db.start().then((userId) => {
            // load current user
            var criteria = {
                id: userId
            };
            return db.findOne({ schema: 'global', table: 'user', criteria, required: true });
        }).then((user) => {
            props.currentUser = user;
            return meanwhile.show(<NewsPageSync {...props} />);
        }).then(() => {
            var criteria = {
                name: params.schema
            };
            return db.findOne({ schema: 'global', table: 'project', criteria, required: true });
        }).then((project) => {
            props.project = project;
            return meanwhile.show(<NewsPageSync {...props} />);
        }).then(() => {
            if (searching) {
                // load story matching filters
                var criteria = {
                    published: true,
                    ready: true,
                };
                var remote;
                if (params.date) {
                    var s = Moment(params.date);
                    var e = s.clone().endOf('day');
                    var rangeStart = s.toISOString();
                    var rangeEnd = e.toISOString();
                    var range = `[${rangeStart},${rangeEnd}]`;
                    criteria.time_range = range;
                }
                if (!_.isEmpty(params.roles)) {
                    criteria.role_ids = params.roles;
                }
                if (params.search) {
                    criteria.search = {
                        lang: this.props.locale.lang,
                        text: params.search,
                    };
                    criteria.limit = 100;
                    // don't scan local cache
                    remote = true;
                } else {
                    criteria.limit = 500;
                }
                if (props.currentUser.type === 'guest') {
                    criteria.public = true;
                }
                return db.find({ table: 'story', criteria, remote });
            } else {
                // load story in listing
                var criteria = {
                    type: 'news',
                    target_user_id: props.currentUser.id,
                    filters: {},
                };
                if (params.roles) {
                    criteria.filters.role_ids = params.roles;
                }
                if (props.currentUser.type === 'guest') {
                    criteria.filters.public = true;
                }
                return db.findOne({ table: 'listing', criteria }).then((listing) => {
                    if (!listing) {
                        return [];
                    }
                    props.listing = listing;
                    var criteria = {
                        id: listing.story_ids
                    };
                    if (props.currentUser.type === 'guest') {
                        // enforce condition here as well, as change in the listing
                        // is going to lag behind the change in the story
                        criteria.public = true;
                    }
                    return db.find({ table: 'story', criteria });
                }).then((stories) => {
                    if (params.story) {
                        // see if the story is in the list
                        if (!_.find(stories, { id: params.story })) {
                            // redirect to page showing stories on the date
                            // of the story; to do that, we need the object
                            // itself
                            var criteria = { id: params.story };
                            return db.findOne({ table: 'story', criteria }).then((story) => {
                                var redirect = false;
                                if (story && story.ptime && story.published && story.ready !== false) {
                                    // don't redirect if the story is very recent
                                    var elapsed = Moment() - Moment(story.ptime);
                                    if (elapsed > 60 * 1000) {
                                        redirect = true;
                                    }
                                }
                                if (redirect) {
                                    var newParams = _.clone(params);
                                    newParams.date = Moment(story.ptime).format('YYYY-MM-DD');
                                    return this.props.route.replace(require('pages/news-page'), newParams).then(() => {
                                        return [];
                                    });
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
            return meanwhile.show(<NewsPageSync {...props} />);
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
                props.draftStories = stories;
                return meanwhile.show(<NewsPageSync {...props} />);
            }
        }).then(() => {
            if (!searching) {
                // look for pending stories, those written by the user but
                // is too recent to be included in the listing
                var recentUserStories = _.filter(props.stories, (story) => {
                    if (_.includes(story.user_ids, props.currentUser.id)) {
                        if (story.ptime > DateTracker.yesterdayISO) {
                            return true;
                        }
                    }
                });
                var recentUserStoryIds = _.map(recentUserStories, 'id');
                var criteria = {
                    published: true,
                    exclude: recentUserStoryIds,
                    user_ids: [ props.currentUser.id ],
                    newer_than: DateTracker.yesterdayISO,
                };
                return db.find({ table: 'story', criteria });
            }
        }).then((stories) => {
            if (stories) {
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
        acceptNewStory: PropTypes.bool,
        listing: PropTypes.object,
        stories: PropTypes.arrayOf(PropTypes.object),
        draftStories: PropTypes.arrayOf(PropTypes.object),
        pendingStories: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,
        project: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    /**
     * Return the access level
     *
     * @return {String}
     */
    getAccessLevel: function() {
        var { project, currentUser } = this.props;
        return ProjectSettings.getUserAccessLevel(project, currentUser) || 'read-only';
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        return (
            <div className="news-page">
                {this.renderList()}
            </div>
        );
    },

    /**
     * Render list of stories
     *
     * @return {ReactElement}
     */
    renderList: function() {
        var access = this.getAccessLevel();
        var params = this.props.route.parameters;
        var listProps = {
            access: access,
            acceptNewStory: this.props.acceptNewStory && access === 'read-write',
            stories: this.props.stories,
            draftStories: this.props.draftStories,
            pendingStories: this.props.pendingStories,
            currentUser: this.props.currentUser,
            project: this.props.project,
            selectedStoryId: params.story,
            selectedReactionId: params.reaction,

            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,

            onSelectionClear: this.handleSelectionClear,
        };
        return <StoryList {...listProps} />
    },

    /**
     * Called when user has scrolled away from selected story
     */
    handleSelectionClear: function() {
        this.props.route.loosen();
    },
});
