var _ = require('lodash');

exports.match = function(table, object, criteria) {
    var matching = true;
    for (var name in criteria) {
        if (object.hasOwnProperty(name)) {
            var desiredValue = criteria[name];
            var actualValue = object[name];
            if (desiredValue instanceof Array) {
                if (actualValue instanceof Array) {
                    if (_.intersect(desiredValue, actualValue).length === 0) {
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
                matching = false;
                break;
            }
        } else {
            // if field is not in the object then
            // assume that it matches
        }
    }
    return matching;
}
