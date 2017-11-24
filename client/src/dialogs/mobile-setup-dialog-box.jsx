var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');

// widgets
var Overlay = require('widgets/overlay');
var PushButton = require('widgets/push-button');
var QRCode = require('widgets/qr-code');

require('./mobile-setup-dialog-box.scss');

module.exports = React.createClass({
    displayName: 'MobileSetupDialogBox',
    propTypes: {
        show: PropTypes.bool,

        database: PropTypes.instanceOf(Database).isRequired,
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
        var number = this.props.number;
        var url = `https://`;
        return (
            <div className="contents">
                <QRCode text={url} scale={6} />
                <div className="info">
                    Something
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
