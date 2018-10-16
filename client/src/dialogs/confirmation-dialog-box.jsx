import React, { PureComponent } from 'react';

// widgets
import Overlay from 'widgets/overlay';
import PushButton from 'widgets/push-button';

import './confirmation-dialog-box.scss';

/**
 * Dialog box for asking the user for a confirmation of an action.
 *
 * @extends PureComponent
 */
class ConfirmationDialogBox extends PureComponent {
    static displayName = 'ConfirmationDialogBox';

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { show, onClose } = this.props;
        let overlayProps = { show, onBackgroundClick: onClose };
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
        let { children } = this.props;
        return <div className="message">{children}</div>;
    }

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons() {
        let { env, onClose, onConfirm } = this.props;
        let { t } = env.locale;
        let cancelProps = {
            label: t('confirmation-cancel'),
            onClick: onClose,
            hidden: !onClose,
        };
        let confirmProps = {
            label: t('confirmation-confirm'),
            onClick: onConfirm,
            hidden: !onConfirm,
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
