import _ from 'lodash';
import React from 'react';

// widgets
import { Overlay } from 'common/widgets/overlay.jsx';
import { PushButton } from '../widgets/push-button.jsx';
import { ResourceView } from 'common/widgets/resource-view.jsx';
import { Scrollable } from '../widgets/scrollable.jsx';

import './project-description-dialog-box.scss';

/**
 * Dialog box for displaying a project's description in full.
 */
function ProjectDescriptionDialogBox(props) {
  const { env, project, onClose } = props;
  const { t, p } = env.locale;

  return (
    <div className="project-description-dialog-box">
      {renderText()}
      {renderButtons()}
    </div>
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
      onClick: onClose,
    };
    return (
      <div className="buttons">
        <PushButton {...closeButtonProps} />
      </div>
    );
  }
}

const component = Overlay.create(ProjectDescriptionDialogBox);

export {
  component as default,
  component as ProjectDescriptionDialogBox,
};
