var _ = require('lodash');
var Chai = require('chai'), expect = Chai.expect;

require('utils/lodash-extra');

describe('LodashExtra', function() {
    describe('#decouple()', function() {
        it('should clone an object shallowly, and clone the object at the specified path', function() {
            var before = {
                a: 1,
                b: {
                    c: {
                        value: 5
                    }
                }
            };
            var after = _.decouple(before, 'b.c');
            after.b.c = 6;
            expect(before.b.c.value).to.equal(5);
        })
        it('should create sub-object as necessary', function() {
            var before = {
                a: 1,
            };
            var after = _.decouple(before, 'b.c');
            expect(after.b.c).to.be.an('object');
        })
        it('should use default value when object at path is missing', function() {
            var before = {
                a: 1,
            };
            var after = _.decouple(before, 'b.c', []);
            expect(after.b.c).to.be.an('array');
        })
    })
    describe('#decoupleSet()', function() {
        it('should decouple objects along a given path then set the property', function() {
            var before = {
                a: 1,
                b: {
                    c: {
                        value: 5
                    }
                }
            };
            var after = _.decoupleSet(before, 'b.c.value', 6);
            expect(before.b.c.value).to.equal(5);
            expect(after.b.c.value).to.equal(6);
        })
    })
    describe('#decouplePush()', function() {
        it('should decouple objects along a given path then push a value', function() {
            var before = {
                a: 1,
                b: {
                    c: {
                        array: []
                    }
                }
            };
            var after = _.decouplePush(before, 'b.c.array', 6, 7, 8);
            expect(before.b.c.array).to.have.lengthOf(0);
            expect(after.b.c.array).to.have.lengthOf(3);
        })
    })
    describe('#shallowDiff()', function() {
        it('should return differences of two objects, comparing shallowly', function() {
            var cat = { name: 'Garfield' }
            var a = {
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
            var b = {
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
            var expected = {
                george: 'T-bone',
                dog: {
                    name: 'Max'
                },
                turtle: {
                    name: 'Glen'
                }
            };
            var diff = _.shallowDiff(a, b);
            expect(diff).to.deep.equal(expected);
        })
    })
    describe('#obscure()', function() {
        it('should change numbers to zero', function() {
            var before = {
                a: 1,
                b: { c: 2 },
                d: [1, 2, 3],
            };
            var expected = {
                a: 0,
                b: { c: 0 },
                d: [0, 0, 0],
            };
            var after = _.obscure(before, [ 'a', 'b.c', 'd' ]);
            expect(after).to.deep.equal(expected);
        })
        it('should change booleans to false', function() {
            var before = {
                a: true,
                b: { c: true },
                d: [ true, true, true ],
            };
            var expected = {
                a: false,
                b: { c: false },
                d: [ false, false, false ],
            };
            var after = _.obscure(before, [ 'a', 'b.c', 'd' ]);
            expect(after).to.deep.equal(expected);
        })
        it('should replace all characters in text with x', function() {
            var before = {
                a: 'Hello',
                b: { c: 'World' },
                d: [ 'apple', 'orange', 'lemon' ],
            };
            var expected = {
                a: 'xxxxx',
                b: { c: 'xxxxx' },
                d: [ 'xxxxx', 'xxxxxx', 'xxxxx' ],
            };
            var after = _.obscure(before, [ 'a', 'b.c', 'd' ]);
            expect(after).to.deep.equal(expected);
        })
        it('should leave unspecified properties alone', function() {
            var before = {
                a: 'Hello',
                b: { c: 'World', number: 123 },
                d: [ 'apple', 'orange', 'lemon' ],
            };
            var expected = {
                a: 'xxxxx',
                b: { c: 'World', number: 0 },
                d: [ 'apple', 'orange', 'lemon' ],
            };
            var after = _.obscure(before, [ 'a', 'b.number' ]);
            expect(after).to.deep.equal(expected);
        })
    })
})
