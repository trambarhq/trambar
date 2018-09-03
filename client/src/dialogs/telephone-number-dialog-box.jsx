import React, { PureComponent } from 'react';

import Locale from 'locale/locale';

// widgets
import Overlay from 'widgets/overlay';
import PushButton from 'widgets/push-button';
import QRCode from 'widgets/qr-code';

import './telephone-number-dialog-box.scss';

class TelephoneNumberDialogBox extends PureComponent {
    static displayName = 'TelephoneNumberDialogBox';

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        var overlayProps = {
            show: this.props.show,
            onBackgroundClick: this.props.onClose,
        };
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
        var number = this.props.number;
        var url = `tel:${number}`;
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
        var t = this.props.locale.translate;
        var closeButtonProps = {
            label: t('telephone-dialog-close'),
            emphasized: true,
            onClick: this.props.onClose,
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

        locale: PropTypes.instanceOf(Locale).isRequired,

        onClose: PropTypes.func,
    };
}
