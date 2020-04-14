import { expect } from 'chai';

import { SQLiteCache } from '../sqlite-cache.js';

describe('SQLiteCache', function() {
  const cache = new SQLiteCache({ databaseName: 'test' });

  describe('#save()', function() {
    it('should save an object to SQLite', async function() {
      const location = {
        server: 'somewhere.net',
        schema: 'global',
        table: 'user',
      };
      const object = {
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
      const location = {
        server: 'somewhere.net',
        schema: 'global',
        table: 'user',
      };
      const object = {
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
      const location = {
        server: 'somewhere.net',
        schema: 'global',
        table: 'user',
      };
      const object1 = {
        id: 2,
        gn: 2,
        type: 'member',
        username: 'jane',
        details: {
          name: 'Jane Doe',
        },
        rtime: ISODate('2017-02-01'),
      };
      const object2 = {
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
      const location = {
        schema: 'local',
        table: 'settings',
      };
      const object = {
        key: 'what',
        something: 5
      };
      await cache.save(location, [ object ]);
    })
  })
  describe('#find()', function() {
    it('should be able to find object saved earlier', async function() {
      const query = {
        server: 'somewhere.net',
        schema: 'global',
        table: 'user',
        criteria: {
          id: 1
        }
      };
      const objects = await cache.find(query);
      expect(objects[0]).to.have.nested.property('details.name', 'John Doe');
    })
    it('should be able to find object by multiple ids', async function() {
      const query = {
        server: 'somewhere.net',
        schema: 'global',
        table: 'user',
        criteria: {
          id: [1, 3]
        }
      };
      const objects = await cache.find(query);
      expect(objects).to.have.lengthOf(2).to.have.nested.property('1.details.name', 'Jason Doe');
    })
    it('should find object by other criteria', async function() {
      const query = {
        server: 'somewhere.net',
        schema: 'global',
        table: 'user',
        criteria: {
          type: 'member'
        }
      };
      const objects = await cache.find(query);
      expect(objects).to.have.lengthOf(2).to.have.nested.property('1.details.name', 'Jason Doe');
    })
    it('should find object saved earlier to local schema', async function() {
      const query = {
        schema: 'local',
        table: 'settings',
        key: 'what'
      };
      const objects = await cache.find(query);
      expect(objects[0]).to.have.nested.property('something', 5);
    })
  })
  describe('#remove()', function() {
    it('should remove an object saved earlier', async function() {
      const location = {
        server: 'somewhere.net',
        schema: 'global',
        table: 'user',
      };
      const object = {
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
      const query = {
        server: 'somewhere.net',
        schema: 'global',
        table: 'user',
        criteria: {
          id: 1
        }
      };
      const objects = await cache.find(query);
      expect(objects).to.have.lengthOf(0);
    })
    it('should remove an object saved to local schema earlier', async function() {
      const location = {
        schema: 'local',
        table: 'settings',
      };
      const object = {
        key: 'what',
        something: 5
      };
      await cache.remove(location, [ object ]);
      const query = {
        schema: 'local',
        table: 'settings',
        key: 'what'
      };
      const objects = await cache.find(query);
      expect(objects).to.have.lengthOf(0);
    })
  })
  describe('#clean()', function() {
    it('should remove objects by server name', async function() {
      const location1 = {
        schema: 'global',
        table: 'comment',
      };
      const location2 = {
        address: 'http://mordor.me',
        schema: 'global',
        table: 'comment',
      };
      const objects = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
        return {
          id: num,
          rtime: ISODate(`1990-01-${num}`),
        };
      });
      await cache.save(location1, objects);
      await cache.save(location2, objects);
      await cache.clean({ address: 'http://mordor.me' });
      const objects1 = await cache.find(location1);
      const objects2 = await cache.find(location2);
      expect(objects1).to.have.lengthOf(10);
      expect(objects2).to.have.lengthOf(0);
    })
    it('should remove certain number of old objects', async function() {
      const location1 = {
        schema: 'global',
        table: 'comment',
      };
      const location2 = {
        address: 'http://mordor.me',
        schema: 'global',
        table: 'comment',
      };
      const objects = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
        return {
          id: num,
          rtime: ISODate(`1990-01-${num}`),
        };
      });
      await cache.save(location1, objects);
      await cache.save(location2, objects);
      await cache.clean({ count: 4 });
      const objects1 = await cache.find(location1);
      const objects2 = await cache.find(location2);
      expect(objects1).to.have.lengthOf(8);
      expect(objects2).to.have.lengthOf(8);
    })
    it('should remove objects older than a certain date', async function() {
      const location1 = {
        schema: 'global',
        table: 'comment',
      };
      const location2 = {
        address: 'http://mordor.me',
        schema: 'global',
        table: 'comment',
      };
      const objects = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
        return {
          id: num,
          rtime: ISODate(`1990-01-${num}`),
        };
      });
      await cache.save(location1, objects);
      await cache.save(location2, objects);
      await cache.clean({ before: ISODate('1990-01-5') });
      const objects1 = await cache.find(location1);
      const objects2 = await cache.find(location2);
      expect(objects1).to.have.lengthOf(6);
      expect(objects2).to.have.lengthOf(6);
    })
  })
})

function ISODate(s) {
  return (new Date(s)).toISOString();
}
