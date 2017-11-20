var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Memoize = require('utils/memoize');
var Merger = require('data/merger');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var OnDemand = require('widgets/on-demand');
var NotificationView = require('views/notification-view');

require('./notification-list.scss');

module.exports = Relaks.createClass({
    displayName: 'NotificationList',
    propTypes: {
        notifications: PropTypes.arrayOf(PropTypes.object),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    renderAsync: function(meanwhile) {
        var route = this.props.route;
        var server = route.parameters.server;
        var schema = route.parameters.schema;
        var db = this.props.database.use({ server, schema, by: this });
        var props = {
            users: null,

            notifications: this.props.notifications,
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<NotificationListSync {...props} />, 250);
        return db.start().then((userId) => {
            // load authors of comments
            var criteria = {};
            criteria.id = _.uniq(_.map(props.notifications, 'user_id'));
            return db.find({ schema: 'global', table: 'user', criteria });
        }).then((users) => {
            props.users = users;
            meanwhile.show(<NotificationListSync {...props} />);
        }).then(() => {
            // load stories
            var criteria = {};
            criteria.id = _.uniq(_.map(props.notifications, 'story_id'));
            return db.find({ table: 'story', criteria });
        }).then((stories) => {
            props.stories = stories;
            return <NotificationListSync {...props} />;
        })
    },
});

var NotificationListSync = module.exports.Sync = React.createClass({
    displayName: 'NotificationList.Sync',
    mixins: [ UpdateCheck ],
    propTypes: {
        notifications: PropTypes.arrayOf(PropTypes.object),
        users: PropTypes.arrayOf(PropTypes.object),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    render: function() {
        var notifications = sortReactions(this.props.notifications);
        return (
            <div className="notification-list">
                {_.map(notifications, this.renderReaction)}
            </div>
        );
    },

    renderReaction: function(notification) {
        var user = findUser(this.props.users, notification);
        var props = {
            notification,
            user,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            key: notification.id,
        };
        return <NotificationView {...props} />;
    },
});

var sortReactions = Memoize(function(notifications) {
    return _.orderBy(notifications, [ 'ptime' ], [ 'desc' ]);
});

var findUser = Memoize(function(users, notification) {
    if (notification) {
        return _.find(users, { id: notification.user_id });
    } else {
        return null;
    }
});
