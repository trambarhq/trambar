import _ from 'lodash';
import React, { Component } from 'react';
import CodePush from 'common/transport/code-push.mjs';

// widgets
import SettingsPanel from '../widgets/settings-panel.jsx';
import DiagnosticsSection from '../widgets/diagnostics-section.jsx';

import './remote-data-source-panel.scss';

/**
 * Diagnostic panel displaying state of RemoteDataSource
 *
 * @extends Component
 */
class RemoteDataSourcePanel extends Component {
    static displayName = 'RemoteDataSourcePanel';

    /**
     * Render diagnostics
     *
     * @return {ReactElement}
     */
    render() {
        let { dataSource } = this.props;
        let {
            recentSearchResults,
            recentStorageResults,
            recentRemovalResults,
        } = dataSource;
        return (
            <SettingsPanel className="remote-data-source">
                <header>
                    <i className="fa fa-gear" /> Remote Data Source
                </header>
                <body>
                    <DiagnosticsSection label="Recent searches">
                        <RecentSearchTable searches={recentSearchResults} />
                    </DiagnosticsSection>
                    <DiagnosticsSection label="Recent storage" hidden={_.isEmpty(recentStorageResults)}>
                        <RecentStorageTable stores={recentStorageResults} />
                    </DiagnosticsSection>
                    <DiagnosticsSection label="Recent removal" hidden={_.isEmpty(recentRemovalResults)}>
                        <RecentRemovalTable stores={recentRemovalResults} />
                    </DiagnosticsSection>
                </body>
            </SettingsPanel>
        );
    }
}

function RecentSearchTable(props) {
    let remoteSearches = _.filter(props.searches, (search) => {
        return search.schema !== 'local';
    });
    let renderRow = (search, index) => {
        let className;
        if (search.updating) {
            className = 'updating';
        } else if (search.dirty) {
            className = 'dirty';
        }
        let time = (search.duration) ? search.duration + 'ms' : '';
        let criteriaJSON1 = JSON.stringify(search.criteria, undefined, 4);
        let criteriaJSON2 = JSON.stringify(search.criteria);
        return (
            <tr key={index} className={className}>
                <td className="time">{time}</td>
                <td className="schema">{search.schema}</td>
                <td className="table">{search.table}</td>
                <td className="criteria" title={truncateLongArray(criteriaJSON1)}>
                    {criteriaJSON2}
                </td>
                <td className="objects">{_.size(search.results)} ({search.lastRetrieved})</td>
                <td className="by">{_.join(search.by, ', ')}</td>
            </tr>
        );
    };
    return (
        <table className="recent-search-table">
            <thead>
                <tr>
                    <th className="time">Time</th>
                    <th className="schema">Schema</th>
                    <th className="table">Table</th>
                    <th className="criteria">Criteria</th>
                    <th className="objects">Objects (fresh)</th>
                    <th className="by">By</th>
                </tr>
            </thead>
            <tbody>
                {_.map(remoteSearches, renderRow)}
            </tbody>
        </table>
    );
}

function RecentStorageTable(props) {
    let remoteStores = _.filter(props.stores, (store) => {
        return store.schema !== 'local';
    });
    let renderRow = (store, index) => {
        let time = (store.duration) ? store.duration + 'ms' : '';
        let criteriaJSON1 = JSON.stringify(store.results, undefined, 4);
        let criteriaJSON2 = JSON.stringify(store.results);
        return (
            <tr key={index}>
                <td className="time">{time}</td>
                <td className="schema">{store.schema}</td>
                <td className="table">{store.table}</td>
                <td className="objects" title={criteriaJSON1}>
                    {criteriaJSON2}
                </td>
                <td className="by">{store.by}</td>
            </tr>
        );
    };
    return (
        <table className="recent-storage-table">
            <thead>
                <tr>
                    <th className="time">Time</th>
                    <th className="schema">Schema</th>
                    <th className="table">Table</th>
                    <th className="objects">Objects</th>
                    <th className="by">By</th>
                </tr>
            </thead>
            <tbody>
                {_.map(remoteStores, renderRow)}
            </tbody>
        </table>
    );
}

const RecentRemovalTable = RecentStorageTable;

function truncateLongArray(json) {
    return json.replace(/\[([^\]]{1,50},\s*)[^\]]{50,}?(\s*)\]/g, '[$1...$2]');
}

export {
    RemoteDataSourcePanel,
    RemoteDataSourcePanel as default,
};

import RemoteDataSource from 'common/data/remote-data-source.mjs';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    RemoteDataSourcePanel.propTypes = {
        dataSource: PropTypes.instanceOf(RemoteDataSource),
    };
}
