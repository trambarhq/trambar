import React from 'react';

// widgets
import { SettingsPanel } from '../widgets/settings-panel.jsx';
import { DiagnosticsSection } from '../widgets/diagnostics-section.jsx';

import './environment-monitor-panel.scss';

/**
 * Diagnostic panel displaying state of EnvironmentMonitor
 */
function EnvironmentMonitorPanel(props) {
  const { envMonitor } = props;
  const {
    online,
    os,
    connectionType,
    battery,
    screenWidth,
    screenHeight,
    viewportWidth,
    viewportHeight,
    devicePixelRatio,
    pointingDevice,
    webpSupport,
    browser,
    date,
  } = envMonitor;
  return (
    <SettingsPanel className="env-monitor">
      <header>
        <i className="fa fa-gear" /> Environment
      </header>
      <body>
        <DiagnosticsSection label="Connectivity">
          <div>Online: {online ? 'yes' : 'no'}</div>
          <div>Type: {connectionType}</div>
        </DiagnosticsSection>
        <DiagnosticsSection label="Display">
          <div>Screen width: {screenWidth}</div>
          <div>Screen height: {screenHeight}</div>
          <div>Viewport width: {viewportWidth}</div>
          <div>Viewport height: {viewportHeight}</div>
          <div>Device pixel ratio: {devicePixelRatio}</div>
          <div>Pointing device: {pointingDevice}</div>
        </DiagnosticsSection>
        <DiagnosticsSection label="Browser">
          <div>Type: {browser}</div>
          <div>OS: {os}</div>
          <div>WebP support: {webpSupport ? 'yes' : 'no'}</div>
        </DiagnosticsSection>
        <DiagnosticsSection label="Battery">
          <div>Charging: {battery.charging ? 'yes' : 'no'}</div>
          <div>Level: {Math.floor(battery.level * 100)}%</div>
        </DiagnosticsSection>
        <DiagnosticsSection label="Date">
          <div>Today: {date}</div>
        </DiagnosticsSection>
      </body>
    </SettingsPanel>
  );
}

export {
  EnvironmentMonitorPanel as default,
  EnvironmentMonitorPanel
};
