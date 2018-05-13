var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Moment = require('moment');
var Memoize = require('utils/memoize');
var Empty = require('data/empty');
var DateTracker = require('utils/date-tracker');
var DateUtils = require('utils/date-utils');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var SmartList = require('widgets/smart-list');
var UserView = require('views/user-view');

require('./user-list.scss');

module.exports = React.createClass({
    displayName: 'UserList',
    mixins: [ UpdateCheck ],
    propTypes: {
        users: PropTypes.arrayOf(PropTypes.object),
        roles: PropTypes.arrayOf(PropTypes.object),
        dailyActivities: PropTypes.object,
        listings: PropTypes.arrayOf(PropTypes.object),
        stories: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,
        selectedDate: PropTypes.string,
        today: PropTypes.string,
        link: PropTypes.oneOf([ 'user', 'team' ]),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
        loading: PropTypes.bool,
    },

    statics: {
        /**
         * Extract id from URL hash
         *
         * @param  {String} hash
         *
         * @return {Object}
         */
        parseHash: function(hash) {
            var user, highlighting;
            if (user = Route.parseId(hash, /U(\d+)/)) {
                highlighting = true;
            } else if (user = Route.parseId(hash, /u(\d+)/)) {
                highlighting = false;
            }
            return { user, highlighting };
        },

        /**
         * Get URL hash based on given parameters
         *
         * @param  {Object} params
         *
         * @return {String}
         */
        getHash: function(params) {
            if (params.user) {
                if (params.highlighting) {
                    return `U${params.user}`;
                } else {
                    return `u${params.user}`;
                }
            }
            return '';
        },
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            viewOptions: {},
        };
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var users = sortUsers(this.props.users, this.props.locale);
        var anchor;
        var hashParams = module.exports.parseHash(this.props.route.hash);
        if (hashParams.user) {
            anchor = `user-${hashParams.user}`;
        }
        var smartListProps = {
            items: users,
            offset: 16,
            behind: 4,
            ahead: 8,
            anchor: anchor,

            onIdentity: this.handleUserIdentity,
            onRender: this.handleUserRender,
            onAnchorChange: this.handleUserAnchorChange,
        };
        return (
            <div className="user-list">
                <SmartList {...smartListProps} />
            </div>
        );
    },

    /**
     * Return identifier for item
     *
     * @param  {Object} evt
     *
     * @return {String}
     */
    handleUserIdentity: function(evt) {
        return `user-${evt.item.id}`;
    },

    /**
     * Render a user view component in response to event fired by SmartList
     *
     * @param  {Object} evt
     *
     * @return {ReactElement}
     */
    handleUserRender: function(evt) {
        if (evt.needed) {
            var user = evt.item;
            var roles = findRoles(this.props.roles, user);
            var dailyActivities = _.get(this.props.dailyActivities, user.id);
            var stories;
            if (this.props.listings) {
                var listing = findListing(this.props.listings, user);
                stories = findListingStories(this.props.stories, listing);
            } else {
                stories = findUserStories(this.props.stories, user);
            }
            if (stories && stories.length > 5) {
                stories = _.slice(stories, -5);
            }
            var options = this.state.viewOptions[user.id] || {};
            var userProps = {
                user,
                roles,
                dailyActivities,
                stories,
                options,
                currentUser: this.props.currentUser,
                database: this.props.database,
                route: this.props.route,
                locale: this.props.locale,
                theme: this.props.theme,
                selectedDate: this.props.selectedDate,
                today: this.props.today,
                link: this.props.link,
                onOptionChange: this.handleOptionChange,
            };
            return <UserView {...userProps} />;
        } else {
            var height = evt.previousHeight || evt.estimatedHeight || 100;
            return <div className="user-view" style={{ height }} />;
        }
    },

    /**
     * Called when a different user is positioned at the top of the viewport
     *
     * @param  {Object} evt
     */
    handleUserAnchorChange: function(evt) {
        var params = {
            user: _.get(evt.item, 'id')
        };
        var hash = module.exports.getHash(params);
        this.props.route.reanchor(hash);
    },

    /**
     * Called when the user change chart options
     *
     * @param  {Object} evt
     */
    handleOptionChange: function(evt) {
        // storing chart selection at this level to avoid loss of state
        // due to on-demand rendering
        var viewOptions = _.clone(this.state.viewOptions);
        viewOptions[evt.user.id] = evt.options;
        this.setState({ viewOptions });
    },
});

var sortUsers = Memoize(function(users, locale) {
    var p = locale.pick;
    var name = (user) => {
        return p(user.details.name);
    };
    return _.orderBy(users, [ name ], [ 'asc' ]);
});

var findRoles = Memoize(function(roles, user) {
    if (user) {
        var list = _.filter(_.map(user.role_ids, (roleId) => {
            return _.find(roles, { id: roleId });
        }));
        if (!_.isEmpty(list)) {
            return list;
        }
    }
    return Empty.array;
});

var findListing = Memoize(function(listings, user) {
    if (user) {
        return _.find(listings, (listing) => {
            if (listing.filters.user_ids[0] === user.id) {
                return true;
            }
        });
    } else {
        return null;
    }
});

var findListingStories = Memoize(function(stories, listing) {
    if (listing) {
        var hash = _.keyBy(stories, 'id');
        var list = _.filter(_.map(listing.story_ids, (id) => {
            return hash[id];
        }));
        if (!_.isEmpty(list)) {
            return list;
        }
    }
    return Empty.array;
});

var findUserStories = Memoize(function(stories, user) {
    var list = _.filter(stories, (story) => {
        return _.includes(story.user_ids, user.id);
    });
    if (!_.isEmpty(list)) {
        return list;
    }
    return Empty.array;
});
