var Chai = require('chai'), expect = Chai.expect;

var Runtime = require('../runtime');

function initPLV8() {
    var stmts = [];
    global.plv8 = {
        execute: function(sql) {
            // mimick failure in Postgres when notification is too long
            if (sql.length > 1000) {
                throw new Error('Too long');
            }
            stmts.push(sql);
            if (/RETURNING/.test(sql)) {
                return [{ id: 1234 }];
            }
        },
        quote_literal: function(s) {
            return s.replace(/'/g, "''");
        },
    };
    return stmts;
}

describe('Runtime', () => {
    describe('#isEqual()', () => {
        it('should return true when two scalars are the same', () => {
            var a = 99;
            var b = 99;
            expect(Runtime.isEqual(a, b)).to.equal(true);
        })
        it('should return false when two scalars are different', () => {
            var a = 99;
            var b = 100;
            expect(Runtime.isEqual(a, b)).to.equal(false);
        })
        it('should return true when two arrays are the same', () => {
            var a = [ 1, 2, 3 ];
            var b = [ 1, 2, 3 ];
            expect(Runtime.isEqual(a, b)).to.equal(true);
        })
        it('should return true when two arrays obtain objects that are the same', () => {
            var a = [ { a:1 }, { b: { c: 2 } } ];
            var b = [ { a:1 }, { b: { c: 2 } } ];
            expect(Runtime.isEqual(a, b)).to.equal(true);
        })
        it('should return false when two arrays are different', () => {
            var a = [1, 2, 3];
            var b = [1, 2, 4];
            expect(Runtime.isEqual(a, b)).to.equal(false);
        })
        it('should return false when two arrays obtain objects that are different', () => {
            var a = [ { a:1 }, { b: { c:2 } }];
            var b = [ { a:1 }, { b: { c:4 } }];
            expect(Runtime.isEqual(a, b)).to.equal(false);
        })
        it('should return false when one object has an extra property', () => {
            var a = { a: { b: { c: 1 } } };
            var b = { a: { b: { c: 1, d: 2 } } };
            expect(Runtime.isEqual(a, b)).to.equal(false);
        })
    })
    describe('#findChanges()', () => {
        it('should return true null when two objects are the same', () => {
            var a = { a: 'dingo' };
            var b = { a: 'dingo' };
            expect(Runtime.findChanges(a, b)).to.be.null;
        })
        it('should return the difference between two objects', () => {
            var a = { a: 'dingo', b: 'cat' };
            var b = { a: 'bingo', b: 'cat' };
            expect(Runtime.findChanges(a, b)).to.deep.equal({ a: [ 'dingo', 'bingo' ] });
        })
        it('should return the differences of multiple fields', () => {
            var a = { a: 'dingo', b: 'cat', c: 'turkey' };
            var b = { a: 'bingo', b: 'cat', c: 'Turkey' };
            expect(Runtime.findChanges(a, b)).to.have.keys('a', 'c');
        })
        it('should ignore differences in omitted fields', () => {
            var a = { a: 'dingo', b: 'cat', c: 'turkey' };
            var b = { a: 'bingo', b: 'cat', c: 'Turkey' };
            expect(Runtime.findChanges(a, b, ['a', 'c'])).to.be.null;
        })
    })
    describe('#sendChangeNotification()', () => {
        it('should send notification message containg diff', () => {
            var stmts = initPLV8();
            var diff = { a: [ 'dingo', 'bingo' ] };
            Runtime.sendChangeNotification('INSERT', 'schema', 'table', 5, diff);
            expect(stmts[0]).to.contain('NOTIFY');
        })
        it('should insert notification into message_queue when diff is large', () => {
            var stmts = initPLV8();
            var bigArray = Array(1000);
            var diff = { a: [ bigArray, bigArray.slice(1) ] };
            Runtime.sendChangeNotification('INSERT', 'schema', 'table', 5, diff);
            expect(stmts[0]).to.contain('INSERT').to.contain('message_queue');
            expect(stmts[1]).to.contain('NOTIFY').to.contain('1234');
        })
    })
    describe('#sendCleanNotification()', () => {
        it('should send clean notification message', () => {
            var stmts = initPLV8();
            Runtime.sendCleanNotification('UPDATE', 'schema', 'table', 5);
            expect(stmts[0]).to.contain('NOTIFY').to.contain('clean');
        })
    })
    describe('#matchObject()', () => {
        it('should return true when comparing a single-id filters', () => {
            var object = {
                story_id: 1
            };
            var filters = {
                story_id: 1
            };
            expect(Runtime.matchObject(filters, object)).to.equal(true);
        })
        it('should return true when comparing a multi-id filters', () => {
            var object = {
                story_ids: 1
            };
            var filters = {
                story_ids: [ 1, 2, 3 ]
            };
            expect(Runtime.matchObject(filters, object)).to.equal(true);
        })
        it('should return true when a multi-id filters overlaps ids in an object', () => {
            var object = {
                story_ids: [ 2 ]
            };
            var filters = {
                story_ids: [ 1, 2, 3 ]
            };
            expect(Runtime.matchObject(filters, object)).to.equal(true);
        })
        it('should return false when id is not on the list', () => {
            var object = {
                story_ids: 4
            };
            var filters = {
                story_ids: [ 1, 2, 3 ]
            };
            expect(Runtime.matchObject(filters, object)).to.equal(false);
        })
        it('should return true when a multi-id filters does not overlap ids in an object', () => {
            var object = {
                story_ids: [ 4, 5, 6 ]
            };
            var filters = {
                story_ids: [ 1, 2, 3 ]
            };
            expect(Runtime.matchObject(filters, object)).to.equal(false);
        })
        it('should return false when all criteria are met', () => {
            var object = {
                story_id: 1,
                type: 'good',
                user_ids: 4
            };
            var filters = {
                story_id: 1,
                type: 'good',
                user_ids: [1, 2, 3, 4]
            };
            expect(Runtime.matchObject(filters, object)).to.equal(true);
        })
        it('should return false when some of the criteria are not met', () => {
            var object = {
                story_id: 1,
                type: 'good'
            };
            var filters = {
                story_id: 1,
                type: 'bad'
            };
            expect(Runtime.matchObject(filters, object)).to.equal(false);
        })
        it('should return true when a timestamp falls within a time-range filter', () => {
            var object = {
                story_id: 1,
                time_range: '2017-05-31T00:00:00.000Z'
            };
            var filters = {
                story_id: 1,
                time_range: '[2016-05-31T00:00:00.000Z,2018-05-31T00:00:00.000Z]'
            };
            expect(Runtime.matchObject(filters, object)).to.equal(true);
        })
        it('should return true when a timestamp falls within an open-ended time-range', () => {
            var object = {
                story_id: 1,
                time_range: '2017-05-31T00:00:00.000Z'
            };
            var filters = {
                story_id: 1,
                time_range: '[2017-05-31T00:00:00.000Z,]'
            };
            expect(Runtime.matchObject(filters, object)).to.equal(true);
        })
        it('should return false when a timestamp falls outside a time-range', () => {
            var object = {
                story_id: 1,
                time_range: '2017-09-01T00:00:00.000Z'
            };
            var filters = {
                story_id: 1,
                time_range: '[2017-05-31T00:00:00.000Z,2017-08-31T00:00:00.000Z]'
            };
            expect(Runtime.matchObject(filters, object)).to.equal(false);
        })
        it('should return true when a time-range includes the timestamp filter', () => {
            var object = {
                story_id: 1,
                time_range: '[2017-04-22T00:00:00.000Z,2017-06-22T00:00:00.000Z]'
            };
            var filters = {
                story_id: 1,
                time_range: '2017-05-31T00:00:00.000Z'
            };
            expect(Runtime.matchObject(filters, object)).to.equal(true);
        })
        it('should return false when a time-range does not include the timestamp', () => {
            var object = {
                story_id: 1,
                time_range: '[2017-06-12T00:00:00.000Z,2017-06-22T00:00:00.000Z]'
            };
            var filters = {
                story_id: 1,
                time_range: '2017-05-31T00:00:00.000Z'
            };
            expect(Runtime.matchObject(filters, object)).to.equal(false);
        })
    })
})
