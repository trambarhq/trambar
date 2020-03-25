import React from 'react';
import { useListener, useSaveBuffer } from 'relaks';
import { toggle } from 'common/utils/array-utils.js';
import { isEqual } from 'common/utils/object-utils.js';

// widgets
import { Overlay } from 'common/widgets/overlay.jsx';
import { PushButton } from '../widgets/push-button.jsx';
import { Scrollable } from '../widgets/scrollable.jsx';
import { OptionButton } from '../widgets/option-button.jsx';

import './project-management-dialog-box.scss';

/**
 * Dialog box for removing a project from the list.
 */
export const ProjectManagementDialogBox = Overlay.create((props) => {
  const { env, projectLinks, onDelete, onCancel } = props;
  const { t, p } = env.locale;
  const projectSelection = useSaveBuffer({
    original: [],
    compare: isEqual,
  });

  const handleProjectClick = useListener((evt) => {
    const key = evt.currentTarget.id;
    const newSelection = toggle(projectSelection.current, key);
    projectSelection.update(newSelection);
  });
  const handleRemoveClick = useListener((evt) => {
    if (onDelete) {
      onDelete({ selection: projectSelection.current });
    }
  });

  return (
    <div className="project-management-dialog-box">
      <Scrollable>
        {projectLinks.map(renderProjectButton)}
      </Scrollable>
      {renderButtons()}
    </div>
  );

  function renderProjectButton(link, i) {
    const props = {
      id: link.key,
      label: p(link.name),
      iconOn: 'times-circle',
      selected: projectSelection.current.includes(link.key),
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
});
