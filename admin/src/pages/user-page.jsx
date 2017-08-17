var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var PushButton = require('widgets/push-button');

require('./user-page.scss');

module.exports = Relaks.createClass({
    displayName: 'UserPage',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    statics: {
        parseUrl: function(url) {
            return Route.match('/users/:userId/', url)
                || Route.match('/projects/:projectId/members/:userId/', url);
        },

        getUrl: function(params) {
            if (params.projectId) {
                return `/projects/${params.projectId}/members/${params.userId}/`;
            } else {
                return `/users/${params.userId}/`;
            }
        },
    },

    renderAsync: function(meanwhile) {
        var db = this.props.database.use({ server: '~', schema: 'global', by: this });
        var props = {
            user: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<UserPageSync {...props} />);
        return db.start().then((userId) => {
            var criteria = {
                id: this.props.route.parameters.userId
            };
            return db.findOne({ table: 'user', criteria });
        }).then((user) => {
            props.user = user;
            return <UserPageSync {...props} />;
        });
    }
});

var UserPageSync = module.exports.Sync = React.createClass({
    displayName: 'UserPage.Sync',
    propTypes: {
        user: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    render: function() {
        var t = this.props.locale.translate;
        var member = !!this.props.route.parameters.projectId;
        var name = _.get(this.props.user, 'details.name');
        return (
            <div className="user-summary-page">
                <PushButton className="add" onClick={this.handleAddClick}>
                    {t(member ? 'user-summary-member-edit' : 'user-summary-edit')}
                </PushButton>
                <h2>{t(member ? 'user-summary-member-$name' : 'user-summary-$name', name)}</h2>
            </div>
        );
    }
});
