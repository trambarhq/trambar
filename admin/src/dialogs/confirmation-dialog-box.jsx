import React, { useCallback } from 'react';

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

    const handleCancelClick = useCallback((evt) => {
        if (onCancel) {
            onCancel({});
        }
    }, [ onCancel ]);
    const handleConfirmClick = useCallback((evt) => {
        if (onConfirm) {
            onConfirm({});
        }
    }, [ onConfirm ]);

    return (
        <Overlay show={show} onBackgroundClick={handleCancelClick}>
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
        </Overlay>
    );
}

export {
    ConfirmationDialogBox as default,
    ConfirmationDialogBox,
};
