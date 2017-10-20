var _ = require('lodash');
var React = require('react');
var ListParser = require('utils/list-parser');

exports.parseSurvey = parseSurvey;
exports.parseSurveyResults = parseSurveyResults;
exports.parseTaskList = parseTaskList;

function parseSurvey(text, answers, onChange) {
    var listTokens = ListParser.extract(text);
    return _.map(listTokens, (listToken, index) => {
        if (listToken instanceof Array) {
            return _.map(listToken, (item, key) => {
                var checked = item.checked;
                if (answers) {
                    // override radio-button state indicated in text
                    // with set-but-not-yet-saved value
                    var answer = answers[item.list];
                    if (answer !== undefined) {
                        checked = (item.key == answer);
                    }
                }
                return (
                    <span>
                        {item.before}
                        <label>
                            <input type="radio" name={item.list} value={item.key} checked={checked} readOnly={!onChange} onChange={onChange} />
                            {item.between}
                            {item.label}
                        </label>
                        {item.after}
                    </span>
                );
            });
        } else {
            // regular text
            return listToken;
        }
    });
}

function parseSurveyResults(text, voteCounts) {
    var listTokens = ListParser.extract(text);
    return _.map(listTokens, (listToken, index) => {
        if (listToken instanceof Array) {
            return _.map(listToken, (item, key) => {
                var tally = voteCounts[item.list];
                var total = _.get(tally, 'total', 0);
                var count = _.get(tally, [ 'answers', item.key ], 0);
                var percent = Math.round((total > 0) ? count / total * 100 : 0) + '%';
                return (
                    <span>
                        {item.before}
                        <span className="vote-count">
                            <span className="label">{item.label}</span>
                            <span className="bar">
                                <span className="filled" style={{ width: percent }} />
                                <span className="percent">{percent}</span>
                                <span className="count">{count + '/' + total}</span>
                            </span>
                        </span>
                        {item.after}
                    </span>
                );
            });
        } else {
            // regular text
            return listToken;
        }
    });
}

function parseTaskList(text, answers, onChange) {
    var listTokens = ListParser.extract(text);
    return _.map(listTokens, (listToken, index) => {
        if (listToken instanceof Array) {
            return _.map(listToken, (item, key) => {
                var checked = item.checked;
                if (answers) {
                    // override checkbox/radio-button state indicated in text
                    // with set-but-not-yet-saved value
                    var answer = answers[item.list];
                    if (answer !== undefined) {
                        var selected = answer[item.key];
                        if (selected !== undefined) {
                            checked = selected;
                        }
                    }
                }
                return (
                    <span>
                        {item.before}
                        <label>
                            <input type="checkbox" name={item.list} value={item.key} checked={checked} readOnly={!onChange} onChange={onChange} />
                            {item.between}
                            {item.label}
                        </label>
                        {item.after}
                    </span>
                );
            });
        } else {
            // regular text
            return listToken;
        }
    });
}
