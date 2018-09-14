import _ from 'lodash';
import React from 'react';

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

export {
    RecentStorageTable as default,
    RecentStorageTable,
};
