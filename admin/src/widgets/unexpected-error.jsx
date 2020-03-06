import React from 'react';

import './unexpected-error.scss';

/**
 * Stateless component that renders an error message returned by the server.
 */
export function UnexpectedError(props) {
  const { error } = props;
  if (!error || error.cancellation) {
    return null;
  }
  return (
    <div className="unexpected-error">
      <i className="fas fa-exclamation-circle" />
      {' '}
      {error.message}
    </div>
  )
}
