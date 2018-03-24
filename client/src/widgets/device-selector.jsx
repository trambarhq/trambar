var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

module.exports = DeviceSelector;

require('./device-selector.scss');

function DeviceSelector(props) {
    var t = props.locale.translate;
    var devices = props.devices;
    if (devices.length < 2) {
        return null;
    }
    var frontBack = (devices.length === 2) && _.every(devices, (device) => {
        if (/front|back/.test(device.label)) {
            return true;
        }
    });
    var options = _.map(devices, (device, index) => {
        var label;
        if (props.type === 'video') {
            if (frontBack) {
                if (/front/.test(device.label)) {
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
        var optionProps = {
            value: device.deviceId,
            selected: device.deviceId === props.selectedDeviceId,
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
