import _ from 'lodash';
import React from 'react';

// widgets
import { SettingsPanel } from '../widgets/settings-panel.jsx';
import { DiagnosticsSection } from '../widgets/diagnostics-section.jsx';

import './locale-manager-panel.scss';

/**
 * Diagnostic panel displaying state of LocaleManager
 */
export function LocaleManagerPanel(props) {
  const { localeManager } = props;
  const {
    browserLocaleCode,
    localeCode,
    missingPhrases,
  } = localeManager;
  return (
    <SettingsPanel className="locale-manager">
      <header>
        <i className="fas fa-gear" /> Locale Manager
      </header>
      <body>
        <DiagnosticsSection label="Locale code">
          <div>Current: {localeCode}</div>
          <div>Browser: {browserLocaleCode}</div>
        </DiagnosticsSection>
        <DiagnosticsSection label="Missing phrases" hidden={_.isEmpty(missingPhrases)}>
          {_.map(missingPhrases, renderMissingPhrase)}
        </DiagnosticsSection>
      </body>
    </SettingsPanel>
  );

  function renderMissingPhrase(phrase) {
    return <div key={i}>{phrase}</div>;
  }
}
