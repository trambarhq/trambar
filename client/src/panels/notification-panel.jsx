var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var SettingsSection = require('widgets/settings-section');

require('./notification-panel.scss');

module.exports = Relaks.createClass({
    displayName: 'NotificationPanel',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    renderAsync: function(meanwhile) {
        var props = {
            currentUser: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <NotificationPanelSync {...props} />;
    },
});

var NotificationPanelSync = module.exports.Sync = React.createClass({
    displayName: 'NotificationPanel.Sync',
    mixins: [ UpdateCheck ],
    propTypes: {
        currentUser: PropTypes.arrayOf(PropTypes.object).isRequired,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    render: function() {
        var t = this.props.locale.translate;
        return (
            <SettingsSection className="notification">
                <header>
                    <i className="fa fa-exclamation-circle" /> {t('settings-notification')}
                </header>
                <footer>
                </footer>
            </SettingsSection>
        );
    },
});
