var _ = require('lodash');

exports.match = function(table, object, criteria) {
    var matching = true;
    for (var name in criteria) {
        if (object.hasOwnProperty(name)) {
            var desiredValue = criteria[name];
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
            // if field is not in the object then
            // assume that it matches
        }
    }
    return matching;
}
