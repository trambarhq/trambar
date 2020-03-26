import { expect } from 'chai';
import { cloneDeep } from '../../utils/object-utils.js';

import {
  mergeStrings,
  mergeObjects,
} from '../merger.js';

describe('Merger', function() {
  describe('#mergeStrings()', function() {
    it('should take changes from both A and B', function() {
      const c = 'This is a test. This is only a test.';
      const a = 'Well, this is a test. This is only a test.';
      const b = 'This is a test. This is only a test, you bozo!';
      const expected = 'Well, this is a test. This is only a test, you bozo!';
      const actual = mergeStrings(a, b, c);
      expect(actual).to.equal(expected);
    })
  })
  describe('#mergeObjects()', function() {
    it('should take changes from A when B is unchanged', function() {
      const c = {
        id: 5,
        hello: 123
      };
      const a = cloneDeep(c);
      const b = cloneDeep(c);
      a.hello = 456;
      const d = mergeObjects(a, b, c);
      expect(d).to.have.property('hello', a.hello);
    })
    it('should take changes from B when A is unchanged', function() {
      const c = {
        id: 5,
        hello: 123
      };
      const a = cloneDeep(c);
      const b = cloneDeep(c);
      b.hello = 789;
      const d = mergeObjects(a, b, c);
      expect(d).to.have.property('hello', b.hello);
    })
    it('should take changes from B when both A and B were changed', function() {
      const c = {
        id: 5,
        hello: 123
      };
      const a = cloneDeep(c);
      const b = cloneDeep(c);
      a.hello = 456;
      b.hello = 789;
      const d = mergeObjects(a, b, c);
      expect(d).to.have.property('hello', b.hello);
    })
    it('should take changes from both A and B', function() {
      const c = {
        id: 5,
        hello: 123,
        world: 100
      };
      const a = cloneDeep(c);
      const b = cloneDeep(c);
      a.hello = 456;
      b.world = 500;
      const d = mergeObjects(a, b, c);
      expect(d).to.have.property('hello', a.hello);
      expect(d).to.have.property('world', b.world);
    })
    it('should merge text difference between A and B', function() {
      const c = {
        id: 5,
        text: `It's the best of time. It's the worst of time.`
      };
      const a = cloneDeep(c);
      const b = cloneDeep(c);
      a.text = `It's totally awesome! It's the worst of time.`;
      b.text = `It's the best of time. It's a complete shitshow!`;
      const expected = `It's totally awesome! It's a complete shitshow!`;
      const d = mergeObjects(a, b, c);
      expect(d).to.have.property('text', expected);
    })
  })
})
