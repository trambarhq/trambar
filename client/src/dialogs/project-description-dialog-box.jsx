import _ from 'lodash';
import React, { useCallback } from 'react';

// widgets
import { Overlay } from 'common/widgets/overlay.jsx';
import { PushButton } from '../widgets/push-button.jsx';
import { ResourceView } from 'common/widgets/resource-view.jsx';
import { Scrollable } from '../widgets/scrollable.jsx';

import './project-description-dialog-box.scss';

/**
 * Dialog box for displaying a project's description in full.
 *
 * @extends PureComponent
 */
function ProjectDescriptionDialogBox(props) {
    const { env, project, show, onClose } = props;
    const { t, p } = env.locale;

    const handleCloseClick = useCallback((evt) => {
        if (onClose) {
            onClose({});
        }
    });

    const overlayProps = { show, onBackgroundClick: handleCloseClick };
    return (
        <Overlay {...overlayProps}>
            <div className="project-description-dialog-box">
                {renderText()}
                {renderButtons()}
            </div>
        </Overlay>
    );

    function renderText() {
        const { name } = project;
        const { resources, title } = project.details;
        const image = _.find(resources, { type: 'image' });
        return (
            <Scrollable>
                <div className="title">{p(title) || name}</div>
                <div className="description">
                    <div className="image">
                        <ResourceView resource={image} width={160} env={env} />
                    </div>
                    {p(project.details.description)}
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
    ProjectDescriptionDialogBox as default,
    ProjectDescriptionDialogBox,
};
