import _ from 'lodash';
import React, { Component } from 'react';

// widgets
import SettingsPanel from '../widgets/settings-panel.jsx';
import DiagnosticsSection from '../widgets/diagnostics-section.jsx';

import './sqlite-cache-panel.scss';

/**
 * Diagnostic panel displaying state of RemoteDataSource
 *
 * @extends Component
 */
class SQLiteCachePanel extends Component {
    static displayName = 'SQLiteCachePanel';

    /**
     * Render diagnostics
     *
     * @return {ReactElement}
     */
    render() {
        let { cache } = this.props;
        let {
            options,
            recordCounts,
            writeCount,
            readCount,
            deleteCount,
        } = cache;
        let localRowCount = _.get(recordCounts, 'local-data');
        let remoteRowCount = _.get(recordCounts, 'remote-data');
        return (
            <SettingsPanel className="sqlite-cache">
                <header>
                    <i className="fa fa-gear" /> SQLite Cache
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
}

export {
    SQLiteCachePanel as default,
    SQLiteCachePanel,
};

import SQLiteCache from 'common/data/sqlite-cache.mjs';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    SQLiteCachePanel.propTypes = {
        cache: PropTypes.instanceOf(SQLiteCache),
    };
}
