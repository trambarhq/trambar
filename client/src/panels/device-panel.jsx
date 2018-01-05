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
            selectedDeviceId: null,
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
        var fullName = `${device.details.manufacturer} ${device.details.name}`;
        return (
            <div key={device.id} className="device-option-button selected">
                <div className="icon">
                    <DeviceIcon type={device.type} />
                </div>
                <div className="text">
                    <span className="name">{fullName}</span>
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
        if (this.state.renderingDialog !== 'revoke') {
            return null;
        }
        var t = this.props.locale.translate;
        var props = {
            show: this.state.showingDialog,
            locale: this.props.locale,
            onClose: this.handleDialogClose,
            onConfirm: this.handleRevokeConfirm,
        };
        return (
            <ConfirmationDialogBox {...props}>
                {t('mobile-device-revoke-are-you-sure')}
            </ConfirmationDialogBox>
        );
    },

    /**
     * Called when user clicks revoke button
     *
     * @param  {Event} evt
     */
    handleRevokeClick: function(evt) {
        var deviceId = parseInt(evt.currentTarget.getAttribute('data-device-id'));
        this.setState({
            renderingDialog: 'revoke',
            showingDialog: true,
            selectedDeviceId: deviceId
        });
    },

    /**
     * Called when user confirm his intention to remove authorization
     *
     * @param  {Object} evt
     */
    handleRevokeConfirm: function(evt) {
        var device = _.find(this.props.devices, { id: this.state.selectedDeviceId });
        var db = this.props.database.use({ schema: 'global', by: this });
        db.removeOne({ table: 'device' }, device).then(() => {
            return db.endMobileSession(device.session_handle);
        });
    },

    /**
     * Called when user closes dialog box
     *
     * @param  {Object} evt
     */
    handleDialogClose: function(evt) {
        this.setState({
            renderingDialog: true,
            showingDialog: true,
            selectedDeviceId: deviceId
        });
    }
});

function DeviceIcon(props) {
    var icon;
    switch (props.type) {
        case 'ios':
        case 'osx': icon = 'apple'; break;
        default: icon = props.type;
    }
    return (
        <div className="device-icon">
            <i className="fa fa-tablet background" />
            <i className={`fa fa-${icon} icon-overlay`} />
        </div>
    );
}
