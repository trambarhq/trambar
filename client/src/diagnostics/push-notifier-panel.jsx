import _ from 'lodash';
import React from 'react';

// widgets
import { SettingsPanel } from '../widgets/settings-panel.jsx';
import { DiagnosticsSection } from '../widgets/diagnostics-section.jsx';

import './push-notifier-panel.scss';

function PushNotifierPanel(props) {
    const { notifier } = props;
    const {
        registrationID,
        registrationType,
        relayAddress,
        relayToken,
        recentMessages,
    } = notifier;
    const device = getDeviceDetails();
    return (
        <SettingsPanel className="push-notifier">
            <header>
                <i className="fa fa-gear" /> Push Notification
            </header>
            <body>
                <DiagnosticsSection label="Registration">
                    <div>ID: {registrationID}</div>
                    <div>Network: {registrationType}</div>
                </DiagnosticsSection>
                <DiagnosticsSection label="Push relay">
                    <div>Address: {relayAddress}</div>
                    <div>Token: {relayToken}</div>
                </DiagnosticsSection>
                <DiagnosticsSection label="Recent messages">
                   {_.map(recentMessages, renderJSON)}
                </DiagnosticsSection>
                <DiagnosticsSection label="Device">
                    <div>Manufacturer: {device.manufacturer}</div>
                    <div>Model: {device.name}</div>
                </DiagnosticsSection>
            </body>
        </SettingsPanel>
    );

    function renderJSON(object, i) {
        return <pre key={i}>{JSON.stringify(object, undefined, 4)}</pre>;
    }
}

/**
 * Return device details
 *
 * @return {Object}
 */
function getDeviceDetails() {
    const device = window.device;
    if (device) {
        return {
            manufacturer: device.manufacturer,
            name: device.model,
        };
    }
    return {};
}

export {
    PushNotifierPanel as default,
    PushNotifierPanel,
};
