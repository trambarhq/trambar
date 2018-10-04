import _ from 'lodash';
import React, { PureComponent } from 'react';

// widgets
import Overlay from 'widgets/overlay';
import PushButton from 'widgets/push-button';

import './confirmation-dialog-box.scss';

class ConfirmationDialogBox extends PureComponent {
    static displayName = 'ConfirmationDialogBox';

    constructor(props) {
        super(props);
        this.state = {
            show: true,
            dangerous: true,
        };
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { env, show, dangerous, children } = this.props;
        let { t } = env.locale;
        let overlayProps = {
            show,
            onBackgroundClick: this.handleCancelClick,
        };
        let cancelProps = {
            className: 'cancel',
            onClick: this.handleCancelClick
        };
        let confirmProps = {
            className: dangerous ? 'danger' : 'emphasis',
            onClick: this.handleConfirmClick
        };
        return (
            <Overlay {...overlayProps}>
                <div className="confirmation-dialog-box">
                    <div className="message">{children}</div>
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
    }

    /**
     * Called when user clicks cancel button or outside the dialog
     *
     * @param  {Event} evt
     */
    handleCancelClick = (evt) => {
        let { onCancel } = this.props;
        if (onCancel) {
            onCancel({
                type: 'cancel',
                target: this,
            });
        }
    }

    /**
     * Called when user clicks confirm button
     *
     * @param  {Event} evt
     */
    handleConfirmClick = (evt) => {
        let { onConfirm } = this.props;
        if (onConfirm) {
            onConfirm({
                type: 'confirm',
                target: this,
            });
        }
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
        dangerous: PropTypes.bool,
        env: PropTypes.instanceOf(Environment).isRequired,
        onConfirm: PropTypes.func,
        onCancel: PropTypes.func,
    };
}
