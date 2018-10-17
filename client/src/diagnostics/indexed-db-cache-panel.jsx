import _ from 'lodash';
import React, { Component } from 'react';

// widgets
import SettingsPanel from 'widgets/settings-panel';
import DiagnosticsSection from 'widgets/diagnostics-section';

import './indexed-db-cache-panel.scss';

/**
 * Diagnostic panel displaying state of RemoteDataSource
 *
 * @extends Component
 */
class IndexedDBCachePanel extends Component {
    static displayName = 'IndexedDBCachePanel';

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
}

export {
    IndexedDBCachePanel as default,
    IndexedDBCachePanel,
};

import IndexedDBCache from 'data/indexed-db-cache';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    IndexedDBCachePanel.propTypes = {
        cache: PropTypes.instanceOf(IndexedDBCache),
    };
}
