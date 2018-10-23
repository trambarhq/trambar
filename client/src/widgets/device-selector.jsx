import _ from 'lodash';
import React from 'react';

import './device-selector.scss';

/**
 * Stateless component that draws a drop-down menu for selecting a media
 * capture device when there're more than one (e.g. typical mobile phone
 * with front and back camera).
 */
function DeviceSelector(props) {
    let { env } = props;
    let { t } = env.locale;
    let devices = _.filter(env.devices, { kind: `${props.type}input` });
    if (devices.length < 2) {
        return null;
    }
    let frontBack = (devices.length === 2) && _.every(devices, (device) => {
        if (/front|back/i.test(device.label)) {
            return true;
        }
    });
    let options = _.map(devices, (device, index) => {
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
        let optionProps = {
            value: device.deviceID,
            selected: device.deviceID === props.selectedDeviceID,
        };
        return <option key={index} {...optionProps}>{label}</option>;
    });
    return (
        <div className="device-selector">
            <select onChange={props.onSelect}>
                {options}
            </select>
        </div>
    );
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

export {
    DeviceSelector as default,
    DeviceSelector,
};
