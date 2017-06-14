var _ = require('lodash');

exports.match = function(table, object, criteria) {
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
            if (name === 'time_range') {
                debugger;
                if (desiredValue) {
                    var times = desiredValue.substr(1, desiredValue.length - 2).split(',');
                    var start = times[0];
                    var end = times[1];
                    if (!(start <= object.ptime && object.ptime < end)) {
                        matching = false;
                    }
                }
            } else {
                // assume it matches
            }
        }
    }
    return matching;
}
