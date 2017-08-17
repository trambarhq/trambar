var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var PushButton = require('widgets/push-button');

require('./role-page.scss');

module.exports = Relaks.createClass({
    displayName: 'RolePage',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    statics: {
        parseUrl: function(url) {
            return Route.match('/roles/:roleId/', url);
        },

        getUrl: function(params) {
            return `/roles/${params.roleId}/`;
        },
    },

    renderAsync: function(meanwhile) {
        var db = this.props.database.use({ server: '~', by: this });
        var props = {
            projects: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<RolePageSync {...props} />);
        return db.start().then((roleId) => {
            return <RolePageSync {...props} />;
        });
    }
});

var RolePageSync = module.exports.Sync = React.createClass({
    displayName: 'RolePage.Sync',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    render: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var title = p(_.get(this.props.role, 'details.title'));
        return (
            <div className="role-summary-page">
                <PushButton className="edit" onClick={this.handleEditClick}>
                    {t('role-summary-edit')}
                </PushButton>
                <h2>{t('role-summary-$title', title)}</h2>
            </div>
        );
    }
});
