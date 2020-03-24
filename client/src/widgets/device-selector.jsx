import _ from 'lodash';
import React from 'react';

import './device-selector.scss';

/**
 * Stateless component that draws a drop-down menu for selecting a media
 * capture device when there're more than one (e.g. typical mobile phone
 * with front and back camera).
 */
export function DeviceSelector(props) {
  const { env, type, onSelect } = props;
  const { t } = env.locale;
  const devices = env.devices.filter({ kind: `${type}input` });
  if (devices.length < 2) {
    return null;
  }
  const frontBack = (devices.length === 2) && _.every(devices, (device) => {
    if (/front|back/i.test(device.label)) {
      return true;
    }
  });
  return (
    <div className="device-selector">
      <select onChange={onSelect}>
        {_.map(devices, renderOption)}
      </select>
    </div>
  );

  function renderOption(device) {
    let label;
    if (props.type === 'video') {
      if (frontBack) {
        if (/front/i.test(device.label)) {
          label = t('device-selector-camera-front');
        } else {
          label = t('device-selector-camera-back');
        }
      } else {
        label = t('device-selector-camera-$number', index + 1);
      }
    } else if (type === 'audio') {
      label = t('device-selector-mic-$number', index + 1);
    }
    const optionProps = {
      value: device.deviceId,
      selected: device.deviceId === props.selectedDeviceID,
    };
    return <option key={index} {...optionProps}>{label}</option>;
  }
}

/**
 * Given a list of devices, select one that matches the indicated direction.
 *
 * @param  {Array<Object>} devices
 * @param  {String} type
 * @param  {String} descriptor
 *
 * @return {Object|undefined}
 */
DeviceSelector.choose = function(devices, type, descriptor) {
  return _.find(devices, (device) => {
    if (type === 'video' && device.kind === 'videoinput') {
      if (descriptor === 'front') {
        return /front/i.test(device.label);
      } else if (descriptor === 'back') {
        return /back/i.test(device.label);
      }
    }
  })
};
