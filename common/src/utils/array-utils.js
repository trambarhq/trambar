import union from 'lodash/union.js'
import difference from 'lodash/difference.js';
import pullAll from 'lodash/pull.js';
import orderBy from 'lodash/orderBy.js';
import sortedIndexBy from 'lodash/sortedIndexBy.js';
import uniq from 'lodash/uniq.js';
import uniqBy from 'lodash/uniqBy.js';

/**
 * Add an item to an array if it's not there, remove it if it is there
 *
 * @param  {Array} array
 * @param  {*} item
 *
 * @return {Array}
 */
function toggle(array, item) {
  if (!array) {
    return [];
  }
  const newArray = array.slice();
  const index = newArray.indexOf(item);
  if (index === -1) {
    newArray.push(item);
  } else {
    newArray.splice(index, 1);
  }
  return newArray;
}

function findByIds(objects, ids) {
  const hash = hashById(objects);
  const results = [];
  if (ids) {
    for (let id of ids) {
      const object = hash[id];
      if (object) {
        results.push(object);
      }
    }
  }
  return results;
}

function hashById(objects, f) {
  const hash = {};
  if (objects) {
    for (let object of objects) {
      hash[object.id] = (f) ? f(object) : object;
    }
  }
  return hash;
}

function uniqIds(ids) {
  const list = [];
  collectIds(ids, list);
  return list.sort();
}

function collectIds(ids, list) {
  for (let id of ids) {
    if (id instanceof Array) {
      collectIds(id, list);
    } else if (typeof(id) === 'number') {
      if (!list.includes(id)) {
        list.push(id);
      }
    }
  }
}

export {
  difference,
  pullAll,
  orderBy,
  uniq,
  uniqBy,
  sortedIndexBy,

  toggle,
  findByIds,
  hashById,
  uniqIds,
};
