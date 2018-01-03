var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var UniversalLink = require('routing/universal-link');

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
            devices: null,

            show: this.props.show,
            route: this.props.route,
            locale: this.props.locale,
            onClose: this.props.onClose,
        };
        var currentUserId;
        meanwhile.show(<MobileSetupDialogBoxSync {...props} />);
        return db.start().then((userId) => {
            currentUserId = userId;
            return db.beginMobileSession('client');
        }).then((code) => {
            props.activationCode = code;
            meanwhile.show(<MobileSetupDialogBoxSync {...props} />);
        }).then(() => {
            // get the user's list of devices
            var criteria = {
                user_id: currentUserId,
            };
            return db.find({ schema: 'global', table: 'device', criteria });
        }).then((devices) => {
            props.devices = devices;
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
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        onClose: PropTypes.func,
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
        var address = route.parameters.address;
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

    /**
     * Check for change in props.devices
     */
    componentDidUpdate: function(prevProps, prevState) {
        if (_.isArray(prevProps.devices)) {
            // close the dialog box automatically when we see a new device
            if (_.size(this.props.devices) > _.size(prevProps.devices)) {
                if (this.props.onClose) {
                    this.props.onClose({
                        type: 'close',
                        target: this,
                    })
                }
            }
        }
    },
});

function insertSpacers(s) {
    if (!s) {
        return s;
    }
    var parts = s.toUpperCase().match(/.{1,4}/g);
    return parts.join('-');
}
