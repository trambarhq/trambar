var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var ReactDOM = require('react-dom');
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
var NewItemsAlert = require('widgets/new-items-alert');

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
                '/:schema/news/:roles/:date/?',
                '/:schema/news/:roles/?',
                '/:schema/news/?',
            ], (params) => {
                params.roles = _.filter(_.map(_.split(params.roles, '+'), parseInt));
                params.search = query.search;
                params.story = hash ? parseInt(_.replace(hash, /\D/g, '')) : undefined;
                return params;
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
            var path = `/${params.schema}/news/`, query, hash;
            if (!_.isEmpty(params.roles)) {
                path += `${params.roles.join('+')}/`;
            } else if (params.date) {
                path += `all/`;
            }
            if (params.date) {
                path += `${params.date}/`
            }
            if (params.search) {
                query = { search: params.search };
            }
            if (params.story) {
                hash = `story-${params.story}`;
            }
            return { path, query, hash };
        },

        /**
         * Obtain page options
         *
         * @param  {Route} route
         *
         * @return {Object}
         */
        getOptions: function(route) {
            return {
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
            };
        },
    },

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync: function(meanwhile) {
        var params = this.props.route.parameters;
        var searching = !!(params.date || !_.isEmpty(params.roles) || params.search);
        var db = this.props.database.use({ schema: params.schema, by: this });
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
        meanwhile.show(<NewsPageSync {...props} />, 1000);
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
                if (!_.isEmpty(params.roles)) {
                    criteria.filters.role_ids = params.roles;
                }
                return db.findOne({ table: 'listing', criteria }).then((listing) => {
                    if (!listing) {
                        return [];
                    }
                    var criteria = {};
                    criteria.id = listing.story_ids;
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
                                if (story && story.ptime) {
                                    return this.props.route.replace(require('pages/news-page'), {
                                        date: Moment(story.ptime).format('YYYY-MM-DD'),
                                        story: params.story,
                                    }).return([]);
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
                    props.payloads.reattach(params.schema, story);
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
                    exclude: userStoryIds,
                    user_ids: [ props.currentUser.id ],
                };
                return db.find({ table: 'story', criteria });
            }
        }).then((stories) => {
            if (stories) {
                // reattach blobs (lost when saved)
                _.each(stories, (story) => {
                    props.payloads.reattach(params.schema, story);
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

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            hiddenStoryIds: [],
            selectedStoryId: null,
        };
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
                {this.renderNewStoryAlert()}
            </div>
        );
    },

    /**
     * Make sure hiddenStoryIds contain valid ids
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (this.props.stories !== nextProps.stories) {
            if (!_.isEmpty(this.state.hiddenStoryIds)) {
                var hiddenStoryIds = _.filter(this.state.hiddenStoryIds, (id) => {
                    return _.some(nextProps.stories, { id });
                });
                this.setState({ hiddenStoryIds });
            }
        }
        if (this.props.route !== nextProps.route) {
            this.setState({ selectedStoryId: null });
        }
    },

    /**
     * Render list of stories
     *
     * @return {ReactElement}
     */
    renderList: function() {
        var listProps = {
            showEditors: this.props.showEditors,
            stories: this.props.stories,
            draftStories: this.props.draftStories,
            pendingStories: this.props.pendingStories,
            currentUser: this.props.currentUser,
            selectedStoryId: this.state.selectedStoryId || this.props.route.parameters.story,

            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,

            onHiddenStories: this.handleHiddenStories,
            onTopStoryChange: this.handleTopStoryChange,
        };
        return <StoryList {...listProps} />
    },

    /**
     * Render alert indicating there're new stories hidden up top
     *
     * @return {ReactElement}
     */
    renderNewStoryAlert: function() {
        var t = this.props.locale.translate;
        var count = _.size(this.state.hiddenStoryIds);
        var show = (count > 0);
        if (count) {
            this.previousHiddenStoryCount = count;
        } else {
            // show the previous count as the alert transitions out
            count = this.previousHiddenStoryCount || 0;
        }
        var props = {
            show: show,
            onClick: this.handleNewStoryAlertClick,
        };
        return (
            <NewItemsAlert {...props}>
                {t('news-page-$count-new-stories', count)}
            </NewItemsAlert>
        );
    },

    /**
     * Called when stories are rendered off screen
     *
     * @param  {Object} evt
     */
    handleHiddenStories: function(evt) {
        var storyIds = _.map(evt.stories, 'id');
        var hiddenStoryIds = _.union(storyIds, this.state.hiddenStoryIds);
        this.setState({ hiddenStoryIds });
    },

    /**
     * Called when a different story sits at the top of the list
     *
     * @return {Object}
     */
    handleTopStoryChange: function(evt) {
        var storyId = _.get(evt.story, 'id');
        if (!storyId || _.includes(this.state.hiddenStoryIds, storyId)) {
            // clear the whole list as soon as one of them come into view
            // or if we've reach the top (where the story might be null)
            this.setState({ hiddenStoryIds: [] });
        }
    },

    /**
     * Called when user clicks on new story alert
     *
     * @param  {Event} evt
     */
    handleNewStoryAlertClick: function(evt) {
        this.setState({
            hiddenStoryIds: [],
            selectedStoryId: _.first(this.state.hiddenStoryIds),
        });
    },
});
