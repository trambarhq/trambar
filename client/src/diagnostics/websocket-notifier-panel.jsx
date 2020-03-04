import _ from 'lodash';
import React, { Component } from 'react';

// widgets
import { SettingsPanel } from '../widgets/settings-panel.jsx';
import { DiagnosticsSection } from '../widgets/diagnostics-section.jsx';

import './websocket-notifier-panel.scss';

export function WebsocketNotifierPanel(props) {
  const { notifier } = props;
  const {
    socket,
    reconnectionCount,
    notificationPermitted,
    recentMessages,
  } = notifier;
  return (
    <SettingsPanel className="websocket-notifier">
      <header>
        <i className="fasfa-gear" /> Web Socket
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

  function renderJSON(object, i) {
    return <pre key={i}>{JSON.stringify(object, undefined, 4)}</pre>;
  }
}
