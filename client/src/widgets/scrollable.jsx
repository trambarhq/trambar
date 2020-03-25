import React from 'react';

import './scrollable.scss';

/**
 * Stateless component that renders a container with a scroll-bar
 */
export function Scrollable(props) {
  const { className, children } = props;
  const classNames = [ 'scrollable' ];
  if (className) {
    classNames.push(className);
  }
  const containerProps = {
    ...props,
    className: classNames.join(' ')
  };
  return <div {...containerProps}>{children}</div>;
}
