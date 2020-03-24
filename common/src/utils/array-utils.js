import union from 'lodash/union.js'
import difference from 'lodash/difference.js';
import pull from 'lodash/pull.js';
import remove from 'lodash/remove.js';
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
  for (let id of ids) {
    const object = hash[id];
    if (object) {
      results.push(object);
    }
  }
  return results;
}

function hashById(objects, f) {
  const hash = {};
  for (let object of objects) {
    hash[object.id] = (f) ? f(object) : object;
  }
  return hash;
}

export {
  difference,
  pull,
  remove,
  orderBy,
  uniq,
  uniqBy,
  sortedIndexBy,

  toggle,
  findByIds,
  hashById,
};
