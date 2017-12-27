var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react');
var Chai = require('chai'), expect = Chai.expect;
var Enzyme = require('enzyme');

var SQLiteCache = require('data/sqlite-cache.jsx');

describe('SQLiteCache', function() {
    var wrapper = Enzyme.mount(<SQLiteCache databaseName="test"/>);
    var cache = wrapper.instance();

    describe('#save', function() {
        it('should save an object to SQLite', function() {
            var location = {
                server: 'somewhere.net',
                schema: 'global',
                table: 'user',
            };
            var object = {
                id: 1,
                gn: 2,
                type: 'admin',
                username: 'john',
                details: {
                    name: 'John Doe',
                },
                rtime: ISODate('2017-01-01'),
            };
            return cache.save(location, [ object ]);
        })
        it('should overwrite an existing object', function() {
            var location = {
                server: 'somewhere.net',
                schema: 'global',
                table: 'user',
            };
            var object = {
                id: 1,
                gn: 2,
                type: 'admin',
                username: 'john',
                details: {
                    name: 'John Doe',
                },
                rtime: ISODate('2017-01-01'),
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
                type: 'member',
                username: 'jane',
                details: {
                    name: 'Jane Doe',
                },
                rtime: ISODate('2017-02-01'),
            };
            var object2 = {
                id: 3,
                gn: 2,
                type: 'member',
                username: 'jason',
                details: {
                    name: 'Jason Doe',
                },
                rtime: ISODate('2017-03-01'),
            };
            return cache.save(location, [ object1, object2 ]);
        })
        it('should save an object to local schema', function() {
            var location = {
                schema: 'local',
                table: 'settings',
            };
            var object = {
                key: 'what',
                something: 5
            };
            return cache.save(location, [ object ]);
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
        it('should find object by other criteria', function() {
            var query = {
                server: 'somewhere.net',
                schema: 'global',
                table: 'user',
                criteria: {
                    type: 'member'
                }
            };
            return cache.find(query).then((objects) => {
                expect(objects).to.have.lengthOf(2).to.have.deep.property('1.details.name', 'Jason Doe');
            });
        })
        it('should find object saved earlier to local schema', function() {
            var query = {
                schema: 'local',
                table: 'settings',
                key: 'what'
            };
            return cache.find(query).then((objects) => {
                expect(objects[0]).to.have.deep.property('something', 5);
            });
        })
    })
    describe('#remove', function() {
        it('should remove an object saved earlier', function() {
            var location = {
                server: 'somewhere.net',
                schema: 'global',
                table: 'user',
            };
            var object = {
                id: 1,
                gn: 2,
                type: 'admin',
                username: 'john',
                details: {
                    name: 'John Doe',
                },
                rtime: ISODate('2017-01-01'),
            };
            return cache.remove(location, [ object ]).then((objects) => {
                var query = {
                    server: 'somewhere.net',
                    schema: 'global',
                    table: 'user',
                    criteria: {
                        id: 1
                    }
                };
                return cache.find(query).then((objects) => {
                    expect(objects).to.have.lengthOf(0);
                });
            })
        })
        it('should remove an object saved to local schema earlier', function() {
            var location = {
                schema: 'local',
                table: 'settings',
            };
            var object = {
                key: 'what',
                something: 5
            };
            return cache.remove(location, [ object ]).then((objects) => {
                var query = {
                    schema: 'local',
                    table: 'settings',
                    key: 'what'
                };
                return cache.find(query).then((objects) => {
                    expect(objects).to.have.lengthOf(0);
                });
            });
        })
    })
    describe('#clean', function() {
        it('should remove objects by server name', function() {
            var location1 = {
                schema: 'global',
                table: 'comment',
            };
            var location2 = {
                server: 'mordor.me',
                schema: 'global',
                table: 'comment',
            };
            var objects = _.map(_.range(1, 11), (num) => {
                return {
                    id: num,
                    rtime: ISODate(`1990-01-${num}`),
                };
            });
            return Promise.resolve().then(() => {
                return cache.save(location1, objects);
            }).then(() => {
                return cache.save(location2, objects);
            }).then(() => {
                return cache.clean({ server: 'mordor.me' });
            }).then(() => {
                return cache.find(location1).then((objects1) => {
                    return cache.find(location2).then((objects2) => {
                        expect(objects1).to.have.lengthOf(10);
                        expect(objects2).to.have.lengthOf(0);
                    });
                });
            });
        })
        it('should remove certain number of old objects', function() {
            var location1 = {
                schema: 'global',
                table: 'comment',
            };
            var location2 = {
                server: 'mordor.me',
                schema: 'global',
                table: 'comment',
            };
            var objects = _.map(_.range(1, 11), (num) => {
                return {
                    id: num,
                    rtime: ISODate(`1990-01-${num}`),
                };
            });
            return Promise.resolve().then(() => {
                return cache.save(location1, objects);
            }).then(() => {
                return cache.save(location2, objects);
            }).then(() => {
                return cache.clean({ count: 4 });
            }).then(() => {
                return cache.find(location1).then((objects1) => {
                    return cache.find(location2).then((objects2) => {
                        expect(objects1).to.have.lengthOf(8);
                        expect(objects2).to.have.lengthOf(8);
                    });
                });
            });
        })
        it('should remove objects older than a certain date', function() {
            var location1 = {
                schema: 'global',
                table: 'comment',
            };
            var location2 = {
                server: 'mordor.me',
                schema: 'global',
                table: 'comment',
            };
            var objects = _.map(_.range(1, 11), (num) => {
                return {
                    id: num,
                    rtime: ISODate(`1990-01-${num}`),
                };
            });
            return Promise.resolve().then(() => {
                return cache.save(location1, objects);
            }).then(() => {
                return cache.save(location2, objects);
            }).then(() => {
                return cache.clean({ before: ISODate('1990-01-5') });
            }).then(() => {
                return cache.find(location1).then((objects1) => {
                    return cache.find(location2).then((objects2) => {
                        expect(objects1).to.have.lengthOf(6);
                        expect(objects2).to.have.lengthOf(6);
                    });
                });
            });
        })
    })
})

function ISODate(s) {
    return (new Date(s)).toISOString();
}
