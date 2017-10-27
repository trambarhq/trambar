var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Masonry = require('react-masonry-component');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

var ProjectPanel = require('panels/project-panel');
var UserPanel = require('panels/user-panel');
var NotificationPanel = require('panels/notification-panel');
var LanguagePanel = require('panels/language-panel');

require('./settings-page.scss');

module.exports = React.createClass({
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
                url = `//${server}${url}`;
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

    render: function() {
        var props = this.props;
        var masonryOptions = {
            transitionDuration: 0
        };
        return (
            <div className="settings-page">
                <Masonry options={masonryOptions}>
                    <ProjectPanel {...props} />
                    <UserPanel {...props} />
                    <NotificationPanel {...props} />
                    <LanguagePanel {...props} />
                </Masonry>
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
