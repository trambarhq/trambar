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
var PushButton = require('widgets/push-button');

require('./user-panel.scss');

module.exports = React.createClass({
    displayName: 'UserPanel',
    mixins: [ UpdateCheck ],
    propTypes: {
        currentUser: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    render: function() {
        var t = this.props.locale.translate;
        return (
            <SettingsSection className="user">
                <header>
                    <i className="fa fa-user-circle" /> {t('settings-user-profile')}
                </header>
                <footer>
                </footer>
            </SettingsSection>
        );
    },
});
