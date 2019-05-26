import React from 'react';

// widgets
import { Overlay } from 'common/widgets/overlay.jsx';
import { PushButton } from '../widgets/push-button.jsx';

import './confirmation-dialog-box.scss';

/**
 * Dialog box for asking the user for a confirmation of an action.
 */
function ConfirmationDialogBox(props) {
    const { env, children, onCancel, onConfirm } = props;
    const { t } = env.locale;
    let { onClose } = props;
    if (!onClose) {
        onClose = onCancel;
    }
    return (
        <div className="confirmation-dialog-box">
            {renderMessage()}
            {renderButtons()}
        </div>
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

const component = Overlay.create(ConfirmationDialogBox);

export {
    component as default,
    component as ConfirmationDialogBox,
};
