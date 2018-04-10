var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');

// widgets
var Overlay = require('widgets/overlay');
var PushButton = require('widgets/push-button');

require('./confirmation-dialog-box.scss');

module.exports = React.createClass({
    displayName: 'ConfirmationDialogBox',
    propTypes: {
        show: PropTypes.bool,
        locale: PropTypes.instanceOf(Locale).isRequired,
        onClose: PropTypes.func,
        onConfirm: PropTypes.func,
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
                <div className="confirmation-dialog-box">
                    {this.renderMessage()}
                    {this.renderButtons()}
                </div>
            </Overlay>
        );
    },

    /**
     * Render message
     *
     * @return {ReactElement}
     */
    renderMessage: function() {
        return (
            <div className="message">
                {this.props.children}
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
        var cancelProps = {
            label: t('confirmation-cancel'),
            onClick: this.props.onClose,
            hidden: !this.props.onClose,
        };
        var confirmProps = {
            label: t('confirmation-confirm'),
            onClick: this.props.onConfirm,
            hidden: !this.props.onConfirm,
            emphasized: true,
        };
        return (
            <div className="buttons">
                <PushButton {...cancelProps} />
                <PushButton {...confirmProps} />
            </div>
        );
    },
});
