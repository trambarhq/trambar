import React from 'react';
import { parse } from 'mark-gor';

// widgets
import { Overlay } from 'common/widgets/overlay.jsx';
import { PushButton } from '../widgets/push-button.jsx';
import { ResourceView } from 'common/widgets/resource-view.jsx';

import './app-component-dialog-box.scss';

/**
 * Dialog box for displaying the description of an app component in full.
 */
export const AppComponentDialogBox = Overlay.create((props) => {
  const { env, component, onClose } = props;
  const { t, p } = env.locale;
  if (!component) {
    return null;
  }
  return (
    <div className="app-component-dialog-box">
      <div className="contents">
        {renderPicture()}
        {renderText()}
      </div>
      {renderButtons()}
    </div>
  );

  function renderPicture() {
    if (component.image) {
      return (
        <div className="picture">
          <ResourceView resource={component.image} height={128} env={env} />
        </div>
      );
    } else {
      const icon = component.icon || {};
      const iconClass = icon.class || 'fas fa-cubes';
      const style = {
        color: icon.color,
        backgroundColor: icon.backgroundColor,
      };
      return (
        <div className="picture">
          <div className="icon" style={style}>
            <i className={`${iconClass} fa-fw`} />
          </div>
        </div>
      );
    }
  }

  function renderText() {
    const text = p(component.text);
    const elements = parse(text);
    return <div className="text">{elements}</div>;
  }

  function renderButtons() {
    const closeButtonProps = {
      label: t('app-component-close'),
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
