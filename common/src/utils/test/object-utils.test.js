import { expect } from 'chai';

import {
  decouple,
  decoupleSet,
  decouplePush,
  shallowDiff,
} from '../object-utils.js';

describe('ObjectUtils', function() {
  describe('#decouple()', function() {
    it('should clone an object shallowly, and clone the object at the specified path', function() {
      const before = {
        a: 1,
        b: {
          c: {
            value: 5
          }
        }
      };
      const after = decouple(before, 'b.c');
      after.b.c.value = 6;
      expect(before.b.c.value).to.equal(5);
    })
    it('should create sub-object as necessary', function() {
      const before = {
        a: 1,
      };
      const after = decouple(before, 'b.c');
      expect(after.b.c).to.be.an('object');
    })
    it('should use default value when object at path is missing', function() {
      const before = {
        a: 1,
      };
      const after = decouple(before, 'b.c', []);
      expect(after.b.c).to.be.an('array');
    })
  })
  describe('#decoupleSet()', function() {
    it('should decouple objects along a given path then set the property', function() {
      const before = {
        a: 1,
        b: {
          c: {
            value: 5
          }
        }
      };
      const after = decoupleSet(before, 'b.c.value', 6);
      expect(before.b.c.value).to.equal(5);
      expect(after.b.c.value).to.equal(6);
    })
  })
  describe('#decouplePush()', function() {
    it('should decouple objects along a given path then push a value', function() {
      const before = {
        a: 1,
        b: {
          c: {
            array: []
          }
        }
      };
      const after = decouplePush(before, 'b.c.array', 6, 7, 8);
      expect(before.b.c.array).to.have.lengthOf(0);
      expect(after.b.c.array).to.have.lengthOf(3);
    })
  })
  describe('#shallowDiff()', function() {
    it('should return differences of two objects, comparing shallowly', function() {
      const cat = { name: 'Garfield' }
      const a = {
        hello: 'world',
        george: 'T-bone',
        cat,
        dog: {
          name: 'Max'
        },
        turtle: {
          name: 'Glen'
        }
      };
      const b = {
        hello: 'world',
        george: 'Coco',
        cat,
        dog: {
          name: 'Wolfie'
        },
        turtle: {
          name: 'Glen'
        }
      };
      const expected = {
        george: 'T-bone',
        dog: {
          name: 'Max'
        },
        turtle: {
          name: 'Glen'
        }
      };
      const diff = shallowDiff(a, b);
      expect(diff).to.deep.equal(expected);
    })
  })
})
