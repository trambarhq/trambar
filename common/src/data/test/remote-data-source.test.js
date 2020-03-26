import _ from 'lodash';
import Moment from 'moment';
import { expect } from 'chai';
import { delay } from '../../utils/delay.js';

import { RemoteDataSource } from '../remote-data-source.js';
import { IndexedDBCache } from '../indexed-db-cache.js';
import { HTTPError } from '../../errors.js';
import { promiseSelf } from '../../utils/promise-self.js';
import { mockHTTPRequest, performHTTPRequest } from '../../transport/http-request.js';

describe('RemoteDataSource', function() {
  let dataSource, cache;
  before(function() {
    indexedDB.deleteDatabase('rds-test');

    cache = new IndexedDBCache({ databaseName: 'rds-test' });
  })
  beforeEach(() => {
    dataSource = new RemoteDataSource({
      discoveryFlags: {
        include_uncommitted: true
      },
      retrievalFlags: {
      },
      prefetching: false,
      sessionRetryInterval: 100,
      cacheValidation: true,
      cache,
    });
    dataSource.activate();
  })
  after(function() {
    mockHTTPRequest(false);
  })

  describe('#beginSession()', function() {
    it('should initiate a session', async function() {
      const location = { address: 'http://mordor.me' };
      const session = { handle: 'abcdefg' };
      const system = { details: { en: 'Test' } };
      const servers = [ { id: 1, type: 'gitlab' } ];
      mockHTTPRequest(async (method, url, payload, options) => {
        expect(method).to.match(/post/i);
        expect(url).to.contain(location.address);
        expect(payload).to.have.property('area', 'client');
        return { session, system, servers };
      });
      const result = await dataSource.beginSession(location, 'client');
      expect(result).to.have.property('system').that.deep.equals(system);
      expect(result).to.have.property('servers').that.deep.equals(servers);
    })
    it('should return a fulfilled promise when session was created already', async function() {
      const location = { address: 'http://rohan.me' };
      const session = { handle: 'abcdefg' };
      const system = { details: { en: 'Test' } };
      const servers = [ { id: 1, type: 'gitlab' } ];
      mockHTTPRequest(async (method, url, payload, options) => {
        return { session, system, servers };
      });
      const promise1 = dataSource.beginSession(location, 'client');
      const promise2 = dataSource.beginSession(location, 'client');
      expect(promise1).to.equal(promise2);
    })
  })
  describe('#checkAuthorization()', function() {
    it('should fire authorization event when remote server indicates session is authorized', async function() {
      const authorizationEventPromise = promiseSelf();
      dataSource.addEventListener('authorization', authorizationEventPromise.resolve);
      const location = { address: 'http://isengard.me' };
      const session = { handle: 'abcdefg' };
      const sessionLater = {
        token: '123456789',
        user_id: 7,
        etime: Moment().add(1, 'day').toISOString(),
      };
      const system = { details: { en: 'Test' } };
      const servers = [ { id: 1, type: 'gitlab' } ];
      mockHTTPRequest(async (method, url, payload, options) => {
        return { session, system, servers };
      });
      await dataSource.beginSession(location, 'client');
      expect(dataSource.hasAuthorization(location)).to.be.false;
      mockHTTPRequest(async (method, url, payload, options) => {
        expect(method).to.match(/get/i);
        expect(payload).to.have.property('handle', session.handle);
        return { session: sessionLater };
      });
      const authorized = await dataSource.checkAuthorization(location);
      expect(authorized).to.be.true;
      expect(dataSource.hasAuthorization(location)).to.be.true;
      const evt = await authorizationEventPromise;
      expect(evt).to.have.property('session');
      expect(evt.session).to.have.property('token');
      expect(evt.session).to.have.property('user_id');
      expect(evt.session).to.have.property('etime');
    })
    it('should simply return false when session is not authorized', async function() {
      const expirationEventPromise = promiseSelf();
      const violationEventPromise = promiseSelf();
      dataSource.addEventListener('expiration', expirationEventPromise.resolve);
      dataSource.addEventListener('violation', violationEventPromise.resolve);
      const location = { address: 'http://dunland.me' };
      const session = { handle: 'abcdefg' };
      const system = { details: { en: 'Test' } };
      const servers = [ { id: 1, type: 'gitlab' } ];
      mockHTTPRequest(async (method, url, payload, options) => {
        return { session, system, servers };
      });
      await dataSource.beginSession(location, 'client');
      expect(dataSource.hasAuthorization(location)).to.be.false;
      mockHTTPRequest(async (method, url, payload, options) => {
        return {};
      });
      const authorized = await dataSource.checkAuthorization(location);
      expect(dataSource.hasAuthorization(location)).to.be.false;
      expect(authorized).to.be.false;
      const result = await Promise.race([
        expirationEventPromise,
        violationEventPromise,
        delay(200).then(() => 'no event')
      ]);
      expect(result).to.equal('no event');
    })
  })
  describe('#authenticate()', function() {
    it('should trigger authorization event when server accepts username/password', async function() {
      const authorizationEventPromise = promiseSelf();
      dataSource.addEventListener('authorization', authorizationEventPromise.resolve);
      const location = { address: 'http://mdoom.mordor.me' };
      const session = { handle: 'abcdefg' };
      const sessionLater = {
        token: '123456789',
        user_id: 3,
        etime: Moment().add(1, 'day').toISOString(),
      };
      const system = { details: { en: 'Test' } };
      const servers = [ { id: 1, type: 'gitlab' } ];
      const username = 'frodo';
      const password = 'precious';
      mockHTTPRequest(async (method, url, payload, options) => {
        return { session, system, servers };
      });
      await dataSource.beginSession(location, 'client');
      expect(dataSource.hasAuthorization(location)).to.be.false;
      mockHTTPRequest(async (method, url, payload, options) => {
        expect(method).to.match(/post/i);
        expect(payload).to.have.property('handle', session.handle);
        expect(payload).to.have.property('username', username);
        expect(payload).to.have.property('password', password);
        return { session: sessionLater };
      });
      const credentials = {
        type: 'password',
        username,
        password
      };
      await dataSource.authenticate(location, credentials);
      expect(dataSource.hasAuthorization(location)).to.be.true;
      const evt = await authorizationEventPromise;
      expect(evt).to.have.property('session');
      expect(evt.session).to.have.property('token');
      expect(evt.session).to.have.property('user_id');
      expect(evt.session).to.have.property('etime');
    })
    it('should reject when username/password are wrong, with error object containing information sent by server', async function() {
      const changeEventPromise = promiseSelf();
      const expirationEventPromise = promiseSelf();
      const violationEventPromise = promiseSelf();
      dataSource.addEventListener('change', changeEventPromise.resolve);
      dataSource.addEventListener('expiration', expirationEventPromise.resolve);
      dataSource.addEventListener('violation', violationEventPromise.resolve)
      const location = { address: 'http://rivendell.me' };
      const session = { handle: 'abcdefg' };
      const system = { details: { en: 'Test' } };
      const servers = [ { id: 1, type: 'gitlab' } ];
      const username = 'frodo';
      const password = 'precious';
      mockHTTPRequest(async (method, url, payload, options) => {
        return { session, system, servers };
      });
      await dataSource.beginSession(location, 'client');
      expect(dataSource.hasAuthorization(location)).to.be.false;
      mockHTTPRequest(async (method, url, payload, options) => {
        throw new HTTPError(401, {
          message: 'username/password are wrong',
          reason: 'dark-magic',
        });
      });
      const credentials = {
        type: 'password',
        username,
        password
      };
      try {
        await dataSource.authenticate(location, credentials);
        expect.fail();
      } catch (err) {
        expect(err).to.have.property('reason', 'dark-magic');
      }
      const result = await Promise.race([
        changeEventPromise,
        expirationEventPromise,
        violationEventPromise,
        delay(200).then(() => 'no event')
      ]);
      expect(result).to.equal('no event');
    })
    it('should trigger change event to restart session when failure is other than 401 Unauthorized', async function() {
      const changeEventPromise = promiseSelf();
      const expirationEventPromise = promiseSelf();
      const violationEventPromise = promiseSelf();
      dataSource.addEventListener('change', changeEventPromise.resolve);
      dataSource.addEventListener('expiration', expirationEventPromise.resolve);
      dataSource.addEventListener('violation', violationEventPromise.resolve)
      const location = { address: 'http://rivendell.me' };
      const session = { handle: 'abcdefg' };
      const system = { details: { en: 'Test' } };
      const servers = [ { id: 1, type: 'gitlab' } ];
      const username = 'frodo';
      const password = 'precious';
      mockHTTPRequest(async (method, url, payload, options) => {
        return { session, system, servers };
      });
      await dataSource.beginSession(location, 'client');
      mockHTTPRequest(async (method, url, payload, options) => {
        throw new HTTPError(404, {
          message: 'Session has disappeared!',
          reason: 'one-ring',
        });
      });
      const credentials = {
        type: 'password',
        username,
        password
      };
      try {
        await dataSource.authenticate(location, credentials)
        expect.fail();
      } catch (err) {
        expect(err).to.be.instanceOf(Error);
      }
      const evt = await Promise.race([ changeEventPromise, expirationEventPromise, violationEventPromise ]);
      expect(evt).to.have.property('type', 'change');
    })
  })
  describe('#endSession()', function() {
    it('should end a session', async function() {
      const location = { address: 'http://helms-deep.me' };
      const session = { handle: 'abcdefg' };
      const system = { details: { en: 'Test' } };
      const servers = [ { id: 1, type: 'gitlab' } ];
      const username = 'frodo';
      const password = 'precious';
      mockHTTPRequest(async (method, url, payload, options) => {
        return { session, system, servers };
      });
      await dataSource.beginSession(location, 'client');
      mockHTTPRequest(async (method, url, payload, options) => {
        expect(method).to.match(/delete/i);
        expect(payload).to.property('handle', session.handle);
        return {};
      });
      await dataSource.endSession(location);
      expect(dataSource.hasAuthorization(location)).to.be.false;
    })
  })
  describe('#getOAuthURL()', function() {
    it('should return a URL for logging in through OAuth', async function() {
      const location = { address: 'http://helms-deep.me' };
      const session = { handle: 'abcdefg' };
      const system = { details: { en: 'Test' } };
      const servers = [ { id: 1, type: 'gitlab' } ];
      const username = 'frodo';
      const password = 'precious';
      mockHTTPRequest(async (method, url, payload, options) => {
        return { session, system, servers };
      });
      await dataSource.beginSession(location, 'client');
      const url1 = dataSource.getOAuthURL(location, servers[0]);
      const url2 = dataSource.getOAuthURL(location, servers[0], 'test');
      const url3 = dataSource.getOAuthURL(location, servers[0], 'activation');
      expect(url1).to.equal('http://helms-deep.me/srv/session/gitlab/?sid=1&handle=abcdefg');
      expect(url2).to.equal('http://helms-deep.me/srv/session/gitlab/?sid=1&handle=abcdefg&test=1');
      expect(url3).to.equal('http://helms-deep.me/srv/session/gitlab/?sid=1&handle=abcdefg&activation=1');
    })
  })
  describe('#restoreAuthorization()', function() {
    it('should add a session', async function() {
      const session = {
        handle: 'abcdefg',
        address: 'http://minas-tirith.me',
        token: '123456789',
        user_id: 3,
        area: 'client',
        etime: Moment().add(1, 'day').toISOString(),
      };
      const location = { address: session.address };
      expect(dataSource.hasAuthorization(location)).to.be.false;
      const restored = dataSource.restoreAuthorization(location, session);
      expect(restored).to.be.true;
      expect(dataSource.hasAuthorization(location)).to.be.true;
    })
    it('should not add an expired session', async function() {
      const session = {
        handle: 'abcdefg',
        address: 'http://angmar.me',
        token: '123456789',
        user_id: 3,
        area: 'client',
        etime: Moment().subtract(1, 'day').toISOString(),
      };
      const location = { address: session.address };
      expect(dataSource.hasAuthorization(location)).to.be.false;
      const restored = dataSource.restoreAuthorization(location, session);
      expect(restored).to.be.false;
      expect(dataSource.hasAuthorization(location)).to.be.false;
    })
  })
  describe('#start()', function() {
    it('should return the user id', async function() {
      const session = {
        handle: 'abcdefg',
        address: 'http://minas-tirith.me',
        token: '123456789',
        user_id: 3,
        area: 'client',
        etime: Moment().add(1, 'day').toISOString(),
      };
      const location = { address: session.address, schema: 'global' };
      const restored = dataSource.restoreAuthorization(location, session);
      expect(restored).to.be.true;
      const userID = await dataSource.start(location);
      expect(userID).to.equal(session.user_id);
    })
    it('should reject with 401 Unauthorized error when there is no session', async function() {
      dataSource.addEventListener('authentication', (evt) => {
        evt.preventDefault();
      });
      const location = { address: 'http://minas-morgul.me', schema: 'global' };
      try {
        await dataSource.start(location);
        expect.fail();
      } catch (err) {
        expect(err).to.have.property('statusCode', 401);
      }
    })
  })
  describe('#find()', function() {
    it('should request objects from remote server', async function() {
      const query = {
        address: 'http://minas-tirith.me',
        schema: 'global',
        table: 'user',
        criteria: {
          id: 3
        }
      };
      const objects = [
        { id: 3, gn: 2, username: 'frodo' }
      ]
      let discovery = 0;
      let retrieval = 0;
      mockHTTPRequest(async (method, url, payload, options) => {
        expect(method).to.match(/post/i);
        if (/discovery/.test(url)) {
          discovery++;
          expect(payload).to.have.property('id', 3);
          return {
            ids: objects.map(obj => obj.id),
            gns: objects.map(obj => obj.gn)
          };
        } else if (/retrieval/.test(url)) {
          retrieval++;
          expect(payload).to.have.property('ids').that.deep.equal([ 3 ]);
          return objects.filter((object) => {
            return payload.ids.includes(object.id);
          });
        }
      });
      const users = await dataSource.find(query);
      expect(discovery).to.equal(1);
      expect(retrieval).to.equal(1);
      expect(users[0]).to.have.property('id', objects[0].id);
    })
    it('should reuse results from a previous search', async function() {
      const query = {
        address: 'http://minas-tirith.me',
        schema: 'global',
        table: 'user',
        criteria: {
          id: 1
        }
      };
      const objects = [
        { id: 1, gn: 70, username: 'gandolf' }
      ]
      let discovery = 0;
      let retrieval = 0;
      mockHTTPRequest(async (method, url, payload, options) => {
        expect(method).to.match(/post/i);
        if (/discovery/.test(url)) {
          discovery++;
          expect(payload).to.have.property('id', 1);
          return {
            ids: objects.map(obj => obj.id),
            gns: objects.map(obj => obj.gn)
          };
        } else if (/retrieval/.test(url)) {
          retrieval++;
          expect(payload).to.have.property('ids').that.deep.equal([ 1 ]);
          return objects.filter((object) => {
            return payload.ids.includes(object.id);
          });
        }
      });
      const users1 = await dataSource.find(query);
      expect(users1[0]).to.have.property('id', objects[0].id);
      const users2 = await dataSource.find(query);
      expect(discovery).to.equal(1);
      expect(retrieval).to.equal(1);
    })
    it('should return objects from cache without hitting remote server when the object count matches and the objects are retrieved recently', async function() {
      // put objects into cache first
      const location = { address: 'http://moria.me', schema: 'global', table: 'user' };
      const rtime = Moment().toISOString();
      const objects = [
        { id: 1, gn: 70, username: 'gandolf', rtime },
        { id: 2, gn: 3, username: 'bilbo', rtime },
      ];
      await cache.save(location, objects);
      const query = {
        address: location.address,
        schema: 'global',
        table: 'user',
        criteria: {
          id: [ 1, 2 ]
        }
      };
      let discovery = 0;
      let retrieval = 0;
      mockHTTPRequest(async (method, url, payload, options) => {
        expect(method).to.match(/post/i);
        if (/discovery/.test(url)) {
          discovery++;
          return {
            ids: objects.map(obj => obj.id),
            gns: objects.map(obj => obj.gn)
          };
        } else if (/retrieval/.test(url)) {
          retrieval++;
          return objects.filter((object) => {
            return payload.ids.includes(object.id);
          });
        }
      });
      const users = await dataSource.find(query);
      expect(discovery).to.equal(0);
      expect(retrieval).to.equal(0);
      expect(users[0]).to.have.property('id', objects[0].id);
      expect(users[1]).to.have.property('id', objects[1].id);
    })
    it('should return objects from cache then perform a server-side check when cached objects might be stale', async function() {
      const location = { address: 'http://level2.moria.me', schema: 'global', table: 'user' };
      const rtime = Moment().subtract(1, 'day').toISOString();
      const objects = [
        { id: 1, gn: 70, username: 'gandolf', rtime },
        { id: 2, gn: 3, username: 'bilbo', rtime },
      ];
      await cache.save(location, objects);
      const query = {
        address: location.address,
        schema: 'global',
        table: 'user',
        criteria: {
          id: [ 1, 2 ]
        },
        blocking: 'stale',
      };
      let discovery = 0;
      let retrieval = 0;
      mockHTTPRequest(async (method, url, payload, options) => {
        if (/discovery/.test(url)) {
          discovery++;
          return {
            ids: objects.map(obj => obj.id),
            gns: objects.map(obj => obj.gn)
          };
        } else if (/retrieval/.test(url)) {
          retrieval++;
          return objects.filter((object) => {
            return payload.ids.includes(object.id);
          });
        }
      });
      const users = await dataSource.find(query);
      expect(discovery).to.equal(1);
      expect(retrieval).to.equal(0);
      expect(users[0]).to.have.property('id', objects[0].id);
      expect(users[1]).to.have.property('id', objects[1].id);
    })
    it('should update object whose gn has changed', async function() {
      const changeEventPromise = promiseSelf();
      dataSource.addEventListener('change', changeEventPromise.resolve);
      const location = { address: 'http://level3.moria.me', schema: 'global', table: 'user' };
      const rtime = Moment().subtract(1, 'day').toISOString();
      const objects = [
        { id: 1, gn: 70, username: 'gandolf', rtime },
        { id: 2, gn: 3, username: 'bilbo', rtime },
      ];
      await cache.save(location, objects);
      // bump gn
      objects[1] = { ...objects[1]) };
      objects[1].gn++;
      const query = {
        address: location.address,
        schema: 'global',
        table: 'user',
        criteria: {
          id: [ 1, 2 ]
        }
      };
      let discovery = 0;
      let retrieval = 0;
      mockHTTPRequest(async (method, url, payload, options) => {
        await delay(50);
        if (/discovery/.test(url)) {
          discovery++;
          return {
            ids: objects.map(obj => obj.id),
            gns: objects.map(obj => obj.gn)
          };
        } else if (/retrieval/.test(url)) {
          expect(payload).to.have.property('ids').that.deep.equal([ objects[1].id ])
          retrieval++;
          return objects.filter((object) => {
            return payload.ids.includes(object.id);
          });
        }
      });
      const users1 = await dataSource.find(query);
      // the cached objects are returned first
      expect(discovery).to.equal(0);
      expect(retrieval).to.equal(0);
      expect(users1).to.have.property('length', 2);
      expect(users1[1]).to.have.property('id', objects[1].id);
      expect(users1[1]).to.have.property('gn', objects[1].gn - 1);

      // wait for change event
      await changeEventPromise;

      // second query should yield updated object
      const users2 = await dataSource.find(query);
      expect(discovery).to.equal(1);
      expect(retrieval).to.equal(1);
      expect(users2[1]).to.have.property('id', objects[1].id);
      expect(users2[1]).to.have.property('gn', objects[1].gn);
    })
    it('should return objects from cache on an open-ended search, perform discovery, then conclude that the initial result set was correct', async function() {
      const changeEventPromise = promiseSelf();
      dataSource.addEventListener('change', changeEventPromise.resolve);
      const location = { address: 'http://level4.moria.me', schema: 'global', table: 'user' };
      const rtime = Moment().toISOString();
      const objects = [
        { id: 1, gn: 70, username: 'gandolf', rtime },
        { id: 2, gn: 3, username: 'bilbo', rtime },
      ];
      await cache.save(location, objects);
      const query = {
        address: location.address,
        schema: 'global',
        table: 'user',
        criteria: {},
        blocking: 'never',
      };
      let discovery = 0;
      let retrieval = 0;
      mockHTTPRequest(async (method, url, payload, options) => {
        if (/discovery/.test(url)) {
          await delay(50);
          discovery++;
          return {
            ids: objects.map(obj => obj.id),
            gns: objects.map(obj => obj.gn)
          };
        } else if (/retrieval/.test(url)) {
          retrieval++;
          return objects.filter((object) => {
            return payload.ids.includes(object.id);
          });
        }
      });
      const users1 = await dataSource.find(query);
      expect(discovery).to.equal(0);
      expect(retrieval).to.equal(0);
      expect(users1).to.have.property('length', 2);

      await delay(100);
      expect(discovery).to.equal(1);
      expect(retrieval).to.equal(0);

      const result = await Promise.race([
        changeEventPromise,
        delay(500).then(() => 'no event')
      ]);
      expect(result).to.equal('no event');
    })
    it('should return objects from cache, perform discovery, then retrieve an additional object', async function() {
      const changeEventPromise = promiseSelf();
      dataSource.addEventListener('change', changeEventPromise.resolve);
      const location = { address: 'http://level5.moria.me', schema: 'global', table: 'user' };
      const rtime = Moment().toISOString();
      const objects = [
        { id: 1, gn: 70, username: 'gandolf', rtime },
        { id: 2, gn: 3, username: 'bilbo', rtime },
      ];
      await cache.save(location, objects);
      objects.push({ id: 3, gn: 1, username: 'sauron' });
      const query = {
        address: location.address,
        schema: 'global',
        table: 'user',
        criteria: {},
        blocking: 'never'
      };
      let discovery = 0;
      let retrieval = 0;
      mockHTTPRequest(async (method, url, payload, options) => {
        await delay(50);
        if (/discovery/.test(url)) {
          discovery++;
          return {
            ids: objects.map(obj => obj.id),
            gns: objects.map(obj => obj.gn)
          };
        } else if (/retrieval/.test(url)) {
          retrieval++;
          return objects.filter((object) => {
            return payload.ids.includes(object.id);
          });
        }
      });
      const users1 = await dataSource.find(query);
      expect(discovery).to.equal(0);
      expect(retrieval).to.equal(0);
      expect(users1).to.have.property('length', 2);
      await changeEventPromise;

      const users2 = await dataSource.find(query);
      expect(discovery).to.equal(1);
      expect(retrieval).to.equal(1);
      expect(users2).to.have.property('length', 3);
    })
    it('should not perform remote search when there is no connection', async function() {
      const changeEventPromise = promiseSelf();
      dataSource.addEventListener('change', changeEventPromise.resolve);
      dataSource.deactivate();
      const location = { address: 'http://level6.moria.me', schema: 'global', table: 'user' };
      const rtime = Moment().toISOString();
      const objects = [
        { id: 1, gn: 70, username: 'gandolf', rtime },
        { id: 2, gn: 3, username: 'bilbo', rtime },
      ];
      await cache.save(location, objects);
      objects.push({ id: 3, gn: 1, username: 'sauron' });
      const query = {
        address: location.address,
        schema: 'global',
        table: 'user',
        criteria: {}
      };
      let discovery = 0;
      let retrieval = 0;
      mockHTTPRequest(async (method, url, payload, options) => {
        await delay(50);
        if (/discovery/.test(url)) {
          discovery++;
          return {
            ids: objects.map(obj => obj.id),
            gns: objects.map(obj => obj.gn)
          };
        } else if (/retrieval/.test(url)) {
          retrieval++;
          return objects.filter((object) => {
            return payload.ids.includes(object.id);
          });
        }
      });
      const users = await dataSource.find(query);
      expect(discovery).to.equal(0);
      expect(retrieval).to.equal(0);
      expect(users).to.have.property('length', 2);

      const result = await Promise.race([
        changeEventPromise,
        delay(200).then(() => 'no event')
      ]);
      expect(result).to.equal('no event');
      dataSource.activate();
    })
  })
  describe('#save()', function() {
    it('should send an object to remote server and save result to cache', async function() {
      const changeEventPromise = promiseSelf();
      dataSource.addEventListener('change', changeEventPromise.resolve);
      const location = { address: 'http://level1.misty-mountain.me', schema: 'global', table: 'project' };
      const newObject = { name: 'anduril' };
      let storage = 0, id = 1;
      mockHTTPRequest(async (method, url, payload, options) => {
        await delay(50);
        if (/storage/.test(url)) {
          storage++;
          expect(method).to.match(/post/i);
          expect(payload).to.have.property('objects').that.is.an.instanceOf(Array);
          return payload.objects.map((object) => {
            object = _.clone(object);
            if (!object.id) {
              object.id = id++;
            }
            return object;
          });
        }
      });
      const savedObjects = await dataSource.save(location, [ newObject ]);
      for (const object of savedObjects) {
        const cachedObjects = await cache.find(location, { id: object.id });
        expect(cachedObjects).to.have.length(1);
      }
      const evt = await changeEventPromise;
      expect(evt).to.have.property('type', 'change');
    })
    it('should update an existing object', async function() {
      const changeEventPromise = promiseSelf();
      dataSource.addEventListener('change', changeEventPromise.resolve);
      const location = { address: 'http://level2.misty-mountain.me', schema: 'global', table: 'project' };
      const objects = [
        { id: 3, name: 'smeagol' }
      ];
      await cache.save(location, objects);
      let storage = 0;
      let discovery = 0;
      const updatedObject = _.clone(objects[0]);
      updatedObject.name = 'gollum';
      mockHTTPRequest(async (method, url, payload, options) => {
        await delay(50);
        if (/storage/.test(url)) {
          storage++;
          expect(method).to.match(/post/i);
          expect(payload).to.have.property('objects').that.is.an.instanceOf(Array);
          const object = _.clone(payload.objects[0]);
          objects[0] = object;
          return [ object ];
        } else if (/discovery/.test(url)) {
          discovery++;
          return {
            ids: objects.map(obj => obj.id),
            gns: objects.map(obj => obj.gn)
          };
        }
      });
      const savedObjects = await dataSource.save(location, [ updatedObject ]);
      for (const object of savedObjects) {
        const cachedObjects = await cache.find(location, { id: object.id });
        expect(cachedObjects).to.have.length(1);
        expect(cachedObjects[0]).to.have.property('name', updatedObject.name);
      }
      const evt = await changeEventPromise;
      expect(evt).to.have.property('type', 'change');
    })
    it('should make uncommitted objects available immediately when feature is on', async function() {
      const location = { address: 'http://level3.misty-mountain.me', schema: 'global', table: 'project' };
      const newObject = { name: 'anduril' };
      let storage = 0, id = 1;
      let discovery = 0;
      let retrieval = 0;
      const objects = []
      mockHTTPRequest(async (method, url, payload, options) => {
        if (/storage/.test(url)) {
          storage++;
          expect(method).to.match(/post/i);
          expect(payload).to.have.property('objects').that.is.an.instanceOf(Array);

          // wait for the search
          await presaveSearchPromise;

          // return the results only after we've done a search
          const object = _.clone(payload.objects[0]);
          object.id = id++;
          object.gn = 1;
          objects.push(object);
          return [ object ];
        } else if (/discovery/.test(url)) {
          discovery++;
          return {
            ids: objects.map(obj => obj.id),
            gns: objects.map(obj => obj.gn),
          };
        } else if (/retrieval/.test(url)) {
          retrieval++;
          return objects;
        }
      });

      // the logic here is a bit convoluted...
      //
      // 1. The first thing that happens is that we call save()
      // 2. save() will place newObject into the change queue
      // 3. save() then triggers a change event, which causes changeEventPromise
      //  (below) to fulfill itself
      // 4. at this point we run the query, which should yield newObject among
      //  the results (the feature we're testing)
      // 5. since save() would replace newObject with the saved version
      //  we want our pseudo-server code above to block until we've
      //  performed step 4, the reason why it waits for presaveSearchPromise
      // 6. once this happens, the pseudo-server code unblocks, and
      //  performHTTPRequest() returns
      // 7. save() now has the object "returned by the server", which is
      //  inserted into the cached query
      // 8. save() returns and we can check the results from step 4 now
      //  that we're inside the promise-chain given to Chai
      // 9. then we run the query again and check that the result of step 7
      const changeEventPromise = promiseSelf();
      dataSource.addEventListener('change', changeEventPromise.resolve);
      const presaveSearch = async () => {
        await changeEventPromise;
        dataSource.removeEventListener('change', changeEventPromise.resolve);

        // perform the query that should yield the object with temporary ID
        // blocking needs to be 'never' here, since the remote search will
        // wait for the save operation to finish (which would wait for the
        // promise returned by this function)
        const query = _.assign({ criteria: {}, blocking: 'never' }, location);
        return dataSource.find(query);
      };
      const presaveSearchPromise = presaveSearch();
      const savedObjects = await dataSource.save(location, [ newObject ]);
      // the promise should fulfill immediately
      const projectsImmediately = await presaveSearchPromise;
      // project should have a temporary ID
      expect(projectsImmediately).to.have.length(1);
      expect(projectsImmediately[0]).to.have.property('id').that.is.below(1);

      // this search should not trigger a remote search, since it's
      // the same as the one performed in the change event handler
      const query = _.assign({ criteria: {}, blocking: true }, location);
      const projectsLater = await dataSource.find(query);
      expect(projectsLater).to.have.length(1);
      expect(projectsLater[0]).to.have.property('id').that.is.at.least(1);
      expect(discovery).to.equal(1);
      expect(retrieval).to.equal(1);
    })
    it('should remove an object from search result when uncommitted changes mean it no longer matches criteria', async function() {
      const objects = [
        { id: 3, name: 'smeagol', evil: false }
      ];
      const updatedObject = _.clone(objects[0]);
      updatedObject.name = 'gollum';
      updatedObject.evil = true;
      mockHTTPRequest(async (method, url, payload, options) => {
        await delay(50);
        if (/discovery/.test(url)) {
          return {
            ids: objects.map(obj => obj.id),
            gns: objects.map(obj => obj.gn)
          };
        } else if (/retrieval/.test(url)) {
          return objects;
        }
      });
      const location = {
        address: 'http://gladden-fields.me',
        schema: 'global',
        table: 'hobbit',
      };
      const query = _.assign({
        criteria: { evil: false }
      }, location);
      const options = { delay: 1000 };
      const results1 = await dataSource.find(query);
      expect(results1).to.deep.equal(objects);
      dataSource.save(location, [ updatedObject ], options);
      const results2 = await dataSource.find(query);
      expect(results2).to.have.lengthOf(0);
    })
    it('should block search on a table until saving is complete', async function() {
      const location = { address: 'http://level4.misty-mountain.me', schema: 'global', table: 'project' };
      const newObject = { name: 'anduril' };
      let storage = 0, id = 1;
      let discovery = 0;
      let retrieval = 0;
      const objects = [];
      mockHTTPRequest(async (method, url, payload, options) => {
        if (/storage/.test(url)) {
          storage++;
          // make object available, then wait a bit
          const object = _.clone(payload.objects[0]);
          object.id = id++;
          object.gn = 1;
          objects.push(object);
          await delay(100);
          return [ object ];
        } else if (/discovery/.test(url)) {
          discovery++;
          return {
            ids: objects.map(obj => obj.id),
            gns: objects.map(obj => obj.gn),
          };
        } else if (/retrieval/.test(url)) {
          retrieval++;
          return objects;
        }
      });
      dataSource.save(location, [ newObject ]);
      const projects = await dataSource.find(location, {});
      // it would return two objects--the uncommitted and the committed
      // one if search is allowed to proceed before before a save() is
      // finished
      expect(projects).to.have.length(1);
    })
    it('should merge multiple deferred saves', async function() {
      const event = null;
      const additionalSavePromises = [];
      const additionalSavesTriggeredPromise = promiseSelf();
      dataSource.addEventListener('change', () => {
        const num = additionalSavePromises.length + 1;
        if (num <= 4) {
          // load the only object and modify it
          const query = _.assign({ criteria: {} }, location);
          const save = async (num) => {
            const objects = await dataSource.find(query);
            const object = objects[0];
            // should still be uncommitted at this point
            expect(object).to.have.property('id').that.is.below(1);
            expect(object).to.have.property('uncommitted').that.is.true;
            object = _.clone(object);
            object['prop' + num] = num;
            return dataSource.save(location, [ object ], { delay: 200 });
          };
          const promise = save(num);
          additionalSavePromises.push(promise);
        } else {
          additionalSavesTriggeredPromise.resolve();
        }
      });
      const location = { address: 'http://level5.misty-mountain.me', schema: 'global', table: 'project' };
      const newObject = { name: 'anduril' };
      let storage = 0, id = 1;
      let discovery = 0;
      let retrieval = 0;
      const objects = [];
      mockHTTPRequest(async (method, url, payload, options) => {
        if (/storage/.test(url)) {
          storage++;
          const object = _.clone(payload.objects[0]);
          object.id = id++;
          object.gn = 1;
          objects.push(object);
          return [ object ];
        } else if (/discovery/.test(url)) {
          discovery++;
          return {
            ids: objects.map(obj => obj.id),
            gns: objects.map(obj => obj.gn),
          };
        } else if (/retrieval/.test(url)) {
          retrieval++;
          return objects;
        }
      });
      const savedObjects = await dataSource.save(location, [ newObject ], { delay: 200 });
      // initial call should get canceled
      expect(savedObjects).to.have.length(0);

      // wait for addition saves to be triggered
      await additionalSavesTriggeredPromise;

      const results = await Promise.all(additionalSavePromises);
      expect(storage).to.equal(1);
      // all but the last should be canceled
      expect(results[0]).to.have.length(0);
      expect(results[1]).to.have.length(0);
      expect(results[2]).to.have.length(0);
      expect(results[3]).to.have.length(1);
      const savedObject = results[3][0];
      expect(savedObject).to.have.property('id').that.is.at.least(1);
      expect(savedObject).to.have.property('prop1', 1);
      expect(savedObject).to.have.property('prop2', 2);
      expect(savedObject).to.have.property('prop3', 3);
      expect(savedObject).to.have.property('prop4', 4);
    })
    it('should save objects to local schema', async function() {
      const location = {
        schema: 'local',
        table: 'bob'
      };
      const newObject = {
        key: 'old',
        details: {
          age: 87
        }
      };
      await dataSource.save(location, [ newObject ]);
      cache.reset();
      const objects = await dataSource.find(location);
      expect(objects[0]).to.deep.equal(newObject);
    })
  })
  describe('#remove()', function() {
    it('should try to remove an object', async function() {
      const changeEventPromise = promiseSelf();
      dataSource.addEventListener('change', changeEventPromise.resolve);
      const location = { address: 'http://level1.lonely-mountain.me', schema: 'global', table: 'project' };
      const existingObject = { id: 1, name: 'smaug' };
      let storage = 0;
      mockHTTPRequest(async (method, url, payload, options) => {
        await delay(50);
        if (/storage/.test(url)) {
          storage++;
          expect(method).to.match(/post/i);
          expect(payload).to.have.property('objects').that.is.an.instanceOf(Array);
          return payload.objects.map((object) => {
            expect(object.deleted).to.be.true;
            return _.clone(object);
          });
        }
      });
      const objects = await dataSource.remove(location, [ existingObject ]);
      expect(storage).to.equal(1);
      const evt = await changeEventPromise;
      expect(evt).to.have.property('type', 'change');
    })
    it('should keep a delete request in the change queue when there is no connection and send it when connection is restored', async function() {
      dataSource.options.discoveryFlags = {
        include_uncommitted: true
      };
      const location = { address: 'http://level2.lonely-mountain.me', schema: 'global', table: 'project' };
      const objects = [ { id: 1, gn: 2, name: 'smaug' } ];
      let storage = 0;
      mockHTTPRequest(async (method, url, payload, options) => {
        await delay(50);
        if (/storage/.test(url)) {
          storage++;
          return payload.objects.map((object) => {
            return _.clone(object);
          });
        } else if (/discovery/.test(url)) {
          return {
            ids: objects.map(obj => obj.id),
            gns: objects.map(obj => obj.gn),
          };
        } else if (/retrieval/.test(url)) {
          return objects;
        }
      });
      // create a search first
      const query = _.extend(location, { criteria: {} });
      const found1 = await dataSource.find(query);
      expect(found1).to.have.lengthOf(1);

      // deactivate data source
      dataSource.deactivate();

      // this call will stall
      const removalPromise = dataSource.remove(location, [ objects[0] ]);
      const result = await Promise.race([
        removalPromise,
        delay(100).then(() => 'stalled')
      ]);
      expect(result).to.equal('stalled');

      expect(storage).to.equal(0);
      const found2 = await dataSource.find(query);
      // merging uncommitted delete into result
      expect(found2).to.have.lengthOf(0);

      // reactivate data source
      dataSource.activate();

      await removalPromise;
      expect(storage).to.equal(1);
    })
    it('should remove an object from local schema', async function() {
      const location = {
        schema: 'local',
        table: 'bob'
      };
      const newObject = {
        key: 'old',
        details: {
          age: 87
        }
      };
      await dataSource.save(location, [ newObject ]);
      await dataSource.remove(location, [ newObject ]);
      cache.reset();
      const objects = await dataSource.find(location);
      expect(objects).to.have.lengthOf(0);
    })
  })
  describe('#abandon()', function() {
    it('should make searches at a given server dirty', async function() {
      const location = { address: 'http://toilet.helms-deep.me', schema: 'global', table: 'project' };
      const objects = [ { id: 1, gn: 2, name: 'fart' } ];
      let discovery = 0, retrieval = 0;
      mockHTTPRequest(async (method, url, payload, options) => {
        await delay(50);
        if (/discovery/.test(url)) {
          discovery++;
          return {
            ids: objects.map(obj => obj.id),
            gns: objects.map(obj => obj.gn),
          };
        } else if (/retrieval/.test(url)) {
          retrieval++;
          return objects;
        }
      });
      const query = _.extend(location, { blocking: 'expired', criteria: {} });
      const found1 = await dataSource.find(query);
      expect(found1).to.have.lengthOf(1);
      expect(discovery).to.equal(1);
      expect(retrieval).to.equal(1);

      // wait for cache write to complete
      await delay(500);
      const found2 = await cache.find(query);
      expect(found2).to.have.lengthOf(1);

      await dataSource.abandon(location.address, location.schema);

      const found3 = await dataSource.find(query);
      expect(found3).to.have.lengthOf(1);
      // a discovery will occur again, since the criteria is open-ended
      // as the gn hasn't changed, the no retrieval will occur
      expect(discovery).to.equal(2);
      expect(retrieval).to.equal(1);
    })
  })
  describe('#invalidate()', function() {
    it('should flag searches as dirty based on change info', async function() {
      const location = { address: 'http://kitchen.helms-deep.me', schema: 'global', table: 'project' };
      let objects = [ { id: 1, gn: 2, name: 'milk' } ];
      let discovery = 0, retrieval = 0;
      mockHTTPRequest(async (method, url, payload, options) => {
        await delay(50);
        if (/discovery/.test(url)) {
          discovery++;
          return {
            ids: objects.map(obj => obj.id),
            gns: objects.map(obj => obj.gn),
          };
        } else if (/retrieval/.test(url)) {
          retrieval++;
          return objects;
        }
      });
      const query = _.extend(location, { criteria: {} });
      const found1 = await dataSource.find(query);
      expect(found1).to.have.lengthOf(1);
      expect(discovery).to.equal(1);
      expect(retrieval).to.equal(1);

      objects = [ { id: 1, gn: 3, name: 'cheese' } ];
      const changes = [
        {
          address: location.address,
          schema: 'global',
          table: 'project',
          id: 1,
          gn: 3,
        }
      ];
      await dataSource.invalidate(changes);

      const changeEventPromise = promiseSelf();
      dataSource.addEventListener('change', changeEventPromise.resolve);

      const found2 = await dataSource.find(query);
      expect(found2).to.deep.equal(found1);
      // the initial call to find() will return what we got before
      await changeEventPromise;
      // a subsequent call triggered by change event will actually find
      // the updated results
      const found3 = await dataSource.find(query);
      expect(found3[0]).to.have.property('gn', 3);
      expect(discovery).to.equal(2);
      expect(retrieval).to.equal(2);
    })
    it('should flag all searches at all servers as dirty when no change info is given', async function() {
      mockHTTPRequest(async (method, url, payload, options) => {
        if (/discovery/.test(url)) {
          return { ids: [], gns: [] };
        } else if (/retrieval/.test(url)) {
          return [];
        }
      });
      const queries = [
        { address: 'http://mirkwood.me', schema: 'global', table: 'project', criteria: {}, blocking: true },
        { address: 'http://mirkwood.me', schema: 'global', table: 'user', criteria: {}, blocking: true },
        { address: 'http://mirkwood.me', schema: 'global', table: 'smerf', criteria: {}, blocking: true },
        { address: 'http://rivendell.me', schema: 'global', table: 'project', criteria: {}, blocking: true },
      ];
      for (const query of queries) {
        await dataSource.find(query);
      }
      await dataSource.invalidate();
      const searches = dataSource.recentSearchResults;
      for (const search of searches) {
        expect(search.dirty).to.be.true;
      }
    })
    it('should trigger merging of remote changes', async function() {
      const location = { address: 'http://arnor.me', schema: 'global', table: 'project' };
      let objects = [ { id: 7, gn: 1, name: 'piglet' } ];
      const changedObject = { id: 7, gn: 1, name: 'lizard' };
      let onConflictCalled = false;
      const onConflict = function(evt) {
        onConflictCalled = true;
        expect(evt).to.have.property('type', 'conflict');
        expect(evt).to.have.property('local');
        expect(evt).to.have.property('remote').that.has.property('gn', 2);
        // pretend we've performed a merge
        evt.local.name = 'merged'
        // default reaction is to drop the change
        evt.preventDefault();
      };
      let discovery = 0, retrieval = 0, storage = 0;
      mockHTTPRequest(async (method, url, payload, options) => {
        await delay(50);
        if (/discovery/.test(url)) {
          discovery++;
          return {
            ids: objects.map(obj => obj.id),
            gns: objects.map(obj => obj.gn),
          };
        } else if (/retrieval/.test(url)) {
          retrieval++;
          return objects;
        } else if (/storage/.test(url)) {
          storage++;
          expect(payload.objects[0]).to.have.property('name', 'merged');
          return payload.objects;
        }
      });
      // initiate a deferred save
      const options = { delay: 500, onConflict };
      const savePromise = dataSource.save(location, [ changedObject ], options);
      // simulate a change by someone else in the meantime
      objects = [ { id: 7, gn: 2, name: 'cat' } ];
      const changes = [
        {
          address: location.address,
          schema: 'global',
          table: 'project',
          id: 7,
          gn: 2,
        }
      ];
      await dataSource.invalidate(changes);
      // wait for save() to finish
      const results = await savePromise;
      expect(results).to.have.lengthOf(1);
      expect(onConflictCalled).to.be.true;
      expect(retrieval).to.equal(1);
      expect(storage).to.equal(1);
    })
    it('should force the abandonment of a change when onConflict is not set', async function() {
      const location = { address: 'http://esgaroth.me', schema: 'global', table: 'project' };
      let objects = [ { id: 7, gn: 1, name: 'piglet' } ];
      const changedObject = { id: 7, gn: 1, name: 'lizard' };
      let discovery = 0, retrieval = 0, storage = 0;
      mockHTTPRequest(async (method, url, payload, options) => {
        await delay(50);
        if (/discovery/.test(url)) {
          discovery++;
          return {
            ids: objects.map(obj => obj.id),
            gns: objects.map(obj => obj.gn),
          };
        } else if (/retrieval/.test(url)) {
          retrieval++;
          return objects;
        } else if (/storage/.test(url)) {
          storage++;
          return payload.objects;
        }
      });
      // initiate a deferred save
      const options = { delay: 500 };
      const savePromise = dataSource.save(location, [ changedObject ], options);
      // simulate a change by someone else in the meantime
      objects = [ { id: 7, gn: 2, name: 'cat' } ];
      const changes = [
        {
          address: location.address,
          schema: 'global',
          table: 'project',
          id: 7,
          gn: 2,
        }
      ];
      await dataSource.invalidate(changes);
      // wait for save() to finish
      const results = await savePromise;
      expect(results).to.have.lengthOf(0);
      expect(storage).to.equal(0);
    })
    it('should force the abandonment of a change when onConflict does not call preventDefault', async function() {
      const location = { address: 'http://fangorn.me', schema: 'global', table: 'project' };
      let objects = [ { id: 7, gn: 1, name: 'piglet' } ];
      const changedObject = { id: 7, gn: 1, name: 'lizard' };
      let onConflictCalled = false;
      const onConflict = function(evt) {
        onConflictCalled = true;
      };
      let discovery = 0, retrieval = 0, storage = 0;
      mockHTTPRequest(async (method, url, payload, options) => {
        await delay(50);
        if (/discovery/.test(url)) {
          discovery++;
          return {
            ids: objects.map(obj => obj.id),
            gns: objects.map(obj => obj.gn),
          };
        } else if (/retrieval/.test(url)) {
          retrieval++;
          return objects;
        } else if (/storage/.test(url)) {
          storage++;
          return payload.objects;
        }
      });
      // initiate a deferred save
      const options = { delay: 500, onConflict };
      const savePromise = dataSource.save(location, [ changedObject ], options);
      // simulate a change by someone else in the meantime
      objects = [ { id: 7, gn: 2, name: 'cat' } ];
      const changes = [
        {
          address: location.address,
          schema: 'global',
          table: 'project',
          id: 7,
          gn: 2,
        }
      ];
      await dataSource.invalidate(changes);
      // wait for save() to finish
      const results = await savePromise;
      expect(results).to.have.lengthOf(0);
      expect(onConflictCalled).to.be.true;
      expect(retrieval).to.equal(1);
      expect(storage).to.equal(0);
    })
  })
  describe('#revalidate()', function() {
    it ('should force cache revalidation', async function() {
      const query = {
        address: 'http://narchost.me',
        schema: 'global',
        table: 'user',
        criteria: {},
        blocking: 'expired',
      };
      const objects = [
        { id: 1, gn: 70, username: 'gandolf', secret: 'magic' }
      ]
      let filtering = false;
      let discovery = 0;
      let retrieval = 0;
      let signature = 0;
      mockHTTPRequest(async (method, url, payload, options) => {
        if (/discovery/.test(url)) {
          discovery++;
          return {
            ids: objects.map(obj => obj.id),
            gns: objects.map(obj => obj.gn),
          };
        } else if (/retrieval/.test(url)) {
          retrieval++;
          if (filtering) {
            return objects.map((object) => {
              return _.omit(object, 'secret');
            });
          } else {
            return objects;
          }
        } else if (/signature/.test(url)) {
          signature++;
          if (filtering) {
            return { signature: 'hello' };
          } else {
            return { signature: 'world' };
          }
        }
      });
      const users1 = await dataSource.find(query);
      expect(users1[0]).to.have.property('secret');
      expect(discovery).to.equal(1);
      expect(retrieval).to.equal(1);
      expect(signature).to.equal(1);
      filtering = true;
      await dataSource.revalidate();
      await dataSource.invalidate();
      const users2 = await dataSource.find(query);
      expect(users2[0]).to.not.have.property('secret');
      expect(discovery).to.equal(2);
      expect(retrieval).to.equal(2);
      expect(signature).to.equal(2);
    })
  })

  describe('#waitForChange()', function() {
    it ('should wait for change notification', async function() {
      const location = {
        address: 'http://dol-guldur.me',
        schema: 'global',
        table: 'user',
      };
      const object = { id: 1, gn: 70, username: 'gandolf', secret: 'magic' };
      setTimeout(() => {
        const changes = [
          {
            address: 'http://dol-guldur.me',
            schema: 'global',
            table: 'user',
            id: 1,
            gn: 71
          }
        ];
        dataSource.invalidate(changes)
      }, 50);
      const result = await dataSource.waitForChange(location, object, 100);
      expect(result).to.be.true;
    })
    it ('should quit waiting for change notification', async function() {
      const location = {
        address: 'http://dol-guldur.me',
        schema: 'global',
        table: 'user',
      };
      const object = { id: 1, gn: 70, username: 'gandolf', secret: 'magic' };
      const result = await dataSource.waitForChange(location, object, 100);
      expect(result).to.be.false;
    })
    it ('should should not return true when a different object changed', async function() {
      const location = {
        address: 'http://dol-guldur.me',
        schema: 'global',
        table: 'user',
      };
      const object = { id: 1, gn: 70, username: 'gandolf', secret: 'magic' };
      setTimeout(() => {
        const changes = [
          {
            address: 'http://dol-guldur.me',
            schema: 'global',
            table: 'user',
            id: 3,
            gn: 71
          }
        ];
        dataSource.invalidate(changes)
      }, 50);
      const result = await dataSource.waitForChange(location, object, 100);
      expect(result).to.be.false;
    })
  })
})
