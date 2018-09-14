import _ from 'lodash';

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
    let matching = true;
    for (let name in criteria) {
        let desiredValue = criteria[name];
        if (desiredValue === undefined) {
            continue;
        }
        if (object.hasOwnProperty(name)) {
            let actualValue = object[name];
            if (desiredValue instanceof Array) {
                if (actualValue instanceof Array) {
                    // array value matches an array when there's overlapping
                    // between the two
                    if (_.intersection(desiredValue, actualValue).length === 0) {
                        matching = false;
                    }
                } else {
                    // array value matches a scalar or object when the former
                    // contains the latter
                    let containing;
                    if (actualValue instanceof Object) {
                        containing = _.some(desiredValue, (desiredElement) => {
                            return _.isEqual(desiredElement, actualValue);
                        });
                    } else {
                        containing = _.includes(desiredValue, actualValue);
                    }
                    if (!containing) {
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
                        let times = desiredValue.substr(1, desiredValue.length - 2).split(',');
                        let start = times[0];
                        let end = times[1];
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
            // apply per user limit
            let limit = criteria.per_user_limit;
            let countsByUser = {};
            let excessObjects = [];
            _.eachRight(objects, (object) => {
                let keep = false;
                if (object.hasOwnProperty('user_id')) {
                    let userId = object.user_id;
                    let count = countsByUser[userId] || 0;
                    if (count < limit) {
                        countsByUser[userId] = count + 1;
                        keep = true;
                    }
                } else if (object.hasOwnProperty('user_ids')) {
                    _.each(object.user_ids, (userId) => {
                        let count = countsByUser[userId] || 0;
                        if (count < limit) {
                            countsByUser[userId] = count + 1;
                            keep = true;
                        }
                    });
                }
                if (!keep) {
                    excessObjects.push(object);
                }
            });
            _.pullAll(objects, excessObjects);
        }
    }
}

export {
    match,
    limit,
    exports as default,
};
