import _ from 'lodash';
import {
  toggle,
} from './array-utils.js';
import {
  decoupleSet,
  decoupleUnset,
  decouplePush,
  shallowDiff,
} from './object-utils.js';

_.mixin({
  toggle,
  decoupleSet,
  decoupleUnset,
  decouplePush,
  shallowDiff,
});
