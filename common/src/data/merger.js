import { diffSentences } from 'diff';
import { isEqual, cloneDeep } from '../utils/object-utils.js';

function mergeObjects(a, b, c, resolveFns) {
  const d = {};
  const keys = Object.keys(a);
  for (let keyB of Object.keys(b)) {
    if (keys.includes(keyB)) {
      keys.push(keyB);
    }
  }
  for (let key of keys) {
    const valueA = a?.[key];
    const valueB = b?.[key];
    const valueC = c?.[key];
    let valueD;
    if (isEqual(valueA, valueB)) {
      valueD = cloneDeep(valueA);
    } else if (isEqual(valueA, valueC)) {
      // not changed in A, use B
      valueD = cloneDeep(valueB);
    } else if (isEqual(valueB, valueC)) {
      // not changed in B, use A
      valueD = cloneDeep(valueA);
    } else {
      // conflict
      const resolve = resolveFns?.[key];
      if (valueA instanceof Object && valueB instanceof Object) {
        valueD = mergeObjects(valueA, valueB, valueC, resolve);
      } else if (typeof(valueA) === 'string' || typeof(valueB) === 'string') {
        valueD = mergeStrings(valueA, valueB, valueC);
      } else {
        if (typeof(resolve) === 'function') {
          // use resolve function if there's one
          valueD = resolve(valueA, valueB, valueC);
        } else {
          // favor B when conflicts can't be merged
          valueD = valueB;
        }
      }
    }
    if (valueD !== undefined) {
      d[key] = valueD;
    }
  }
  return d;
}

function mergeStrings(a, b, c) {
  if (typeof(a) !== 'string') {
    a = '';
  }
  if (typeof(b) !== 'string') {
    b = '';
  }
  if (typeof(c) !== 'string') {
    c = '';
  }
  const diff = diffSentences(a, b);
  const unchangedB = getUnchangedRanges(c, b);
  const segments = [];
  for (let i = 0; i < diff.length; i++) {
    let snippet = diff[i];
    if (snippet.removed) {
      let a = snippet.value, b = '';
      if (diff[i + 1] && diff[i + 1].added) {
        // if the next item is an add, then it's a replace operation
        b = diff[i + 1].value;
        i++;
      }
      segments.push({ a, b });
    } else if (snippet.added) {
      let a = '', b = snippet.value;
      segments.push({ a, b });
    } else {
      segments.push(snippet.value);
    }
  }
  let indexA = 0;
  let indexB = 0;
  let chosen = [];
  for (let i = 0; i < segments.length; i++) {
    let segment = segments[i];
    if (typeof(segment) === 'string') {
      // same in both
      chosen.push(segment);
      indexA += segment.length;
      indexB += segment.length;
    } else {
      // choose A if segment B holds unchanged text; choose B otherwise
      if (inRanges(indexB, segment.b.length, unchangedB)) {
        chosen.push(segment.a);
      } else {
        chosen.push(segment.b);
      }
      indexA += segment.a.length;
      indexB += segment.b.length;
    }
  }
  return chosen.join('');
}

function getUnchangedRanges(before, after) {
  const ranges = [];
  const diff = diffSentences(before, after);
  let indexAfter = 0;
  let indexBefore = 0;
  for (let i = 0; i < diff.length; i++) {
    const snippet = diff[i];
    const len = snippet.value.length;
    if (snippet.removed) {
      indexBefore += len;
    } else if (snippet.added) {
      indexAfter += len;
    } else {
      ranges.push({
        index: indexAfter,
        length: len,
      });
      indexBefore += len;
      indexAfter += len;
    }
  }
  return ranges;
}

function inRanges(index, length, ranges) {
  for (let i = 0; i < ranges.length; i++) {
    let range = ranges[i];
    if (range.index <= index && index + length <= range.index + range.length) {
      return true;
    }
  }
  return false;
}

function isObject(v) {
  return typeof(v) === 'object' && v.constructor === Object;
}

export {
  mergeObjects,
  mergeStrings,
};
