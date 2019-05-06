import _ from 'lodash';
import React, { Component } from 'react';

// widgets
import SettingsPanel from '../widgets/settings-panel.jsx';
import DiagnosticsSection from '../widgets/diagnostics-section.jsx';

import './locale-manager-panel.scss';

/**
 * Diagnostic panel displaying state of LocaleManager
 *
 * @extends Component
 */
class LocaleManagerPanel extends Component {
    static displayName = 'LocaleManagerPanel';

    /**
     * Render diagnostics
     *
     * @return {ReactElement}
     */
    render() {
        let { localeManager } = this.props;
        let {
            browserLocaleCode,
            localeCode,
            missingPhrases,
        } = localeManager;
        return (
            <SettingsPanel className="locale-manager">
                <header>
                    <i className="fa fa-gear" /> Locale Manager
                </header>
                <body>
                    <DiagnosticsSection label="Locale code">
                        <div>Current: {localeCode}</div>
                        <div>Browser: {browserLocaleCode}</div>
                    </DiagnosticsSection>
                    <DiagnosticsSection label="Missing phrases" hidden={_.isEmpty(missingPhrases)}>
                    {
                        _.map(missingPhrases, (phrase, i) => {
                            return <div key={i}>{phrase}</div>;
                        })
                    }
                    </DiagnosticsSection>
                </body>
            </SettingsPanel>
        );
    }
}

export {
    LocaleManagerPanel as default,
    LocaleManagerPanel
};

import LocaleManager from 'common/locale/locale-manager.mjs';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    LocaleManagerPanel.propTypes = {
        localeManager: PropTypes.instanceOf(LocaleManager),
    };
}
