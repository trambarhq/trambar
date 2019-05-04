import { expect } from 'chai';

import SQLiteCache from '../sqlite-cache';

describe('SQLiteCache', function() {
    let cache = new SQLiteCache({ databaseName: 'test' });

    describe('#save()', function() {
        it('should save an object to SQLite', async function() {
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
            await cache.save(location, [ object ]);
        })
        it('should overwrite an existing object', async function() {
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
            await cache.save(location, [ object ]);
        })
        it('should save multiple objects', async function() {
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
            await cache.save(location, [ object1, object2 ]);
        })
        it('should save an object to local schema', async function() {
            let location = {
                schema: 'local',
                table: 'settings',
            };
            let object = {
                key: 'what',
                something: 5
            };
            await cache.save(location, [ object ]);
        })
    })
    describe('#find()', function() {
        it('should be able to find object saved earlier', async function() {
            let query = {
                server: 'somewhere.net',
                schema: 'global',
                table: 'user',
                criteria: {
                    id: 1
                }
            };
            let objects = await cache.find(query);
            expect(objects[0]).to.have.nested.property('details.name', 'John Doe');
        })
        it('should be able to find object by multiple ids', async function() {
            let query = {
                server: 'somewhere.net',
                schema: 'global',
                table: 'user',
                criteria: {
                    id: [1, 3]
                }
            };
            let objects = await cache.find(query);
            expect(objects).to.have.lengthOf(2).to.have.nested.property('1.details.name', 'Jason Doe');
        })
        it('should find object by other criteria', async function() {
            let query = {
                server: 'somewhere.net',
                schema: 'global',
                table: 'user',
                criteria: {
                    type: 'member'
                }
            };
            let objects = await cache.find(query);
            expect(objects).to.have.lengthOf(2).to.have.nested.property('1.details.name', 'Jason Doe');
        })
        it('should find object saved earlier to local schema', async function() {
            let query = {
                schema: 'local',
                table: 'settings',
                key: 'what'
            };
            let objects = await cache.find(query);
            expect(objects[0]).to.have.nested.property('something', 5);
        })
    })
    describe('#remove()', function() {
        it('should remove an object saved earlier', async function() {
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
            await cache.remove(location, [ object ]);
            let query = {
                server: 'somewhere.net',
                schema: 'global',
                table: 'user',
                criteria: {
                    id: 1
                }
            };
            let objects = await cache.find(query);
            expect(objects).to.have.lengthOf(0);
        })
        it('should remove an object saved to local schema earlier', async function() {
            let location = {
                schema: 'local',
                table: 'settings',
            };
            let object = {
                key: 'what',
                something: 5
            };
            await cache.remove(location, [ object ]);
            let query = {
                schema: 'local',
                table: 'settings',
                key: 'what'
            };
            let objects = await cache.find(query);
            expect(objects).to.have.lengthOf(0);
        })
    })
    describe('#clean()', function() {
        it('should remove objects by server name', async function() {
            let location1 = {
                schema: 'global',
                table: 'comment',
            };
            let location2 = {
                address: 'http://mordor.me',
                schema: 'global',
                table: 'comment',
            };
            let objects = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                return {
                    id: num,
                    rtime: ISODate(`1990-01-${num}`),
                };
            });
            await cache.save(location1, objects);
            await cache.save(location2, objects);
            await cache.clean({ address: 'http://mordor.me' });
            let objects1 = await cache.find(location1);
            let objects2 = await cache.find(location2);
            expect(objects1).to.have.lengthOf(10);
            expect(objects2).to.have.lengthOf(0);
        })
        it('should remove certain number of old objects', async function() {
            let location1 = {
                schema: 'global',
                table: 'comment',
            };
            let location2 = {
                address: 'http://mordor.me',
                schema: 'global',
                table: 'comment',
            };
            let objects = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                return {
                    id: num,
                    rtime: ISODate(`1990-01-${num}`),
                };
            });
            await cache.save(location1, objects);
            await cache.save(location2, objects);
            await cache.clean({ count: 4 });
            let objects1 = await cache.find(location1);
            let objects2 = await cache.find(location2);
            expect(objects1).to.have.lengthOf(8);
            expect(objects2).to.have.lengthOf(8);
        })
        it('should remove objects older than a certain date', async function() {
            let location1 = {
                schema: 'global',
                table: 'comment',
            };
            let location2 = {
                address: 'http://mordor.me',
                schema: 'global',
                table: 'comment',
            };
            let objects = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                return {
                    id: num,
                    rtime: ISODate(`1990-01-${num}`),
                };
            });
            await cache.save(location1, objects);
            await cache.save(location2, objects);
            await cache.clean({ before: ISODate('1990-01-5') });
            let objects1 = await cache.find(location1);
            let objects2 = await cache.find(location2);
            expect(objects1).to.have.lengthOf(6);
            expect(objects2).to.have.lengthOf(6);
        })
    })
})

function ISODate(s) {
    return (new Date(s)).toISOString();
}
