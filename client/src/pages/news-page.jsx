var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Moment = require('moment');
var MemoizeWeak = require('memoizee/weak');
var Relaks = require('relaks');

var Database = require('data/database');
var UploadQueue = require('transport/upload-queue');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var StoryList = require('widgets/story-list');
var StoryEditor = require('widgets/story-editor');

module.exports = Relaks.createClass({
    displayName: 'NewsPage',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        queue: PropTypes.instanceOf(UploadQueue).isRequired,
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
            currentUser: null,
            drafts: null,
            authors: null,

            showEditors: !(date || !_.isEmpty(roleIds) || searchString),
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            loading: true,
        };
        meanwhile.show(<NewsPageSync {...props} />);
        return db.start().then((userId) => {
            // load current user
            var criteria = {};
            criteria.id = userId;
            return db.findOne({ schema: 'global', table: 'user', criteria });
        }).then((user) => {
            props.currentUser = user;
            props.authors = [ user ];
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
            props.storyDrafts = stories;
            meanwhile.show(<NewsPageSync {...props} />);
        }).then(() => {
            // load other users also working on these stories
            var userIds = _.flatten(_.map(props.storyDrafts, 'user_ids'));
            userIds = _.uniq(userIds);
            var coauthorIds = _.difference(userIds, [ props.currentUser.id ]);
            if (!_.isEmpty(coauthorIds)) {
                var criteria = {
                    id: coauthorIds
                };
                return db.find({ schema: 'global', table: 'user', criteria });
            } else {
                return [];
            }
        }).then((users) => {
            props.authors = _.unionBy(props.authors, users, [ props.currentUser ], 'id');
            props.loading = false;
            return <NewsPageSync {...props} />;
        });
    },
});

var NewsPageSync = module.exports.Sync = React.createClass({
    displayName: 'NewsPage.Sync',
    mixins: [ UpdateCheck ],
    propTypes: {
        loading: PropTypes.bool,
        showEditors: PropTypes.bool,
        stories: PropTypes.arrayOf(PropTypes.object),
        storyDrafts: PropTypes.arrayOf(PropTypes.object),
        authors: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    render: function() {
        return (
            <div>
                {this.renderEditors()}
                {this.renderList()}
            </div>
        );
    },

    renderEditors: function() {
        if (!this.props.showEditors) {
            return null;
        }
        var drafts = this.props.storyDrafts ? sortStoryDrafts(this.props.storyDrafts, this.props.currentUser) : [];
        if (drafts.length === 0 || drafts[0].user_ids[0] !== this.props.currentUser.id) {
            // add empty story when current user doesn't have an active draft
            var blank = {
                user_ids: this.props.currentUser ? [ this.props.currentUser.id ] : [],
                details: {}
            }
            drafts.unshift(blank);
        }
        return _.map(drafts, this.renderEditor);
    },

    renderEditor: function(story, index) {
        // always use 0 as the key for the top story, so we don't lose focus
        // when the new story acquires an id after being saved automatically
        var key = (index > 0) ? story.id : 0;
        var authors = this.props.authors ? findUsers(this.props.authors, story.user_ids) : null;
        var editorProps = {
            story,
            authors: authors,
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            key,
        };
        return <StoryEditor {...editorProps}/>
    },

    renderList: function() {
        if (!this.props.currentUser || !this.props.stories) {
            return;
        }
        var listProps = {
            stories: this.props.stories,
            currentUser: this.props.currentUser,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <StoryList {...listProps} />
    },
});

var findUsers = MemoizeWeak(function(users, userIds) {
    return _.map(_.uniq(userIds), (userId) => {
       return _.find(users, { id: userId }) || {}
    });
});

var sortStoryDrafts = MemoizeWeak(function(stories, currentUser) {
    var ownStory = function(story) {
        return story.user_ids[0] = currentUser.id;
    };
    return _.orderBy(stories, [ ownStory, 'ptime' ], [ 'desc', 'desc' ]);
});
