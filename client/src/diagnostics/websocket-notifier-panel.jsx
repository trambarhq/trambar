import _ from 'lodash';
import React, { Component } from 'react';

// widgets
import SettingsPanel from '../widgets/settings-panel.jsx';
import DiagnosticsSection from '../widgets/diagnostics-section.jsx';

import './websocket-notifier-panel.scss';

class WebsocketNotifierPanel extends Component {
    static displayName = 'WebsocketNotifierPanel';
    /**
     * Render diagnostics
     *
     * @return {ReactElement}
     */
    render() {
        let { notifier } = this.props;
        let {
            socket,
            reconnectionCount,
            notificationPermitted,
            recentMessages,
        } = notifier;
        return (
            <SettingsPanel className="websocket-notifier">
                <header>
                    <i className="fa fa-gear" /> Web Socket
                </header>
                <body>
                    <DiagnosticsSection label="Connection">
                        <div>ID: {socket ? socket.id : ''}</div>
                        <div>Socket: {socket ? 'established' : 'none'}</div>
                        <div>Reconnection count: {reconnectionCount}</div>
                        <div>Notification: {notificationPermitted ? 'permitted' : 'denied'}</div>
                    </DiagnosticsSection>
                    <DiagnosticsSection label="Recent messages">
                        {_.map(recentMessages, renderJSON)}
                    </DiagnosticsSection>
                </body>
            </SettingsPanel>
        );
    }
}

function renderJSON(object, i) {
    return <pre key={i}>{JSON.stringify(object, undefined, 4)}</pre>;
}

export {
    WebsocketNotifierPanel as default,
    WebsocketNotifierPanel,
};

import WebsocketNotifier from 'common/transport/websocket-notifier.mjs';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    WebsocketNotifierPanel.propTypes = {
        notifier: PropTypes.instanceOf(WebsocketNotifier),
    };
}
