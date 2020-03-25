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
  const { browserLocaleCode, localeCode, missingPhrases } = localeManager;
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
        <DiagnosticsSection label="Missing phrases" hidden={missingPhrases.length === 0}>
          {missingPhrases.map(renderMissingPhrase)}
        </DiagnosticsSection>
      </body>
    </SettingsPanel>
  );

  function renderMissingPhrase(phrase, i) {
    return <div key={i}>{phrase}</div>;
  }
}
