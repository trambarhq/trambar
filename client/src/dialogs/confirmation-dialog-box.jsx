import React, { PureComponent } from 'react';

// widgets
import Overlay from 'widgets/overlay';
import PushButton from 'widgets/push-button';

import './confirmation-dialog-box.scss';

class ConfirmationDialogBox extends PureComponent {
    static displayName = 'ConfirmationDialogBox';

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let overlayProps = {
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
    }

    /**
     * Render message
     *
     * @return {ReactElement}
     */
    renderMessage() {
        return (
            <div className="message">
                {this.props.children}
            </div>
        );
    }

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons() {
        let t = this.props.locale.translate;
        let cancelProps = {
            label: t('confirmation-cancel'),
            onClick: this.props.onClose,
            hidden: !this.props.onClose,
        };
        let confirmProps = {
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
    }
}

export {
    ConfirmationDialogBox as default,
    ConfirmationDialogBox,
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ConfirmationDialogBox.propTypes = {
        show: PropTypes.bool,
        env: PropTypes.instanceOf(Environment).isRequired,
        onClose: PropTypes.func,
        onConfirm: PropTypes.func,
    };
}
