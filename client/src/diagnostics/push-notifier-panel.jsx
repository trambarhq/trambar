import _ from 'lodash';
import React, { Component } from 'react';

// widgets
import SettingsPanel from 'widgets/settings-panel';
import DiagnosticsSection from 'widgets/diagnostics-section';

import './push-notifier-panel.scss';

class PushNotifierPanel extends Component {
    static displayName = 'PushNotifierPanel';
    /**
     * Render diagnostics
     *
     * @return {ReactElement}
     */
    render() {
        let { notifier } = this.props;
        let {
            registrationID,
            registrationType,
            relayAddress,
            relayToken,
            recentMessages,
        } = notifier;
        let device = getDeviceDetails();
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
    }
}

/**
 * Return device details
 *
 * @return {Object}
 */
function getDeviceDetails() {
    let device = window.device;
    if (device) {
        return {
            manufacturer: device.manufacturer,
            name: device.model,
        };
    }
    return {};
}

function renderJSON(object, i) {
    return <pre key={i}>{JSON.stringify(object, undefined, 4)}</pre>;
}

export {
    PushNotifierPanel as default,
    PushNotifierPanel,
};

import PushNotifier from 'transport/push-notifier';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    PushNotifierPanel.propTypes = {
        notifier: PropTypes.instanceOf(PushNotifier),
    };
}
