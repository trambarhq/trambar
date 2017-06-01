var Promise = require('bluebird');
var React = require('react');
var Chai = require('chai'), expect = Chai.expect;
var Enzyme = require('enzyme');

var IndexedDBCache = require('data/indexed-db-cache.jsx');

describe('IndexedDBCache', function() {
    var wrapper = Enzyme.mount(<IndexedDBCache />);
    var cache = wrapper.instance();

    describe('#save', function() {
        it('should save an object to IndexedDB', function() {
            var location = {
                server: 'somewhere.net',
                schema: 'global',
                table: 'user',
            };
            var object = {
                id: 1,
                gn: 2,
                details: {
                    name: 'John Doe',
                }
            };
            return cache.save(location, [ object ]);
        })
        it('should save multiple objects', function() {
            var location = {
                server: 'somewhere.net',
                schema: 'global',
                table: 'user',
            };
            var object1 = {
                id: 2,
                gn: 2,
                details: {
                    name: 'Jan Doe',
                }
            };
            var object2 = {
                id: 3,
                gn: 2,
                details: {
                    name: 'Jason Doe',
                }
            };
            return cache.save(location, [ object1, object2 ]);
        })
    })
    describe('#find', function() {
        it('should be able to find object saved earlier', function() {
            var query = {
                server: 'somewhere.net',
                schema: 'global',
                table: 'user',
                criteria: {
                    id: 1
                }
            };
            return cache.find(query).then((objects) => {
                expect(objects[0]).to.have.deep.property('details.name', 'John Doe');
            });
        })
        it('should be able to find object by multiple ids', function() {
            var query = {
                server: 'somewhere.net',
                schema: 'global',
                table: 'user',
                criteria: {
                    id: [1, 3]
                }
            };
            return cache.find(query).then((objects) => {
                expect(objects).to.have.lengthOf(2).to.have.deep.property('1.details.name', 'Jason Doe');
            });
        })
    })
})
