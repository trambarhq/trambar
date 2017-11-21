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

require('./project-panel.scss');

module.exports = Relaks.createClass({
    displayName: 'ProjectPanel',
    propTypes: {
        currentUser: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    renderAsync: function(meanwhile) {
        var props = {
            projects: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <ProjectPanelSync {...props} />;
    },
});

var ProjectPanelSync = module.exports.Sync = React.createClass({
    displayName: 'ProjectPanel.Sync',
    mixins: [ UpdateCheck ],
    propTypes: {
        projects: PropTypes.arrayOf(PropTypes.object).isRequired,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    render: function() {
        var t = this.props.locale.translate;
        return (
            <SettingsSection className="project">
                <header>
                    <i className="fa fa-database" /> {t('settings-projects')}
                </header>
                <footer>
                    {this.renderButtons()}
                </footer>
            </SettingsSection>
        );
    },

    renderButtons: function() {
        var addProps = {
            label: 'Add...',
        };
        var removeProps = {
            label: 'Remove',
        };
        return (
            <div>
                <PushButton {...addProps} />
                <PushButton {...removeProps} />
            </div>
        );
    },
});
