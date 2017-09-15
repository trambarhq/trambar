var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

var ProjectSettingsEditor = require('editors/project-settings-editor');
var UserProfileEditor = require('editors/user-profile-editor');
var NotificationPreferencesEditor = require('editors/notification-preferences-editor');
var LanguageSettingsEditor = require('editors/language-settings-editor');

require('./settings-page.scss');

module.exports = Relaks.createClass({
    displayName: 'SettingsPage',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    statics: {
        parseUrl: function(url) {
            return Route.match('/:schema/settings/?', url)
                || Route.match('//:server/:schema/settings/?', url);
        },

        getUrl: function(params) {
            var server = params.server;
            var schema = params.schema;
            var url = `/${schema}/settings/`;
            if (server) {
                url = `//${server}` + url;
            }
            return url;
        },

        navigation: {
            top: {},
            bottom: {
                section: 'settings',
            }
        },
    },

    renderAsync: function(meanwhile) {
        var route = this.props.route;
        var server = route.parameters.server;
        var db = this.props.database.use({ server, by: this });
        var props = {
            project: null,
            currentUser: null,
            stories: null,
            reactions: null,
            users: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<SettingsPageSync {...props} />, 250);
        return db.start().then((userId) => {
            return <SettingsPageSync {...props} />;
        });
    }
});

var SettingsPageSync = module.exports.Sync = React.createClass({
    displayName: 'SettingsPage.Sync',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    render: function() {
        return (
            <div className="settings-page">
                {this.renderProjects()}
                {this.renderUserProfile()}
                {this.renderNotificationPreferences()}
                {this.renderLanguages()}
            </div>
        );
    },

    renderProjects: function() {
        var props = {
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <ProjectSettingsEditor {...props} />;
    },

    renderUserProfile: function() {
        var props = {
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <UserProfileEditor {...props} />;
    },

    renderNotificationPreferences: function() {
        var props = {
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <NotificationPreferencesEditor {...props} />;
    },

    renderLanguages: function() {
        var props = {
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <LanguageSettingsEditor {...props} />;
    },
});
