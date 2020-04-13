import { isEqual } from '../utils/object-utils.js';

/**
 * Check if an object matches the provided criteria
 *
 * Need to keep functionality in-sync with backend
 *
 * @param  {string} table
 * @param  {Object} object
 * @param  {Object} criteria
 *
 * @return {boolean}
 */
function matchSearchCriteria(table, object, criteria) {
  let matching = true;
  for (let name in criteria) {
    const desiredValue = criteria[name];
    if (desiredValue === undefined) {
      continue;
    }
    if (object.hasOwnProperty(name)) {
      const actualValue = object[name];
      if (desiredValue instanceof Array) {
        if (actualValue instanceof Array) {
          // array value matches an array when there's overlapping
          // between the two
          if (!actualValue.some(a => matchElementOf(a, desiredValue))) {
            matching = false;
          }
        } else {
          // array value matches a scalar or object when the former
          // contains the latter
          if (!matchElementOf(actualValue, desiredValue)) {
            matching = false;
          }
        }
      } else if (actualValue !== desiredValue) {
        if (typeof(actualValue) === 'object' && typeof(desiredValue) === 'object') {
          // objects requires exact match
          // (NOTE: isMatch() might more make sense here)
          if (!isEqual(actualValue, desiredValue)) {
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
        case 'ready':
          matching = true;
          break;
        case 'time_range':
          if (desiredValue) {
            const times = desiredValue.substr(1, desiredValue.length - 2).split(',');
            const start = times[0];
            const end = times[1];
            if (!(start <= object.ptime && object.ptime < end)) {
              matching = false;
            }
          }
          break;
        case 'exclude':
          if (desiredValue instanceof Array) {
            if (desiredValue.includes(object.id)) {
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

function matchElementOf(el, array) {
  if (array instanceof Array) {
    if (el instanceof Object) {
      return array.some(other => isEqual(other, el));
    } else {
      return array.includes(el);
    }
  }
  return false;
}

function limitSearchResults(table, objects, criteria) {
  if (criteria) {
    if (criteria.limit) {
      // apply limit--trimming off objects with smaller ids
      if (objects.length > criteria.limit) {
        objects.splice(0, objects.length - criteria.limit);
      }
    }
    if (criteria.per_user_limit) {
      // apply per user limit
      const limit = criteria.per_user_limit;
      const countsByUser = {};
      const excessObjects = [];
      for (let i = objects.length - 1; i >= 0; i--) {
        const object = objects[i];
        let keep = false;
        if (object.hasOwnProperty('user_id')) {
          const userID = object.user_id;
          const count = countsByUser[userID] || 0;
          if (count < limit) {
            countsByUser[userID] = count + 1;
            keep = true;
          }
        } else if (object.hasOwnProperty('user_ids')) {
          for (let userID of object.user_ids) {
            const count = countsByUser[userID] || 0;
            if (count < limit) {
              countsByUser[userID] = count + 1;
              keep = true;
            }
          }
        }
        if (!keep) {
          excessObjects.push(object);
        }
      }
      for (let excessObject of excessObjects) {
        const index = objects.indexOf(excessObject);
        objects.splice(index, 1);
      }
    }
  }
}

export {
  matchSearchCriteria,
  limitSearchResults,
};
