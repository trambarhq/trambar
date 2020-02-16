import { expect } from 'chai';

import * as Merger from '../merger.mjs';

describe('Merger', function() {
  describe('#mergeStrings()', function() {
    it('should take changes from both A and B', function() {
      let c = 'This is a test. This is only a test.';
      let a = 'Well, this is a test. This is only a test.';
      let b = 'This is a test. This is only a test, you bozo!';
      let expected = 'Well, this is a test. This is only a test, you bozo!';
      let actual = Merger.mergeStrings(a, b, c);
      expect(actual).to.equal(expected);
    })
  })
  describe('#mergeObjects()', function() {
    it('should take changes from A when B is unchanged', function() {
      let c = {
        id: 5,
        hello: 123
      };
      let a = _.cloneDeep(c);
      let b = _.cloneDeep(c);
      a.hello = 456;
      let d = Merger.mergeObjects(a, b, c);
      expect(d).to.have.property('hello', a.hello);
    })
    it('should take changes from B when A is unchanged', function() {
      let c = {
        id: 5,
        hello: 123
      };
      let a = _.cloneDeep(c);
      let b = _.cloneDeep(c);
      b.hello = 789;
      let d = Merger.mergeObjects(a, b, c);
      expect(d).to.have.property('hello', b.hello);
    })
    it('should take changes from B when both A and B were changed', function() {
      let c = {
        id: 5,
        hello: 123
      };
      let a = _.cloneDeep(c);
      let b = _.cloneDeep(c);
      a.hello = 456;
      b.hello = 789;
      let d = Merger.mergeObjects(a, b, c);
      expect(d).to.have.property('hello', b.hello);
    })
    it('should take changes from both A and B', function() {
      let c = {
        id: 5,
        hello: 123,
        world: 100
      };
      let a = _.cloneDeep(c);
      let b = _.cloneDeep(c);
      a.hello = 456;
      b.world = 500;
      let d = Merger.mergeObjects(a, b, c);
      expect(d).to.have.property('hello', a.hello);
      expect(d).to.have.property('world', b.world);
    })
    it('should take merge text difference between A and B', function() {
      let c = {
        id: 5,
        text: `It's the best of time. It's the worst of time.`
      };
      let a = _.cloneDeep(c);
      let b = _.cloneDeep(c);
      a.text = `It's totally awesome! It's the worst of time.`;
      b.text = `It's the best of time. It's a complete shitshow!`;
      let expected = `It's totally awesome! It's a complete shitshow!`;
      let d = Merger.mergeObjects(a, b, c);
      expect(d).to.have.property('text', expected);
    })
  })
})
