import _ from 'lodash';
import React from 'react';
import { useListener } from 'relaks';
import { parse } from 'mark-gor/react';

// widgets
import { ResourceView } from 'common/widgets/resource-view.jsx';

import './app-component.scss';

/**
 * Widget for displaying component description.
 */
export function AppComponent(props) {
  const { env, component, onSelect } = props;
  const { p } = env.locale;

  const handleClick = useListener((evt) => {
    if (onSelect) {
      onSelect({ component });
    }
  });

  return (
    <div className="app-component" onClick={handleClick}>
      {renderPicture()}
      {renderText()}
    </div>
  );

  function renderPicture() {
    if (component.image) {
      return (
        <div className="picture">
          <ResourceView resource={component.image} height={64} env={env} />
        </div>
      );
    } else {
      const icon = component.icon || {};
      const iconClassName = icon.class || 'fa-cubes';
      const style = {
        color: icon.color,
        backgroundColor: icon.backgroundColor,
      };
      return (
        <div className="picture">
          <div className="icon" style={style}>
            <i className={`fa fa-fw ${iconClassName}`} />
          </div>
        </div>
      );
    }
  }

  function renderText() {
    const { text } = component;
    const elements = parse(p(text));
    return (
      <div className="description">
        <div className="description-contents">
          {elements}
          <div className="ellipsis">
            <i className="fasfa-ellipsis-h" />
          </div>
        </div>
      </div>
    );
  }
}
