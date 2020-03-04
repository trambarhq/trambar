import React from 'react';

import './duration-indicator.scss';

/**
 * A component that displays recording's duration. It shows a blinker when
 * recording is true, indicating that a device is actively capturing video
 * or audio.
 */
export function DurationIndicator(props) {
  const { duration, recording } = props;

  return (
    <div className="duration-indicator">
      <span className="duration">
        {formatDuration(duration)}
      </span>
      {renderBlinker()}
    </div>
  );

  function renderBlinker() {
    if (recording) {
      return (
        <span className="icon blinking">
          <i className="fa fa-circle"/>
        </span>
      )
    }
  }
}

function formatDuration(ms) {
  if (typeof(ms) !== 'number') {
    return '';
  }
  let seconds = ms / 1000;
  let hh = Math.floor(seconds / 3600).toString().padStart(2, '0');
  let mm = Math.floor(seconds / 60 % 60).toString().padStart(2, '0');
  let ss = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

DurationIndicator.defaultProps = {
  recording: false,
};

export {
  formatDuration,
};
