var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Moment = require('moment');
var Memoize = require('utils/memoize');
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
        freshRoute: PropTypes.bool,
        link: PropTypes.oneOf([ 'user', 'team' ]),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
        loading: PropTypes.bool,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            viewOptions
        };
    },

    /**
     * Update state on prop changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (this.props.users !== nextProps.users) {
            // see explanation in story-list.jsx
            this.freshList = this.props.freshRoute;
        }
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var users = sortUsers(this.props.users, this.props.locale);
        var smartListProps = {
            items: users,
            behind: 4,
            ahead: 8,
            fresh: this.freshList,

            onIdentity: this.handleUserIdentity,
            onRender: this.handleUserRender,
        };
        return (
            <div className="user-list">
                <SmartList {...smartListProps} />
            </div>
        );
    },

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
     * Called when the user change chart options
     *
     * @param  {Object} evt
     */
    handleOptionChange: function(evt) {
        // storing chart selection at this level to avoid loss of state
        // due to on-demand rendering
        viewOptions = _.clone(this.state.viewOptions);
        viewOptions[evt.user.id] = evt.options;
        this.setState({ viewOptions });
    },
});

var viewOptions = {};

var sortUsers = Memoize(function(users, locale) {
    var p = locale.pick;
    var name = (user) => {
        return p(user.details.name);
    };
    return _.orderBy(users, [ name ], [ 'asc' ]);
});

var findRoles = Memoize(function(roles, user) {
    if (user) {
        return _.filter(_.map(user.role_ids, (roleId) => {
            return _.find(roles, { id: roleId });
        }));
    } else {
        return [];
    }
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
        return _.filter(_.map(listing.story_ids, (id) => {
            return hash[id];
        }));
    } else {
        return [];
    }
});

var findUserStories = Memoize(function(stories, user) {
    return _.filter(stories, (story) => {
        return _.includes(story.user_ids, user.id);
    });
});
