import React, { PureComponent } from 'react';

import { Environment } from 'common/env/environment.mjs';

// widgets
import { Overlay } from 'common/widgets/overlay.jsx';
import { PushButton } from '../widgets/push-button.jsx';
import { QRCode } from '../widgets/qr-code.jsx';

import './telephone-number-dialog-box.scss';

/**
 * Dialog box that displays a phone number and a QR code for dialing that number.
 */
function TelephoneNumberDialogBox(props) {
    const { env, number, onClose } = props;
    const { t } = env.locale;
    return (
        <div className="telephone-number-dialog-box">
            {renderContents()}
            {renderButtons()}
        </div>
    );

    function renderContents() {
        const url = `tel:${number}`;
        return (
            <div className="contents">
                <QRCode text={url} scale={6} />
                <div className="number">{number}</div>
            </div>
        );
    }

    function renderButtons() {
        const closeButtonProps = {
            label: t('telephone-dialog-close'),
            emphasized: true,
            onClick: onClose,
        };
        return (
            <div className="buttons">
                <PushButton {...closeButtonProps} />
            </div>
        );
    }
}

const component = Overlay.create(TelephoneNumberDialogBox);

export {
    component as default,
    component as TelephoneNumberDialogBox,
};
