import _ from 'lodash';
import React from 'react';

// widgets
import { SettingsPanel } from '../widgets/settings-panel.jsx';
import { DiagnosticsSection } from '../widgets/diagnostics-section.jsx';

import './code-push-panel.scss';

/**
 * Diagnostic panel displaying state of RemoteDataSource
 */
export function CodePushPanel(props) {
  const { codePush } = props;
  const { lastSyncTime, lastSyncStatus, currentPackage, pendingPackage } = codePush;

  return (
    <SettingsPanel className="code-push">
      <header>
        <i className="fasfa-gear" /> Code Push
      </header>
      <body>
        <DiagnosticsSection label="Update check">
          <div>Last check: {lastSyncTime}</div>
          <div>Result: {lastSyncStatus}</div>
        </DiagnosticsSection>
        <CodePushPackageDiagnostics label="Current package" package={currentPackage} />
        <CodePushPackageDiagnostics label="Pending package" package={pendingPackage} />
      </body>
    </SettingsPanel>
  );
}

function CodePushPackageDiagnostics(props) {
  if (!props.package) {
    return null;
  }
  let pkg = props.package;
  return (
    <DiagnosticsSection label={props.label}>
      <div>Label: {pkg.label}</div>
      <div>Description: {pkg.description}</div>
      <div>First run: {pkg.isFristRun ? 'yes' : 'no'}</div>
      <div>Mandatory: {pkg.isMandatory ? 'yes' : 'no'}</div>
      <div>Package hash: {_.truncate(pkg.packageHash, { length: 15 })}</div>
      <div>Package size: {pkg.packageSize}</div>
    </DiagnosticsSection>
  );
}
