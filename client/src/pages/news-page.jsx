var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var ReactDOM = require('react-dom');
var Moment = require('moment');
var Relaks = require('relaks');
var UserFinder = require('objects/finders/user-finder');
var ProjectFinder = require('objects/finders/project-finder');
var StoryFinder = require('objects/finders/story-finder');
var ProjectSettings = require('objects/settings/project-settings');
var TagScanner = require('utils/tag-scanner');

var Database = require('data/database');
var Payloads = require('transport/payloads');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var StoryList = require('lists/story-list');
var LoadingAnimation = require('widgets/loading-animation');
var EmptyMessage = require('widgets/empty-message');

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
        parseURL: function(path, query, hash) {
            return Route.match(path, [
                '/:schema/news/?',
            ], (params) => {
                return {
                    schema: params.schema,
                    roles: Route.parseIdList(query.roles),
                    search: query.search,
                    date: Route.parseDate(query.date),
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
        getURL: function(params) {
            var path = `/${params.schema}/news/`, query = {}, hash;
            if (params.date != undefined) {
                query.date = params.date;
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
            var params = currentRoute.parameters;
            var route = {
                schema: params.schema
            };
            var statistics = {
                type: 'daily-activities',
                schema: params.schema,
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
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync: function(meanwhile) {
        // don't wait for remote data unless the route changes
        var freshRoute = this.props.route.isFresh(meanwhile.prior.props.route);
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: params.schema, blocking: freshRoute, by: this });
        var tags;
        if (params.search && !TagScanner.removeTags(params.search)) {
            tags = TagScanner.findTags(params.search);
        }
        var props = {
            stories: null,
            draftStories: null,
            pendingStories: null,
            project: null,
            currentUser: null,

            acceptNewStory: (!params.date && _.isEmpty(params.roles) && !params.search),
            freshRoute: freshRoute,
            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<NewsPageSync {...props} />, 250);
        return db.start().then((userId) => {
            return UserFinder.findUser(db, userId).then((user) => {
                props.currentUser = user;
            });
        }).then(() => {
            return ProjectFinder.findCurrentProject(db).then((project) => {
                props.project = project;
            });
        }).then((project) => {
            meanwhile.show(<NewsPageSync {...props} />);
            if (tags) {
                return StoryFinder.findStoriesWithTags(db, tags, props.currentUser).then((stories) => {
                    props.stories = stories;
                });
            } else if (params.search) {
                return StoryFinder.findStoriesMatchingText(db, params.search, props.locale, props.currentUser).then((stories) => {
                    props.stories = stories;
                });
            } else if (params.date) {
                return StoryFinder.findStoriesOnDate(db, params.date, props.currentUser).then((stories) => {
                    props.stories = stories;
                });
            } else if (params.roles) {
                return StoryFinder.findStoriesWithRolesInListing(db, params.roles, props.currentUser).then((stories) => {
                    props.stories = stories;
                });
            } else {
                return StoryFinder.findStoriesInListing(db, 'news', props.currentUser).then((stories) => {
                    props.stories = stories;
                }).then(() => {
                    meanwhile.show(<NewsPageSync {...props} />);
                    return StoryFinder.findDraftStories(db, props.currentUser).then((stories) => {
                        props.draftStories = stories;
                    });
                }).then(() => {
                    return StoryFinder.findUnlistedStories(db, props.currentUser, props.stories).then((stories) => {
                        props.pendingStories = stories;
                    });
                });
            }
        }).then(() => {
            // when we're focusing on one story, we need to make sure the
            // story is actually there
            if (params.story && !params.date) {
                var allStories = _.concat(props.stories, props.draftStories, props.pendingStories);
                if (!_.find(allStories, { id: params.story })) {
                    return StoryFinder.findStory(db, params.story).then((story) => {
                        return this.redirectToStory(params.schema, story);
                    }).catch((err) => {
                    });
                }
            }
            return <NewsPageSync {...props} />;
        });
    },

    /**
     * Redirect to page showing stories on the date of a story
     *
     * @param  {String} schema
     * @param  {Story} story
     *
     * @return {Promise|undefined}
     */
    redirectToStory: function(schema, story) {
        var redirect = true;
        if (story.ptime && story.published && story.ready !== false) {
            // don't redirect if the story is very recent
            var elapsed = Moment() - Moment(story.ptime);
            if (elapsed < 60 * 1000) {
                return;
            }
        }
        if (redirect) {
            return this.props.route.replace(require('pages/news-page'), {
                schema: schema,
                date: Moment(story.ptime).format('YYYY-MM-DD'),
                story: story.id,
            });
        }
    }
});

var NewsPageSync = module.exports.Sync = React.createClass({
    displayName: 'NewsPage.Sync',
    mixins: [ UpdateCheck ],
    propTypes: {
        acceptNewStory: PropTypes.bool,
        freshRoute: PropTypes.bool,
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
                {this.renderEmptyMessage()}
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
            refreshList: this.props.freshRoute,
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
     * Render a message if there're no stories
     *
     * @return {ReactElement|null}
     */
    renderEmptyMessage: function() {
        var stories = this.props.stories;
        if (!_.isEmpty(stories)) {
            return null;
        }
        if (!stories) {
            // props.stories is null when they're being loaded
            return <LoadingAnimation />;
        } else {
            var params = this.props.route.parameters;
            var phrase;
            if (params.date) {
                phrase = 'news-no-stories-on-date';
            } else if (!_.isEmpty(params.roles)) {
                phrase = 'news-no-stories-by-role';
            } else if (params.search) {
                phrase = 'news-no-stories-found';
            } else {
                phrase = 'news-no-stories-yet';
            }
            var props = {
                locale: this.props.locale,
                online: this.props.database.online,
                phrase,
            };
            return <EmptyMessage {...props} />;
        }
    },

    /**
     * Called when user has scrolled away from selected story
     */
    handleSelectionClear: function() {
        this.props.route.unanchor();
    },
});
