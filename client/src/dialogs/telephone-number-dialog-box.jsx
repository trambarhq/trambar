import React, { PureComponent } from 'react';

import Environment from 'env/environment';

// widgets
import Overlay from 'widgets/overlay';
import PushButton from 'widgets/push-button';
import QRCode from 'widgets/qr-code';

import './telephone-number-dialog-box.scss';

/**
 * Dialog box that displays a phone number and a QR code for dialing that number.
 *
 * @extends PureComponent
 */
class TelephoneNumberDialogBox extends PureComponent {
    static displayName = 'TelephoneNumberDialogBox';

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
                <div className="telephone-number-dialog-box">
                    {this.renderContents()}
                    {this.renderButtons()}
                </div>
            </Overlay>
        );
    }

    /**
     * Render QR-code and number
     *
     * @return {ReactElement}
     */
    renderContents() {
        let { number } = this.props;
        let url = `tel:${number}`;
        return (
            <div className="contents">
                <QRCode text={url} scale={6} />
                <div className="number">{number}</div>
            </div>
        );
    }

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons() {
        let { env, onClose } = this.props;
        let { t } = env.locale;
        let closeButtonProps = {
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

export {
    TelephoneNumberDialogBox as default,
    TelephoneNumberDialogBox,
};

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    TelephoneNumberDialogBox.propTypes = {
        show: PropTypes.bool,
        number: PropTypes.string,

        env: PropTypes.instanceOf(Environment).isRequired,

        onClose: PropTypes.func,
    };
}
