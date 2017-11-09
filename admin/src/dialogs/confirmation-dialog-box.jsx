var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var Overlay = require('widgets/overlay');
var PushButton = require('widgets/push-button');

require('./confirmation-dialog-box.scss');

module.exports = React.createClass({
    displayName: 'ConfirmationDialogBox',
    propTypes: {
        show: PropTypes.bool,
        dangerous: PropTypes.bool,

        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onConfirm: PropTypes.func,
        onCancel: PropTypes.func,
    },

    /**
     * Return default props
     *
     * @return {Object}
     */
    getDefaultProps: function() {
        return {
            show: true,
            dangerous: true,
        };
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var t = this.props.locale.translate;
        var overlayProps = {
            show: this.props.show,
            onBackgroundClick: this.handleCancelClick,
        };
        var cancelProps = {
            className: 'cancel',
            onClick: this.handleCancelClick
        };
        var confirmProps = {
            className: this.props.dangerous ? 'danger' : 'emphasis',
            onClick: this.handleConfirmClick
        };
        return (
            <Overlay {...overlayProps}>
                <div className="confirmation-dialog-box">
                    <div className="message">
                        {this.props.children}
                    </div>
                    <div className="buttons">
                        <PushButton {...cancelProps}>
                            {t('confirmation-cancel')}
                        </PushButton>
                        {' '}
                        <PushButton {...confirmProps}>
                            {t('confirmation-confirm')}
                        </PushButton>
                    </div>
                </div>
            </Overlay>
        );
    },

    /**
     * Called when user clicks cancel button or outside the dialog
     *
     * @param  {Event} evt
     */
    handleCancelClick: function(evt) {
        if (this.props.onCancel) {
            this.props.onCancel({
                type: 'cancel',
                target: this,
            });
        }
    },

    /**
     * Called when user clicks confirm button
     *
     * @param  {Event} evt
     */
    handleConfirmClick: function(evt) {
        if (this.props.onConfirm) {
            this.props.onConfirm({
                type: 'confirm',
                target: this,
            });
        }
    },
})
