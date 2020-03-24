import clone from 'lodash/clone.js'
import cloneDeep from 'lodash/cloneDeep.js';
import get from 'lodash/get.js';
import set from 'lodash/set.js';
import unset from 'lodash/unset.js';
import isEmpty from 'lodash/isEmpty.js';
import isEqual from 'lodash/isEqual.js';
import isMatch from 'lodash/isMatch.js';

const emptyObject = {};

/**
 * Clone objects along path to parent, then set property
 *
 * @param  {Object} srcObj
 * @param  {String|Array<String>} path
 * @param  {*} value
 *
 * @return {Object}
 */
function decoupleSet(srcObj, path, value) {
  const npath = normalizePath(path);
  const parentPath = npath.slice(0, -1);
  const dstObj = decouple(srcObj, parentPath, {});
  set(dstObj, npath, value);
  return dstObj;
}

/**
 * Clone objects along path to parent, then unset property
 *
 * @param  {Object} srcObj
 * @param  {String|Array<String>} path
 *
 * @return {Object}
 */
function decoupleUnset(srcObj, path) {
  const npath = normalizePath(path);
  const parentPath = npath.slice(0, -1);
  const dstObj = decouple(srcObj, parentPath, {});
  unset(dstObj, npath);
  return dstObj;
}

/**
 * Clone objects along path, then push value into targetted array
 *
 * @param  {Object} srcObj
 * @param  {String|Array<String>} path
 * @param  {*} ...value
 *
 * @return {Object}
 */
function decouplePush(srcObj, path, ...values) {
  const npath = normalizePath(path);
  const dstObj = decouple(srcObj, npath, []);
  const array = get(dstObj, npath);
  for (let value of values) {
    array.push(value);
  }
  return dstObj;
}

/**
 * Return properties in objA that are different in objB
 *
 * @param  {Object} objA
 * @param  {Object} objB
 *
 * @return {Object}
 */
function shallowDiff(objA, objB) {
  const result = {};
  for (let [ name, value ] of Object.entries(objA)) {
    if (value !== objB[name]) {
      result[name] = value;
    }
  }
  return result;
}

/**
 * Clone objects along a path
 *
 * @param  {Object} srcObj
 * @param  {String|Array<String>} path
 * @param  {Object} defaultValue
 *
 * @return {Object}
 */
function decouple(srcObj, path, defaultValue) {
  const npath = normalizePath(path);
  if (!defaultValue) {
    defaultValue = emptyObject;
  }
  const dstObj = clone(srcObj);
  if (!(dstObj instanceof Object)) {
    dstObj = {};
  }
  let dstParent = dstObj;
  let srcParent = srcObj;
  for (let [ index, key ] of npath.entries()) {
    const srcChild = srcParent ? srcParent[key] : undefined;
    let dstChild = clone(srcChild);
    if (index === npath.length - 1) {
      // make sure the node at the end of the path matches the type
      // of the default value
      if (!(dstChild instanceof defaultValue.constructor)) {
        dstChild = defaultValue;
      }
    } else {
      if (!(dstChild instanceof Object)) {
        dstChild = {};
      }
    }
    dstParent[key] = dstChild;
    dstParent = dstChild;
    srcParent = srcChild;
  }
  return dstObj;
}

/**
 * Ensure that an object path is an array
 *
 * @param  {String|Number|Array} path
 *
 * @return {Array}
 */
function normalizePath(path) {
  if (typeof(path) === 'string') {
    path = path.split('.');
  } else if (!(path instanceof Array)) {
    path = [ path ];
  }
  return path;
}

export {
  clone,
  cloneDeep,
  get,
  set,
  unset,
  isEmpty,
  isEqual,
  isMatch,
  decouple,
  decoupleSet,
  decoupleUnset,
  decouplePush,
  shallowDiff,
};
