import { pull, remove } from 'lodash';

/**
 * Add an item to an array if it's not there, remove it if it is there
 *
 * @param  {Array} array
 * @param  {*} item
 *
 * @return {Array}
 */
function toggle(array, item) {
  const newArray = array.slice();
  const index = newArray.indexOf(item);
  if (index === -1) {
    newArray.push(item);
  } else {
    newArray.splice(index, 1);
  }
  return newArray;
}

export {
  pull,
  remove,
  toggle,
};
