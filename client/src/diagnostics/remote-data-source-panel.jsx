import _ from 'lodash';
import React from 'react';
import CodePush from 'common/transport/code-push.js';

// widgets
import { SettingsPanel } from '../widgets/settings-panel.jsx';
import { DiagnosticsSection } from '../widgets/diagnostics-section.jsx';

import './remote-data-source-panel.scss';

/**
 * Diagnostic panel displaying state of RemoteDataSource
 */
export function RemoteDataSourcePanel(props) {
  const { dataSource } = props;
  const {
    recentSearchResults,
    recentStorageResults,
    recentRemovalResults,
  } = dataSource;
  return (
    <SettingsPanel className="remote-data-source">
      <header>
        <i className="fas fa-gear" /> Remote Data Source
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

function RecentSearchTable(props) {
  const { searches } = props;
  const remoteSearches = _.filter(searches, (search) => {
    return search.schema !== 'local';
  });
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

  function renderRow(search, index) {
    let className;
    if (search.updating) {
      className = 'updating';
    } else if (search.dirty) {
      className = 'dirty';
    }
    const time = (search.duration) ? search.duration + 'ms' : '';
    const criteriaJSON1 = JSON.stringify(search.criteria, undefined, 4);
    const criteriaJSON2 = JSON.stringify(search.criteria);
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
}

function RecentStorageTable(props) {
  const { stores } = props;
  const remoteStores = _.filter(stores, (store) => {
    return store.schema !== 'local';
  });
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

  function renderRow(store, index) {
    const time = (store.duration) ? store.duration + 'ms' : '';
    const criteriaJSON1 = JSON.stringify(store.results, undefined, 4);
    const criteriaJSON2 = JSON.stringify(store.results);
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
}

const RecentRemovalTable = RecentStorageTable;

function truncateLongArray(json) {
  return json.replace(/\[([^\]]{1,50},\s*)[^\]]{50,}?(\s*)\]/g, '[$1...$2]');
}
