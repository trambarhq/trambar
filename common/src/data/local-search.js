var _ = require('lodash');

module.exports = {
    match,
}

function match(table, object, criteria) {
    var matching = true;
    for (var name in criteria) {
        var desiredValue = criteria[name];
        if (object.hasOwnProperty(name)) {
            var actualValue = object[name];
            if (desiredValue instanceof Array) {
                if (actualValue instanceof Array) {
                    if (_.intersection(desiredValue, actualValue).length === 0) {
                        matching = false;
                        break;
                    }
                } else {
                    if (!_.includes(desiredValue, actualValue)) {
                        matching = false;
                        break;
                    }
                }
            } else if (actualValue !== desiredValue) {
                if (typeof(actualValue) === 'object' && typeof(desiredValue) === 'object') {
                    if (!_.isEqual(actualValue, desiredValue)) {
                        return false;
                    }
                } else {
                    matching = false;
                }
                break;
            }
        } else {
            // if field is not in the object then check if it's a special
            // search criteria
            switch (name) {
                case 'time_range':
                    if (desiredValue) {
                        var times = desiredValue.substr(1, desiredValue.length - 2).split(',');
                        var start = times[0];
                        var end = times[1];
                        if (!(start <= object.ptime && object.ptime < end)) {
                            matching = false;
                        }
                    }
                    break;
                case 'exclude':
                    if (_.includes(desiredValue, object.id)) {
                        matching = false;
                    }
                    break;
                case 'newer_than':
                    if (object.ptime && !(object.ptime > desiredValue)) {
                        matching = false;
                    }
                    break;
                case 'older_than':
                    if (object.ptime && !(object.ptime < desiredValue)) {
                        matching = false;
                    }
                    break;
                case 'search':
                    // never match against cached records
                    matching = false;
                    break;
                default:
                    // assume it matches
            }
        }
    }
    return matching;
}
