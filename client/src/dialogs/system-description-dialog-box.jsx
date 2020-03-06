import _ from 'lodash';
import React from 'react';

// widgets
import { Overlay } from 'common/widgets/overlay.jsx';
import { PushButton } from '../widgets/push-button.jsx';
import { Scrollable } from '../widgets/scrollable.jsx';

import './system-description-dialog-box.scss';

/**
 * Dialog box for displaying the system description.
 */
export const SystemDescriptionDialogBox = Overlay.create((props) => {
  const { env, system, onClose } = props;
  const { t, p } = env.locale;

  return (
    <div className="system-description-dialog-box">
      {renderText()}
      {renderButtons()}
    </div>
  );

  function renderText() {
    const title = p(system?.details?.title);
    const description = p(system?.details?.description);
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
      onClick: onClose,
    };
    return (
      <div className="buttons">
        <PushButton {...closeButtonProps} />
      </div>
    );
  }
});
