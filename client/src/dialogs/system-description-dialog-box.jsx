import _ from 'lodash';
import React, { PureComponent } from 'react';

// widgets
import Overlay from 'common/widgets/overlay.jsx';
import PushButton from '../widgets/push-button.jsx';
import Scrollable from '../widgets/scrollable.jsx';

import './system-description-dialog-box.scss';

/**
 * Dialog box for displaying the system description.
 *
 * @extends PureComponent
 */
class SystemDescriptionDialogBox extends PureComponent {
    static displayName = 'SystemDescriptionDialogBox';

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { show } = this.props;
        let overlayProps = { show,  onBackgroundClick: this.handleCloseClick };
        return (
            <Overlay {...overlayProps}>
                <div className="system-description-dialog-box">
                    {this.renderText()}
                    {this.renderButtons()}
                </div>
            </Overlay>
        );
    }

    /**
     * Render description of system
     *
     * @return {ReactElement}
     */
    renderText() {
        let { env, system } = this.props;
        let { p } = env.locale;
        let title = p(_.get(system, 'details.title'));
        let description = p(_.get(system, 'details.description'));
        return (
            <Scrollable>
                <div className="title">{title}</div>
                <div className="description">
                    {description}
                </div>
            </Scrollable>
        );
    }

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons() {
        let { env } = this.props;
        let { t } = env.locale;
        let closeButtonProps = {
            label: t('project-description-close'),
            emphasized: true,
            onClick: this.handleCloseClick,
        };
        return (
            <div className="buttons">
                <PushButton {...closeButtonProps} />
            </div>
        );
    }

    /**
     * Called when user click cancel or ok button or outside the dialog box
     *
     * @param  {Event} evt
     */
    handleCloseClick = (evt) => {
        let { onClose } = this.props;
        if (onClose) {
            onClose({ type: 'cancel', target: this });
        }
    }
}

export {
    SystemDescriptionDialogBox as default,
    SystemDescriptionDialogBox,
};

import Environment from 'common/env/environment.mjs';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    SystemDescriptionDialogBox.propTypes = {
        show: PropTypes.bool,
        system: PropTypes.object,

        env: PropTypes.instanceOf(Environment).isRequired,

        onClose: PropTypes.func,
    };
}
