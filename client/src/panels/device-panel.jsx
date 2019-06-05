import _ from 'lodash';
import React from 'react';
import { useListener } from 'relaks';
import { Cancellation } from 'relaks';

// widgets
import { SettingsPanel } from '../widgets/settings-panel.jsx';
import { PushButton } from '../widgets/push-button.jsx';
import { ActionConfirmation } from '../widgets/action-confirmation.jsx';

// custom hooks
import {
    useConfirmation,
} from '../hooks';

import './device-panel.scss';

/**
 * Panel listing mobile devices currently attached to the user's account.
 */
function DevicePanel(props) {
    const { database, env, devices } = props;
    const { t } = env.locale;
    const [ confirmationRef, confirm ] = useConfirmation();
    const title = t('settings-device' + (_.size(devices) !== 1 ? 's' : ''));

    const handleRevokeClick = useListener(async (evt) => {
        const deviceID = parseInt(evt.currentTarget.getAttribute('data-device-id'));
        const device = _.find(devices, { id: deviceID });

        try {
            await confirm(t('mobile-device-revoke-are-you-sure'));

            await db.removeOne({ table: 'device' }, device);
            await db.endMobileSession(device.session_handle);
        } catch (err) {
            if (!(err instanceof Cancellation)) {
                throw err;
            }
        }
    });

    return (
        <SettingsPanel className="device">
            <header>
                <i className="fa fa-tablet" /> {title}
            </header>
            <body>
                {_.map(devices, renderDevice)}
                <ActionConfirmation ref={confirmationRef} env={env} />
            </body>
        </SettingsPanel>
    );

    function renderDevice(device) {
        let deviceName = formatDeviceName(device);
        return (
            <div key={device.id} className="device-option-button selected">
                <div className="icon">
                    <DeviceIcon type={device.type} />
                </div>
                <div className="text">
                    <span className="name">{deviceName}</span>
                    <div data-device-id={device.id} className="revoke" onClick={handleRevokeClick}>
                        <i className="fa fa-ban" />
                        {' '}
                        <span>{t('mobile-device-revoke')}</span>
                    </div>
                </div>
            </div>
        );
    }
}

function DeviceIcon(props) {
    const { type } = props;
    let icon;
    switch (type) {
        case 'ios':
        case 'osx': icon = 'apple'; break;
        default: icon = type;
    }
    return (
        <div className="device-icon">
            <i className="fa fa-tablet background" />
            <i className={`fa fa-${icon} icon-overlay`} />
        </div>
    );
}

function formatDeviceName(device) {
    const manufacturer = device.details.manufacturer;
    let name = device.details.display_name || device.details.name;
    if (!_.includes(_.toLower(name), _.toLower(manufacturer))) {
        name = `${manufacturer} ${name}`;
    }
    return name;
}

export {
    DevicePanel as default,
    DevicePanel,
};
