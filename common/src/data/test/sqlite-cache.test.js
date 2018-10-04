import _ from 'lodash';
import Promise from 'bluebird';
import { expect } from 'chai';

import SQLiteCache from 'data/sqlite-cache';

describe('SQLiteCache', function() {
    let cache = new SQLiteCache({ databaseName: 'test' });

    describe('#save()', function() {
        it('should save an object to SQLite', function() {
            let location = {
                server: 'somewhere.net',
                schema: 'global',
                table: 'user',
            };
            let object = {
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
            let location = {
                server: 'somewhere.net',
                schema: 'global',
                table: 'user',
            };
            let object = {
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
            let location = {
                server: 'somewhere.net',
                schema: 'global',
                table: 'user',
            };
            let object1 = {
                id: 2,
                gn: 2,
                type: 'member',
                username: 'jane',
                details: {
                    name: 'Jane Doe',
                },
                rtime: ISODate('2017-02-01'),
            };
            let object2 = {
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
            let location = {
                schema: 'local',
                table: 'settings',
            };
            let object = {
                key: 'what',
                something: 5
            };
            return cache.save(location, [ object ]);
        })
    })
    describe('#find()', function() {
        it('should be able to find object saved earlier', function() {
            let query = {
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
            let query = {
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
            let query = {
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
            let query = {
                schema: 'local',
                table: 'settings',
                key: 'what'
            };
            return cache.find(query).then((objects) => {
                expect(objects[0]).to.have.deep.property('something', 5);
            });
        })
    })
    describe('#remove()', function() {
        it('should remove an object saved earlier', function() {
            let location = {
                server: 'somewhere.net',
                schema: 'global',
                table: 'user',
            };
            let object = {
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
                let query = {
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
            let location = {
                schema: 'local',
                table: 'settings',
            };
            let object = {
                key: 'what',
                something: 5
            };
            return cache.remove(location, [ object ]).then((objects) => {
                let query = {
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
    describe('#clean()', function() {
        it('should remove objects by server name', function() {
            let location1 = {
                schema: 'global',
                table: 'comment',
            };
            let location2 = {
                address: 'http://mordor.me',
                schema: 'global',
                table: 'comment',
            };
            let objects = _.map(_.range(1, 11), (num) => {
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
                return cache.clean({ address: 'http://mordor.me' });
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
            let location1 = {
                schema: 'global',
                table: 'comment',
            };
            let location2 = {
                address: 'http://mordor.me',
                schema: 'global',
                table: 'comment',
            };
            let objects = _.map(_.range(1, 11), (num) => {
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
            let location1 = {
                schema: 'global',
                table: 'comment',
            };
            let location2 = {
                address: 'http://mordor.me',
                schema: 'global',
                table: 'comment',
            };
            let objects = _.map(_.range(1, 11), (num) => {
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
