import _ from 'lodash';
import React from 'react';

import './device-selector.scss';

function DeviceSelector(props) {
    let { env, devices } = props;
    let { t } = env.locale;
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

DeviceSelector.choose = function(devices, direction) {
    return _.find(devices, (device) => {
        if (direction === 'front') {
            return /front/i.test(device.label);
        } else if (direction === 'back') {
            return /back/i.test(device.label);
        }
    })
};

export {
    DeviceSelector as default,
    DeviceSelector,
};
