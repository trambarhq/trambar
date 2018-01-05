var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var SettingsPanel = require('widgets/settings-panel');
var PushButton = require('widgets/push-button');
var ConfirmationDialogBox = require('dialogs/confirmation-dialog-box');

require('./device-panel.scss');

module.exports = React.createClass({
    displayName: 'DevicePanel',
    mixins: [ UpdateCheck ],
    propTypes: {
        devices: PropTypes.arrayOf(PropTypes.object),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            renderingDialog: null,
            showingDialog: false,
        };
    },

    /**
     * Render component
     *
     * @return {ReactElement|null}
     */
    render: function() {
        var t = this.props.locale.translate;
        var title;
        if (_.size(this.props.devices) === 1) {
            title = t('settings-device');
        } else {
            title = t('settings-devices');
        }
        return (
            <SettingsPanel className="device">
                <header>
                    <i className="fa fa-tablet" /> {title}
                </header>
                <body>
                    {this.renderDevices()}
                    {this.renderDialogBox()}
                </body>
            </SettingsPanel>
        );
    },

    /**
     * Render list of projects
     *
     * @return {Array<ReactElement>}
     */
    renderDevices: function() {
        return _.map(this.props.devices, this.renderDevice);
    },

    /**
     * Render a project option, with additional links if it's the current project
     *
     * @param  {Device} link
     *
     * @return {ReactElement}
     */
    renderDevice: function(device) {
        var t = this.props.locale.translate;
        return (
            <div key={device.id} className="device-option-button selected">
                <div className="icon">
                    <DeviceIcon type={device.type} />
                </div>
                <div className="text">
                    <span className="name">Lenovo Chicken</span>
                    <div data-device-id={device.id} className="revoke" onClick={this.handleRevokeClick}>
                        <i className="fa fa-ban" />
                        {' '}
                        <span>{t('mobile-device-revoke')}</span>
                    </div>
                </div>
            </div>
        );
    },

    /**
     * Render sign out dialog box
     *
     * @return {ReactElement|null}
     */
    renderDialogBox: function() {
        if (this.state.renderingDialog !== 'sign-out') {
            return null;
        }
        var t = this.props.locale.translate;
        var props = {
            show: this.state.showingDialog,
            locale: this.props.locale,
            onClose: this.handleDialogClose,
            onConfirm: this.handleSignOutConfirm,
        };
        return (
            <ConfirmationDialogBox {...props}>
                {t('project-panel-sign-out-are-you-sure')}
            </ConfirmationDialogBox>
        );
    },

    handleProjectClick: function(evt) {
        var key = evt.currentTarget.getAttribute('data-key');
        var link = _.find(this.props.projectLinks, { key });
        if (link) {
            // redirect to settings page with new schema, possibly new address
            var params = {
                address: link.address,
                schema: link.schema,
            };
            this.props.route.replace(require('pages/settings-page'), params);
        }
    },

    /**
     * Called when user clicks revoke button
     *
     * @param  {Event} evt
     */
    handleRevokeClick: function(evt) {
        var deviceId = parseInt(evt.currentTarget.getAttribute('data-device-id'));
        var device = _.find(this.props.devices, { id: deviceId });
        if (device) {
            console.log(device);
        }
    },
});

function DeviceIcon(props) {
    var icon;
    switch (props.type) {
        case 'ios': icon = 'apple'; break;
        default: icon = props.type;
    }
    return (
        <div className="device-icon">
            <i className="fa fa-tablet background" />
            <i className={`fa fa-${icon} icon-overlay`} />
        </div>
    );
}
