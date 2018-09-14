import _ from 'lodash';
import React from 'react', PropTypes = React.PropTypes;

module.exports = RecentSearchTable;

function RecentSearchTable(props) {
    var remoteSearches = _.filter(props.searches, (search) => {
        return search.schema !== 'local';
    });
    var renderRow = (search, index) => {
        var className;
        if (search.updating) {
            className = 'updating';
        } else if (search.dirty) {
            className = 'dirty';
        }
        var time = (search.duration) ? search.duration + 'ms' : '';
        var criteriaJSON1 = JSON.stringify(search.criteria, undefined, 4);
        var criteriaJSON2 = JSON.stringify(search.criteria);
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

function truncateLongArray(json) {
    return json.replace(/\[([^\]]{1,50},\s*)[^\]]{50,}?(\s*)\]/g, '[$1...$2]');
}
