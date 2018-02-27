var _ = require('lodash');
var Chai = require('chai'), expect = Chai.expect;

var Merger = require('data/merger.js');

describe('Merger', function() {
    describe('#mergeStrings()', function() {
        it('should take changes from both A and B', function() {
            var c = 'This is a test. This is only a test.';
            var a = 'Well, this is a test. This is only a test.';
            var b = 'This is a test. This is only a test, you bozo!';
            var expected = 'Well, this is a test. This is only a test, you bozo!';
            var actual = Merger.mergeStrings(a, b, c);
            expect(actual).to.equal(expected);
        })
    })
    describe('#mergeObjects()', function() {
        it('should take changes from A when B is unchanged', function() {
            var c = {
                id: 5,
                hello: 123
            };
            var a = _.cloneDeep(c);
            var b = _.cloneDeep(c);
            a.hello = 456;
            var d = Merger.mergeObjects(a, b, c);
            expect(d).to.have.property('hello', a.hello);
        })
        it('should take changes from B when A is unchanged', function() {
            var c = {
                id: 5,
                hello: 123
            };
            var a = _.cloneDeep(c);
            var b = _.cloneDeep(c);
            b.hello = 789;
            var d = Merger.mergeObjects(a, b, c);
            expect(d).to.have.property('hello', b.hello);
        })
        it('should take changes from B when both A and B were changed', function() {
            var c = {
                id: 5,
                hello: 123
            };
            var a = _.cloneDeep(c);
            var b = _.cloneDeep(c);
            a.hello = 456;
            b.hello = 789;
            var d = Merger.mergeObjects(a, b, c);
            expect(d).to.have.property('hello', b.hello);
        })
        it('should take changes from both A and B', function() {
            var c = {
                id: 5,
                hello: 123,
                world: 100
            };
            var a = _.cloneDeep(c);
            var b = _.cloneDeep(c);
            a.hello = 456;
            b.world = 500;
            var d = Merger.mergeObjects(a, b, c);
            expect(d).to.have.property('hello', a.hello);
            expect(d).to.have.property('world', b.world);
        })
        it('should take merge text difference between A and B', function() {
            var c = {
                id: 5,
                text: `It's the best of time. It's the worst of time.`
            };
            var a = _.cloneDeep(c);
            var b = _.cloneDeep(c);
            a.text = `It's totally awesome! It's the worst of time.`;
            b.text = `It's the best of time. It's a complete shitshow!`;
            var expected = `It's totally awesome! It's a complete shitshow!`;
            var d = Merger.mergeObjects(a, b, c);
            expect(d).to.have.property('text', expected);
        })
    })
})
