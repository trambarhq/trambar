var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Memoize = require('utils/memoize');
var Moment = require('moment');

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

module.exports = Relaks.createClass({
    displayName: 'UserList',
    propTypes: {
        users: PropTypes.arrayOf(PropTypes.object).isRequired,
        currentUser: PropTypes.object.isRequired,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
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
        var db = this.props.database.use({ schema: params.schema, by: this });
        var delay = (this.props.route !== prevProps.route) ? 100 : 1000;
        var props = {
            roles: null,
            dailyActivities: null,
            listings: null,
            stories: null,

            users: this.props.users,
            currentUser: this.props.currentUser,
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<UserListSync {...props} />, delay);
        return db.start().then((userId) => {
            // load roles
            var roleIds = _.flatten(_.map(props.users, 'role_ids'));
            var criteria = {
                id: _.uniq(roleIds)
            };
            return db.find({ schema: 'global', table: 'role', criteria });
        }).then((roles) => {
            props.roles = roles;
            return meanwhile.show(<UserListSync {...props} />);
        }).then(() => {
            // load daily-activities statistics
            var now = Moment();
            var end = now.clone().endOf('month');
            var start = now.clone().startOf('month').subtract(1, 'month');
            var range = `[${start.toISOString()},${end.toISOString()}]`;
            var criteria = {
                type: 'daily-activities',
                filters: _.map(props.users, (user) => {
                    return {
                        user_ids: [ user.id ],
                        time_range: range,
                    };
                }),
            };
            return db.find({ table: 'statistics', criteria });
        }).then((statistics) => {
            props.dailyActivities = statistics;
            return meanwhile.show(<UserListSync {...props} />);
        }).then(() => {
            // load story listings, one per user
            var criteria = {
                type: 'news',
                target_user_id: props.currentUser.id,
                filters: _.map(props.users, (user) => {
                    return {
                        user_ids: [ user.id ]
                    };
                }),
            };
            return db.find({ table: 'listing', criteria });
        }).then((listings) => {
            props.listings = listings;
        }).then(() => {
            // load stories in listings
            var storyIds = _.flatten(_.map(props.listings, 'story_ids'));
            var criteria = {
                id: _.uniq(storyIds)
            };
            return db.find({ table: 'story', criteria });
        }).then((stories) => {
            props.stories = stories;
            return <UserListSync {...props} />;
        });
    }
});

var UserListSync = module.exports.Sync = React.createClass({
    displayName: 'UserList.Sync',
    mixins: [ UpdateCheck ],
    propTypes: {
        users: PropTypes.arrayOf(PropTypes.object).isRequired,
        roles: PropTypes.arrayOf(PropTypes.object),
        dailyActivities: PropTypes.arrayOf(PropTypes.object),
        listings: PropTypes.arrayOf(PropTypes.object),
        stories: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object.isRequired,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
        loading: PropTypes.bool,
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
            behind: 2,
            ahead: 8,

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
            var dailyActivities = findDailyActivities(this.props.dailyActivities, user);
            var listing = findListing(this.props.listings, user);
            var stories = findStories(this.props.stories, listing);
            var userProps = {
                user,
                roles,
                dailyActivities,
                stories,
                currentUser: this.props.currentUser,
                database: this.props.database,
                route: this.props.route,
                locale: this.props.locale,
                theme: this.props.theme,
            };
            return <UserView {...userProps} />;
        } else {
            var height = evt.previousHeight || evt.estimatedHeight || 100;
            return <div className="user-view" style={{ height }} />;
        }
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
        return _.filter(_.map(user.role_ids, (roleId) => {
            return _.find(roles, { id: roleId });
        }));
    } else {
        return [];
    }
});

var findDailyActivities = Memoize(function(dailyActivities, user) {
    if (user) {
        return _.find(dailyActivities, (stats) => {
            return stats.filters.user_ids[0] === user.id;
        });
    } else {
        return null;
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

var findStories = Memoize(function(stories, listing) {
    if (listing) {
        var hash = _.keyBy(stories, 'id');
        return _.filter(_.map(listing.story_ids, (id) => {
            return hash[id];
        }));
    } else {
        return [];
    }
});
