import { expect } from 'chai';

import {
  matchSearchCriteria,
  limitSearchResults
} from '../local-search.js';

describe('LocalSearch', function() {
  describe('#match()', function() {
    it('should match by scalar property', function() {
      const object1 = {
        a: 1,
      };
      const object2 = {
        a: 2,
      };
      const criteria = {
        a: 1,
      };
      const result1 = matchSearchCriteria('table', object1, criteria);
      const result2 = matchSearchCriteria('table', object2, criteria);
      expect(result1).to.be.true;
      expect(result2).to.be.false;
    })
    it('should match an array against a scalar property', function() {
      const object1 = {
        a: 1,
      };
      const object2 = {
        a: 2,
      };
      const criteria = {
        a: [ 1, 2, 3, 4 ]
      };
      const result1 = matchSearchCriteria('table', object1, criteria);
      const result2 = matchSearchCriteria('table', object2, criteria);
      expect(result1).to.be.true;
      expect(result2).to.be.true;
    })
    it('should match an array against an array property', function() {
      const object1 = {
        a: [ 1, 2 ],
      };
      const object2 = {
        a: [ 5, 7, 8 ],
      };
      const criteria = {
        a: [ 1, 2, 3, 4 ]
      };
      const result1 = matchSearchCriteria('table', object1, criteria);
      const result2 = matchSearchCriteria('table', object2, criteria);
      expect(result1).to.be.true;
      expect(result2).to.be.false;
    })
    it('should match an object against an object property', function() {
      const object1 = {
        a: {
          cat: 'fat',
          dog: 'stinky'
        },
      };
      const object2 = {
        a: {
          cat: 'thin',
          dog: 'smelly',
        },
      };
      const criteria = {
        a: {
          cat: 'fat',
          dog: 'stinky'
        },
      };
      const result1 = matchSearchCriteria('table', object1, criteria);
      const result2 = matchSearchCriteria('table', object2, criteria);
      expect(result1).to.be.true;
      expect(result2).to.be.false;
    })
    it('should consider missing property to be a match', function() {
      const object1 = {
        a: 1,
      };
      const object2 = {
        a: 2,
      };
      const criteria = {
        b: 'turkey'
      };
      const result1 = matchSearchCriteria('table', object1, criteria);
      const result2 = matchSearchCriteria('table', object2, criteria);
      expect(result1).to.be.true;
      expect(result2).to.be.true;
    })
    it('should exclude objects by ids', function() {
      const object1 = {
        id: 1,
      };
      const object2 = {
        id: 2,
      };
      const criteria = {
        exclude: [ 1, 3, 5, 7, 9 ]
      };
      const result1 = matchSearchCriteria('table', object1, criteria);
      const result2 = matchSearchCriteria('table', object2, criteria);
      expect(result1).to.be.false;
      expect(result2).to.be.true;
    })
    it('should match time range against ptime', function() {
      const object1 = {
        ptime: '2000-01-01T00:00:00.000Z',
      };
      const object2 = {
        ptime: '2005-01-01T00:00:00.000Z',
      };
      const object3 = {
        ptime: '2015-01-01T00:00:00.000Z',
      };
      const criteria = {
        time_range: '[2002-01-01T00:00:00.000Z,2006-01-01T00:00:00.000Z]'
      };
      const result1 = matchSearchCriteria('table', object1, criteria);
      const result2 = matchSearchCriteria('table', object2, criteria);
      const result3 = matchSearchCriteria('table', object3, criteria);
      expect(result1).to.be.false;
      expect(result2).to.be.true;
      expect(result3).to.be.false;
    })
    it('should check to see if ptime is newer', function() {
      const object1 = {
        ptime: '2000-01-01T00:00:00.000Z',
      };
      const object2 = {
        ptime: '2005-01-01T00:00:00.000Z',
      };
      const object3 = {
        ptime: '2015-01-01T00:00:00.000Z',
      };
      const criteria = {
        newer_than: '2002-01-01T00:00:00.000Z'
      };
      const result1 = matchSearchCriteria('table', object1, criteria);
      const result2 = matchSearchCriteria('table', object2, criteria);
      const result3 = matchSearchCriteria('table', object3, criteria);
      expect(result1).to.be.false;
      expect(result2).to.be.true;
      expect(result3).to.be.true;
    })
    it('should check to see if ptime is older', function() {
      const object1 = {
        ptime: '2000-01-01T00:00:00.000Z',
      };
      const object2 = {
        ptime: '2005-01-01T00:00:00.000Z',
      };
      const object3 = {
        ptime: '2015-01-01T00:00:00.000Z',
      };
      const criteria = {
        older_than: '2002-01-01T00:00:00.000Z'
      };
      const result1 = matchSearchCriteria('table', object1, criteria);
      const result2 = matchSearchCriteria('table', object2, criteria);
      const result3 = matchSearchCriteria('table', object3, criteria);
      expect(result1).to.be.true;
      expect(result2).to.be.false;
      expect(result3).to.be.false;
    })
    it('should match by multiple properties', function() {
      const object1 = {
        a: 1,
        b: 'taco'
      };
      const object2 = {
        a: 2,
        b: 'burrito'
      };
      const criteria = {
        a: [ 1, 2, 3 ],
        b: 'taco',
      };
      const result1 = matchSearchCriteria('table', object1, criteria);
      const result2 = matchSearchCriteria('table', object2, criteria);
      expect(result1).to.be.true;
      expect(result2).to.be.false;
    })
  })
  describe('#limit()', function() {
    it('should do nothing when no limit is set', function() {
      const list = [ { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 } ];
      const criteria = {};
      limitSearchResults('table', list, criteria);
      expect(list.length).to.equal(5);
    })
    it('should do nothing when no limit is not exceeded', function() {
      const list = [ { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 } ];
      const criteria = {
        limit: 10
      };
      limitSearchResults('table', list, criteria);
      expect(list.length).to.equal(5);
    })
    it('should reduce size of array from the front to fit limit', function() {
      const list = [ { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 } ];
      const criteria = {
        limit: 3
      };
      limitSearchResults('table', list, criteria);
      expect(list.length).to.equal(3);
      expect(list[0]).to.have.property('id', 3);
    })
    it('should apply limit on a per user basis', function() {
      const list = [
        { id: 1, user_id: 101 },
        { id: 2, user_id: 102 },
        { id: 3, user_id: 103 },
        { id: 4, user_id: 104 },
        { id: 5, user_id: 105 },
        { id: 6, user_id: 101 },
        { id: 7, user_id: 101 },
        { id: 8, user_id: 101 },
        { id: 9, user_id: 101 },
      ];
      const criteria = {
        per_user_limit: 2
      };
      limitSearchResults('table', list, criteria);
      expect(list.length).to.equal(6);
      expect(list[0]).to.have.property('id', 2);
      expect(list[5]).to.have.property('id', 9);
    })
    it('should apply limit on a per user basis, when objects may belong to multiple users', function() {
      const list = [
        { id: 1, user_ids: [ 101, 102 ]},
        { id: 2, user_ids: [ 102 ]},
        { id: 3, user_ids: [ 103 ]},
        { id: 4, user_ids: [ 104 ]},
        { id: 5, user_ids: [ 105 ]},
        { id: 6, user_ids: [ 101, 102 ]},
        { id: 7, user_ids: [ 101, 103 ]},
        { id: 8, user_ids: [ 101, 104 ]},
        { id: 9, user_ids: [ 101, 105 ]},
      ];
      const criteria = {
        per_user_limit: 2
      };
      limitSearchResults('table', list, criteria);
      expect(list.length).to.equal(8);
      expect(list[0]).to.have.property('id', 2);
      expect(list[7]).to.have.property('id', 9);
    })
  })
})
