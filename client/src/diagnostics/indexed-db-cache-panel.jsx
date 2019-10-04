import _ from 'lodash';
import React from 'react';

// widgets
import { SettingsPanel } from '../widgets/settings-panel.jsx';
import { DiagnosticsSection } from '../widgets/diagnostics-section.jsx';

import './indexed-db-cache-panel.scss';

/**
 * Diagnostic panel displaying state of RemoteDataSource
 */
function IndexedDBCachePanel(props) {
    const { cache } = props;
    const {
        options,
        recordCounts,
        writeCount,
        readCount,
        deleteCount,
    } = cache;
    const localRowCount = recordCounts?.['local-data'];
    const remoteRowCount = recordCounts?.['remote-data'];
    return (
        <SettingsPanel className="indexed-db-cache">
            <header>
                <i className="fa fa-gear" /> IndexedDB Cache
            </header>
            <body>
                <DiagnosticsSection label="Database details">
                    <div>Name: {options.databaseName}</div>
                </DiagnosticsSection>
                <DiagnosticsSection label="Usage">
                    <div>Local objects: {localRowCount}</div>
                    <div>Remote objects: {remoteRowCount}</div>
                    <div>Objects read: {readCount}</div>
                    <div>Objects written: {writeCount}</div>
                    <div>Objects deleted: {deleteCount}</div>
                </DiagnosticsSection>
            </body>
        </SettingsPanel>
    );
}

export {
    IndexedDBCachePanel as default,
    IndexedDBCachePanel,
};
