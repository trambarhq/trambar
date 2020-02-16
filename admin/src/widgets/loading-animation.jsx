import React from 'react';

import './loading-animation.scss';

function LoadingAnimation(props) {
  return (
    <div className="loading-animation">
      <div className="blocks">
        <div /><div /><div />
      </div>
    </div>
  );
}

export {
  LoadingAnimation as default,
  LoadingAnimation,
};
