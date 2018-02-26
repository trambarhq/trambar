var _ = require('lodash');
var Chai = require('chai'), expect = Chai.expect;

var LocalSearch = require('data/local-search');

describe('LocalSearch', function() {
    describe('#match()', function() {
        it('should match by scalar property', function() {
            var object1 = {
                a: 1,
            };
            var object2 = {
                a: 2,
            };
            var criteria = {
                a: 1,
            };
            var result1 = LocalSearch.match('table', object1, criteria);
            var result2 = LocalSearch.match('table', object2, criteria);
            expect(result1).to.be.true;
            expect(result2).to.be.false;
        })
        it('should match an array against a scalar property', function() {
            var object1 = {
                a: 1,
            };
            var object2 = {
                a: 2,
            };
            var criteria = {
                a: [ 1, 2, 3, 4 ]
            };
            var result1 = LocalSearch.match('table', object1, criteria);
            var result2 = LocalSearch.match('table', object2, criteria);
            expect(result1).to.be.true;
            expect(result2).to.be.true;
        })
        it('should match an array against an array property', function() {
            var object1 = {
                a: [ 1, 2 ],
            };
            var object2 = {
                a: [ 5, 7, 8 ],
            };
            var criteria = {
                a: [ 1, 2, 3, 4 ]
            };
            var result1 = LocalSearch.match('table', object1, criteria);
            var result2 = LocalSearch.match('table', object2, criteria);
            expect(result1).to.be.true;
            expect(result2).to.be.false;
        })
        it('should match an object against an object property', function() {
            var object1 = {
                a: {
                    cat: 'fat',
                    dog: 'stinky'
                },
            };
            var object2 = {
                a: {
                    cat: 'thin',
                    dog: 'smelly',
                },
            };
            var criteria = {
                a: {
                    cat: 'fat',
                    dog: 'stinky'
                },
            };
            var result1 = LocalSearch.match('table', object1, criteria);
            var result2 = LocalSearch.match('table', object2, criteria);
            expect(result1).to.be.true;
            expect(result2).to.be.false;
        })
        it('should consider missing property to be a match', function() {
            var object1 = {
                a: 1,
            };
            var object2 = {
                a: 2,
            };
            var criteria = {
                b: 'turkey'
            };
            var result1 = LocalSearch.match('table', object1, criteria);
            var result2 = LocalSearch.match('table', object2, criteria);
            expect(result1).to.be.true;
            expect(result2).to.be.true;
        })
        it('should exclude objects by ids', function() {
            var object1 = {
                id: 1,
            };
            var object2 = {
                id: 2,
            };
            var criteria = {
                exclude: [ 1, 3, 5, 7, 9 ]
            };
            var result1 = LocalSearch.match('table', object1, criteria);
            var result2 = LocalSearch.match('table', object2, criteria);
            expect(result1).to.be.false;
            expect(result2).to.be.true;
        })
        it('should match time range against ptime', function() {
            var object1 = {
                ptime: '2000-01-01T00:00:00.000Z',
            };
            var object2 = {
                ptime: '2005-01-01T00:00:00.000Z',
            };
            var object3 = {
                ptime: '2015-01-01T00:00:00.000Z',
            };
            var criteria = {
                time_range: '[2002-01-01T00:00:00.000Z,2006-01-01T00:00:00.000Z]'
            };
            var result1 = LocalSearch.match('table', object1, criteria);
            var result2 = LocalSearch.match('table', object2, criteria);
            var result3 = LocalSearch.match('table', object3, criteria);
            expect(result1).to.be.false;
            expect(result2).to.be.true;
            expect(result3).to.be.false;
        })
        it('should check to see if ptime is newer', function() {
            var object1 = {
                ptime: '2000-01-01T00:00:00.000Z',
            };
            var object2 = {
                ptime: '2005-01-01T00:00:00.000Z',
            };
            var object3 = {
                ptime: '2015-01-01T00:00:00.000Z',
            };
            var criteria = {
                newer_than: '2002-01-01T00:00:00.000Z'
            };
            var result1 = LocalSearch.match('table', object1, criteria);
            var result2 = LocalSearch.match('table', object2, criteria);
            var result3 = LocalSearch.match('table', object3, criteria);
            expect(result1).to.be.false;
            expect(result2).to.be.true;
            expect(result3).to.be.true;
        })
        it('should check to see if ptime is older', function() {
            var object1 = {
                ptime: '2000-01-01T00:00:00.000Z',
            };
            var object2 = {
                ptime: '2005-01-01T00:00:00.000Z',
            };
            var object3 = {
                ptime: '2015-01-01T00:00:00.000Z',
            };
            var criteria = {
                older_than: '2002-01-01T00:00:00.000Z'
            };
            var result1 = LocalSearch.match('table', object1, criteria);
            var result2 = LocalSearch.match('table', object2, criteria);
            var result3 = LocalSearch.match('table', object3, criteria);
            expect(result1).to.be.true;
            expect(result2).to.be.false;
            expect(result3).to.be.false;
        })
        it('should match by multiple properties', function() {
            var object1 = {
                a: 1,
                b: 'taco'
            };
            var object2 = {
                a: 2,
                b: 'burrito'
            };
            var criteria = {
                a: [ 1, 2, 3 ],
                b: 'taco',
            };
            var result1 = LocalSearch.match('table', object1, criteria);
            var result2 = LocalSearch.match('table', object2, criteria);
            expect(result1).to.be.true;
            expect(result2).to.be.false;
        })
    })
    describe('#limit()', function() {
        it('should do nothing when no limit is set', function() {
            var list = [ { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 } ];
            var criteria = {};
            LocalSearch.limit('table', list, criteria);
            expect(list.length).to.equal(5);
        })
        it('should do nothing when no limit is not exceeded', function() {
            var list = [ { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 } ];
            var criteria = {
                limit: 10
            };
            LocalSearch.limit('table', list, criteria);
            expect(list.length).to.equal(5);
        })
        it('should reduce size of array from the front to fit limit', function() {
            var list = [ { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 } ];
            var criteria = {
                limit: 3
            };
            LocalSearch.limit('table', list, criteria);
            expect(list.length).to.equal(3);
            expect(_.first(list)).to.have.property('id', 3);
        })
        it('should apply limit on a per user basis', function() {
            var list = [
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
            var criteria = {
                per_user_limit: 2
            };
            LocalSearch.limit('table', list, criteria);
            expect(list.length).to.equal(6);
            expect(_.first(list)).to.have.property('id', 2);
            expect(_.last(list)).to.have.property('id', 9);
        })
        it('should apply limit on a per user basis, when objects may belong to multiple users', function() {
            var list = [
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
            var criteria = {
                per_user_limit: 2
            };
            LocalSearch.limit('table', list, criteria);
            expect(list.length).to.equal(8);
            expect(_.first(list)).to.have.property('id', 2);
            expect(_.last(list)).to.have.property('id', 9);
        })
    })
})
