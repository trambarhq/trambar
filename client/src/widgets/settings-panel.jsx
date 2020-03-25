import React from 'react';

import './settings-panel.scss';

/**
 * Component that renders a settings panel's outer frame.
 */
export function SettingsPanel(props) {
  const { className, children } = props;
  const classNames = [ 'settings-panel' ];
  if (className) {
    classNames.push(className);
  }
  const childList = React.Children.toArray(children);

  return (
    <div className={classNames.join(' ')}>
      {renderPart('header')}
      {renderPart('subheader')}
      {renderPart('body')}
      {renderPart('footer')}
    </div>
  );

  function renderPart(tag) {
    const element = children.find(el => el.type === tag);
    if (!element) {
      return null;
    }
    return (
      <div className={tag} {...element.props}>
        {element.props.children}
      </div>
    );
  }
}
