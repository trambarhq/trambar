import React from 'react';

import './unexpected-error.scss';

/**
 * Stateless component that renders an error message returned by the server.
 */
function UnexpectedError(props) {
  const { error } = props;
  if (!error || error.cancellation) {
    return null;
  }
  return (
    <div className="unexpected-error">
      <i className="fasfa-exclamation-circle" />
      {' '}
      {error.message}
    </div>
  )
}

export {
  UnexpectedError as default,
  UnexpectedError,
};
