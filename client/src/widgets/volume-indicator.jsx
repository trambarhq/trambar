import React from 'react';

import './volume-indicator.scss';

/**
 * A component that shows volume of audio from microphone
 */
export function VolumeIndicator(props) {
  const { type, volume, recording } = props;

  if (type === 'bar') {
    return renderBar();
  } else if (type === 'gauge') {
    return renderGauge();
  }

  function renderBar() {
    const classNames = [ 'volume-bar' ];
    if (recording) {
      classNames.push('recording');
    }
    const style = {
      width: (volume || 0) + '%'
    };
    return (
      <div className="volume-indicator bar">
        {renderIcon()}
        <div className="volume-bar-frame">
          <div className={classNames.join(' ')} style={style} />
        </div>
      </div>
    );
  }

  function renderGauge() {
    const angle = Math.round(volume * 180 / 100);
    const transform = `rotate(${angle}deg)`;
    const style = {
      WebkitTransform: transform,
      MozTransform: transform,
      transform: transform,
      color: 'red',
    };
    return (
      <div className="volume-indicator gauge">
        <div className="mask">
        	   <div className="semi-circle" />
        	   <div className="semi-circle-mask" style={style} />
        </div>
        {renderIcon()}
      </div>
    );
  }

  function renderIcon() {
    const classNames = [ 'fas' ];
    if (volume > 40) {
      classNames.push('fa-volume-up');
    } else if (volume > 10) {
      classNames.push('fa-volume-down');
    } else {
      classNames.push('fa-volume-off');
    }
    return <i className={classNames.join(' ')} />;
  }
}

VolumeIndicator.defaultProps = {
  type: 'bar',
  recording: false,
};
