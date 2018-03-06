var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var UniversalLink = require('routing/universal-link');
var DeviceFinder = require('objects/finders/device-finder');
var UserFinder = require('objects/finders/user-finder');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');

// widgets
var Overlay = require('widgets/overlay');
var PushButton = require('widgets/push-button');
var QRCode = require('widgets/qr-code');

require('./mobile-setup-dialog-box.scss');

module.exports = Relaks.createClass({
    displayName: 'MobileSetupDialogBox.Sync',
    propTypes: {
        show: PropTypes.bool,
        system: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,

        onClose: PropTypes.func,
    },

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync: function(meanwhile) {
        var db = this.props.database.use({ by: this });
        var props = {
            activationCode: null,
            currentUser: null,
            devices: null,

            show: this.props.show,
            system: this.props.system,
            route: this.props.route,
            locale: this.props.locale,
            onClose: this.props.onClose,
        };
        meanwhile.show(<MobileSetupDialogBoxSync {...props} />);
        return db.start().then((currentUserId) => {
            return UserFinder.findUser(db, currentUserId).then((user) => {
                props.currentUser = user;
            });
        }).then(() => {
            return db.beginMobileSession('client').then((code) => {
                props.activationCode = code;
            });
        }).then(() => {
            return DeviceFinder.findUserDevices(db, props.user).then((devices) => {
                props.devices = devices;
            });
        }).then(() => {
            return <MobileSetupDialogBoxSync {...props} />;
        });
    },

    /**
     * Release the mobile session, assuming the device has acquired it
     */
    componentWillUnmount: function() {
        var db = this.props.database.use({ by: this });
        db.releaseMobileSession();
    },
})

var MobileSetupDialogBoxSync = module.exports.Sync = React.createClass({
    displayName: 'MobileSetupDialogBox.Sync',
    propTypes: {
        show: PropTypes.bool,
        activationCode: PropTypes.string,
        devices: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        onClose: PropTypes.func,
    },

    /**
     * Check for change in props.devices
     */
    componentWillReceiveProps: function(nextProps) {
        if (this.props.devices !== nextProps.devices) {
            var handle = nextProps.activationCode;
            if (handle) {
                if (_.some(nextProps.devices, { session_handle: handle })) {
                    // a device has acquire the session--close dialog box automatically
                    if (this.props.onClose) {
                        this.props.onClose({
                            type: 'close',
                            target: this,
                        });
                    }
                }
            }
        }
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var overlayProps = {
            show: this.props.show,
            onBackgroundClick: this.props.onClose,
        };
        return (
            <Overlay {...overlayProps}>
                <div className="mobile-setup-dialog-box">
                    {this.renderContents()}
                    {this.renderButtons()}
                </div>
            </Overlay>
        );
    },

    /**
     * Render QR-code and number
     *
     * @return {ReactElement}
     */
    renderContents: function() {
        var t = this.props.locale.translate;
        var number = this.props.number;
        var route = this.props.route;
        var url;
        var address = _.get(this.props.system, 'settings.address');
        if (!address) {
            address = route.parameters.address;
        }
        var schema = route.parameters.schema;
        var activationCode = this.props.activationCode;
        if (activationCode) {
            var StartPage = require('pages/start-page');
            var urlParts = StartPage.getURL({ activationCode, schema });
            url = UniversalLink.form(address, urlParts.path, urlParts.query);
        }
        return (
            <div className="contents">
                <QRCode text={url} scale={6} />
                <div className="info">
                    <div className="label">{t('mobile-setup-address')}</div>
                    <div className="value">{address}</div>
                    <div className="label">{t('mobile-setup-code')}</div>
                    <div className="value">{insertSpacers(activationCode)}</div>
                </div>
            </div>
        );
    },

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons: function() {
        var t = this.props.locale.translate;
        var closeButtonProps = {
            label: t('mobile-setup-close'),
            onClick: this.props.onClose,
        };
        return (
            <div className="buttons">
                <PushButton {...closeButtonProps} />
            </div>
        );
    },
});

function insertSpacers(s) {
    if (!s) {
        return s;
    }
    var parts = s.match(/.{1,4}/g);
    return _.toUpper(parts.join(' '));
}
