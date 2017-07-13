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
        reactions: PropTypes.arrayOf(PropTypes.object),

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
            respondents: null,
            stories: null,

            reactions: this.props.reactions,
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<NotificationListSync {...props} />, 250);
        return db.start().then((userId) => {
            // load authors of comments
            var criteria = {};
            criteria.id = _.uniq(_.map(props.reactions, 'user_id'));
            return db.find({ schema: 'global', table: 'user', criteria });
        }).then((users) => {
            props.respondents = users;
            meanwhile.show(<NotificationListSync {...props} />);
        }).then(() => {
            // load stories
            var criteria = {};
            criteria.id = _.uniq(_.map(props.reactions, 'story_id'));
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
        reactions: PropTypes.arrayOf(PropTypes.object),
        respondents: PropTypes.arrayOf(PropTypes.object),
        stories: PropTypes.arrayOf(PropTypes.object),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    render: function() {
        var reactions = sortReactions(this.props.reactions);
        return (
            <div className="notification-list">
                {_.map(reactions, this.renderReaction)}
            </div>
        );
    },

    renderReaction: function(reaction) {
        var respondent = findRespondent(this.props.respondents, reaction);
        var story = findStory(this.props.stories, reaction);
        var props = {
            reaction,
            respondent,
            story,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            key: reaction.id,
        };
        return <NotificationView {...props} />;
    },
});

var sortReactions = Memoize(function(reactions) {
    return _.orderBy(reactions, [ 'ptime' ], [ 'desc' ]);
});

var findStory = Memoize(function(stories, reaction) {
    if (reaction) {
        return _.find(stories, { id: reaction.story_id });
    } else {
        return null;
    }
});

var findRespondent = Memoize(function(users, reaction) {
    if (reaction) {
        return _.find(users, { id: reaction.user_id });
    } else {
        return null;
    }
});
