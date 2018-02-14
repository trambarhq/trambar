var _ = require('lodash');

module.exports = {
    match,
    limit,
};

/**
 * Check if an object matches the provided criteria
 *
 * Need to keep functionality in-sync with backend
 *
 * @param  {String} table
 * @param  {Object} object
 * @param  {Object} criteria
 *
 * @return {Boolean}
 */
function match(table, object, criteria) {
    var matching = true;
    for (var name in criteria) {
        var desiredValue = criteria[name];
        if (desiredValue === undefined) {
            continue;
        }
        if (object.hasOwnProperty(name)) {
            var actualValue = object[name];
            if (desiredValue instanceof Array) {
                if (actualValue instanceof Array) {
                    // array value matches an array when there's overlapping
                    // between the two
                    if (_.intersection(desiredValue, actualValue).length === 0) {
                        matching = false;
                    }
                } else {
                    // array value matches a scalar when the former contains
                    // the latter
                    if (!_.includes(desiredValue, actualValue)) {
                        matching = false;
                    }
                }
            } else if (actualValue !== desiredValue) {
                if (typeof(actualValue) === 'object' && typeof(desiredValue) === 'object') {
                    // objects requires exact match
                    // (NOTE: _.isMatch() might more make sense here)
                    if (!_.isEqual(actualValue, desiredValue)) {
                        matching = false;
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
                    if (desiredValue instanceof Array) {
                        if (_.includes(desiredValue, object.id)) {
                            matching = false;
                        }
                    } else {
                        if (desiredValue === object.id) {
                            matching = false;
                        }
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
                    // TODO: check usage to see if this is sensible
                    matching = false;
                    break;
                default:
                    // assume it matches
            }
        }
        if (!matching) {
            break;
        }
    }
    return matching;
}

function limit(table, objects, criteria) {
    if (criteria) {
        if (criteria.limit) {
            // apply limit--trimming off objects with smaller ids
            if (objects.length > criteria.limit) {
                objects.splice(0, objects.length - criteria.limit);
            }
        }
        if (criteria.per_user_limit) {
            var objectsByUser = _.groupBy(objects, 'user_id');
            _.each(objectsByUser, (list) => {
                if (list.length > criteria.per_user_limit) {
                    var count = list.length - criteria.per_user_limit;
                    for (var i = 0; i < list.length; i++) {
                        var index = objects.indexOf(list[0]);
                        objects.splice(index, 1);
                    }
                }
            });
        }
    }
}
