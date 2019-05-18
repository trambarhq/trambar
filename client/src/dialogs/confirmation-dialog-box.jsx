import React, { PureComponent } from 'react';

// widgets
import { Overlay } from 'common/widgets/overlay.jsx';
import { PushButton } from '../widgets/push-button.jsx';

import './confirmation-dialog-box.scss';

/**
 * Dialog box for asking the user for a confirmation of an action.
 */
function ConfirmationDialogBox(props) {
    const { env, show, children, onCancel, onConfirm } = props;
    const { t } = env.locale;
    let { onClose } = props;
    if (!onClose) {
        onClose = onCancel;
    }
    const overlayProps = { show, onBackgroundClick: onClose};
    return (
        <Overlay {...overlayProps}>
            <div className="confirmation-dialog-box">
                {renderMessage()}
                {renderButtons()}
            </div>
        </Overlay>
    );

    function renderMessage() {
        return <div className="message">{children}</div>;
    }

    function renderButtons() {
        const cancelProps = {
            label: t('confirmation-cancel'),
            onClick: onClose,
            hidden: !onClose,
        };
        const confirmProps = {
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
