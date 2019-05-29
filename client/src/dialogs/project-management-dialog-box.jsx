import _ from 'lodash';
import React from 'react';
import { useListener } from 'relaks';

// widgets
import { Overlay } from 'common/widgets/overlay.jsx';
import { PushButton } from '../widgets/push-button.jsx';
import { Scrollable } from '../widgets/scrollable.jsx';
import { OptionButton } from '../widgets/option-button.jsx';

// custom hooks
import {
    useSelectionBuffer,
} from '../hooks';

import './project-management-dialog-box.scss';

/**
 * Dialog box for removing a project from the list.
 */
function ProjectManagementDialogBox(props) {
    const { env, projectLinks, onDelete, onCancel } = props;
    const { t, p } = env.locale;
    const projectSelection = useSelectionBuffer({
        original: _.map(projectLinks, 'key')
    });

    const handleProjectClick = useListener((evt) => {
        const key = evt.currentTarget.id;
        projectSelection.toggle(key);
    });
    const handleRemoveClick = useListener((evt) => {
        if (onDelete) {
            const links = _.filter(projectLinks, (link) => {
                return projectSelection.removing(link.key);
            });
            onDelete({ selection: _.map(links, 'name') });
        }
    });

    return (
        <div className="project-management-dialog-box">
            <Scrollable>
                {_.map(projectLinks, renderProjectButton)}
            </Scrollable>
            {renderButtons()}
        </div>
    );

    function renderProjectButton(link, i) {
        const props = {
            id: link.key,
            label: p(link.name),
            iconOn: 'times-circle',
            selected: projectSelection.removing(link.key),
            onClick: handleProjectClick,
        };
        return <OptionButton key={i} {...props} />;
    }

    function renderButtons() {
        const cancelProps = {
            label: t('project-management-cancel'),
            onClick: onCancel,
        };
        const removeProps = {
            label: t('project-management-remove'),
            onClick: handleRemoveClick,
            emphasized: true,
            disabled: !projectSelection.changed,
        };
        return (
            <div className="buttons">
                <PushButton {...cancelProps} />
                <PushButton {...removeProps} />
            </div>
        );
    }
}

const component = Overlay.create(ProjectManagementDialogBox);

export {
    component as default,
    component as ProjectManagementDialogBox,
};
