var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');

// widgets
var Overlay = require('widgets/overlay');
var PushButton = require('widgets/push-button');
var QRCode = require('widgets/qr-code');

require('./telephone-number-dialog-box.scss');

module.exports = React.createClass({
    displayName: 'TelephoneNumberDialogBox',
    propTypes: {
        show: PropTypes.bool,
        number: PropTypes.string,

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
                <div className="telephone-number-dialog-box">
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
        var url = `tel:${number}`;
        return (
            <div className="contents">
                <QRCode text={url} scale={6} />
                <div className="number">{number}</div>
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
            label: t('telephone-dialog-close'),
            emphasized: true,
            onClick: this.props.onClose,
        };
        return (
            <div className="buttons">
                <PushButton {...closeButtonProps} />
            </div>
        );
    },
});
