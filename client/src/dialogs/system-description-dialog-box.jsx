import _ from 'lodash';
import React, { useCallback } from 'react';

// widgets
import { Overlay } from 'common/widgets/overlay.jsx';
import { PushButton } from '../widgets/push-button.jsx';
import { Scrollable } from '../widgets/scrollable.jsx';

import './system-description-dialog-box.scss';

/**
 * Dialog box for displaying the system description.
 */
function SystemDescriptionDialogBox(props) {
    const { env, system, show, onClose } = props;
    const overlayProps = { show,  onBackgroundClick: handleCloseClick };
    const { t, p } = env.locale;

    const handleCloseClick = useCallback((evt) => {
        if (onClose) {
            onClose({});
        }
    });

    return (
        <Overlay {...overlayProps}>
            <div className="system-description-dialog-box">
                {renderText()}
                {renderButtons()}
            </div>
        </Overlay>
    );

    function renderText() {
        const title = p(_.get(system, 'details.title'));
        const description = p(_.get(system, 'details.description'));
        return (
            <Scrollable>
                <div className="title">{title}</div>
                <div className="description">
                    {description}
                </div>
            </Scrollable>
        );
    }

    function renderButtons() {
        const closeButtonProps = {
            label: t('project-description-close'),
            emphasized: true,
            onClick: handleCloseClick,
        };
        return (
            <div className="buttons">
                <PushButton {...closeButtonProps} />
            </div>
        );
    }
}

export {
    SystemDescriptionDialogBox as default,
    SystemDescriptionDialogBox,
};
