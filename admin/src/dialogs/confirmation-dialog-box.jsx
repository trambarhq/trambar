import React from 'react';
import { useListener } from 'relaks';

// widgets
import { Overlay } from 'common/widgets/overlay.jsx';
import { PushButton } from '../widgets/push-button.jsx';

import './confirmation-dialog-box.scss';

/**
 * Confirmation dialog box
 */
function ConfirmationDialogBox(props) {
    const { env, show, dangerous, children, onCancel, onConfirm } = props;
    const { t } = env.locale;

    const handleCancelClick = useListener((evt) => {
        if (onCancel) {
            onCancel({});
        }
    });
    const handleConfirmClick = useListener((evt) => {
        if (onConfirm) {
            onConfirm({});
        }
    });

    return (
        <div className="confirmation-dialog-box">
            <div className="message">{children}</div>
            <div className="buttons">
                <PushButton className="cancel" onClick={handleCancelClick}>
                    {t('confirmation-cancel')}
                </PushButton>
                {' '}
                <PushButton className={dangerous ? 'danger' : 'emphasis'} onClick={handleConfirmClick}>
                    {t('confirmation-confirm')}
                </PushButton>
            </div>
        </div>
    );
}

const component = Overlay.create(ConfirmationDialogBox);

export {
    component as default,
    component as ConfirmationDialogBox,
};
