import _ from 'lodash';
import Bluebird from 'bluebird';
import Moment from 'moment';
import Chai, { expect } from 'chai';
import ChaiAsPromised from 'chai-as-promised';
import ManualPromise from 'utils/manual-promise';

Chai.use(ChaiAsPromised);

import RemoteDataSource from 'data/remote-data-source';
import IndexedDBCache from 'data/indexed-db-cache';
import * as HTTPRequest from 'transport/http-request';
import HTTPError from 'errors/http-error';

describe('RemoteDataSource', function() {
    before(function() {
        indexedDB.deleteDatabase('rds-test');
    })
    let fetchOriginal = HTTPRequest.fetch;
    after(function() {
        HTTPRequest.fetch = fetchOriginal;
    })

    let cache = new IndexedDBCache({ databaseName: 'rds-test' });
    let dataSourceOptions = {
        discoveryFlags: {
        },
        retrievalFlags: {
        },
        prefetching: false,
        sessionRetryInterval: 100,
        cacheValidation: false,
        cache,
    };
    let dataSource = new RemoteDataSource(dataSourceOptions);
    dataSource.activate();
    afterEach(() => {
        dataSource.listeners = [];
    })

    describe('#beginSession()', function() {
        it('should initiate a session', async function() {
            let location = { address: 'http://mordor.me' };
            let session = { handle: 'abcdefg' };
            let system = { details: { en: 'Test' } };
            let servers = [ { id: 1, type: 'gitlab' } ];
            HTTPRequest.fetch = async (method, url, payload, options) => {
                expect(method).to.match(/post/i);
                expect(url).to.contain(location.address);
                expect(payload).to.have.property('area', 'client');
                return { session, system, servers };
            };
            let result = await dataSource.beginSession(location, 'client');
            expect(result).to.have.property('system').that.deep.equals(system);
            expect(result).to.have.property('servers').that.deep.equals(servers);
        })
        it('should return a fulfilled promise when session was created already', async function() {
            let location = { address: 'http://rohan.me' };
            let session = { handle: 'abcdefg' };
            let system = { details: { en: 'Test' } };
            let servers = [ { id: 1, type: 'gitlab' } ];
            HTTPRequest.fetch = async (method, url, payload, options) => {
                return { session, system, servers };
            };
            let promise1 = dataSource.beginSession(location, 'client');
            let promise2 = dataSource.beginSession(location, 'client');
            expect(promise1).to.equal(promise2);
        })
    })
    describe('#checkAuthorization()', function() {
        it('should fire authorization event when remote server indicates session is authorized', async function() {
            let authorizationEventPromise = ManualPromise();
            dataSource.addEventListener('authorization', authorizationEventPromise.resolve);
            let location = { address: 'http://isengard.me' };
            let session = { handle: 'abcdefg' };
            let sessionLater = {
                token: '123456789',
                user_id: 7,
                etime: Moment().add(1, 'day').toISOString(),
            };
            let system = { details: { en: 'Test' } };
            let servers = [ { id: 1, type: 'gitlab' } ];
            HTTPRequest.fetch = async (method, url, payload, options) => {
                return { session, system, servers };
            };
            await dataSource.beginSession(location, 'client');
            expect(dataSource.hasAuthorization(location)).to.be.false;
            HTTPRequest.fetch = async (method, url, payload, options) => {
                expect(method).to.match(/get/i);
                expect(payload).to.have.property('handle', session.handle);
                return { session: sessionLater };
            };
            let authorized = await dataSource.checkAuthorization(location);
            expect(authorized).to.be.true;
            expect(dataSource.hasAuthorization(location)).to.be.true;
            let evt = await authorizationEventPromise;
            expect(evt).to.have.property('session');
            expect(evt.session).to.have.property('token');
            expect(evt.session).to.have.property('user_id');
            expect(evt.session).to.have.property('etime');
        })
        it('should simply return false when session is not authorized', async function() {
            let expirationEventPromise = ManualPromise();
            let violationEventPromise = ManualPromise();
            dataSource.addEventListener('expiration', expirationEventPromise.resolve);
            dataSource.addEventListener('violation', violationEventPromise.resolve);
            let location = { address: 'http://dunland.me' };
            let session = { handle: 'abcdefg' };
            let system = { details: { en: 'Test' } };
            let servers = [ { id: 1, type: 'gitlab' } ];
            HTTPRequest.fetch = async (method, url, payload, options) => {
                return { session, system, servers };
            };
            await dataSource.beginSession(location, 'client');
            expect(dataSource.hasAuthorization(location)).to.be.false;
            HTTPRequest.fetch = async (method, url, payload, options) => {
                return {};
            };
            let authorized = await dataSource.checkAuthorization(location);
            expect(dataSource.hasAuthorization(location)).to.be.false;
            expect(authorized).to.be.false;
            let result = await Bluebird.race([
                expirationEventPromise,
                violationEventPromise,
                Bluebird.resolve('no event').delay(200)
            ]);
            expect(result).to.equal('no event');
        })
    })
    describe('#authenticate()', function() {
        it('should trigger authorization event when server accepts username/password', async function() {
            let authorizationEventPromise = ManualPromise();
            dataSource.addEventListener('authorization', authorizationEventPromise.resolve);
            let location = { address: 'http://mdoom.mordor.me' };
            let session = { handle: 'abcdefg' };
            let sessionLater = {
                token: '123456789',
                user_id: 3,
                etime: Moment().add(1, 'day').toISOString(),
            };
            let system = { details: { en: 'Test' } };
            let servers = [ { id: 1, type: 'gitlab' } ];
            let username = 'frodo';
            let password = 'precious';
            HTTPRequest.fetch = async (method, url, payload, options) => {
                return { session, system, servers };
            };
            await dataSource.beginSession(location, 'client');
            expect(dataSource.hasAuthorization(location)).to.be.false;
            HTTPRequest.fetch = async (method, url, payload, options) => {
                expect(method).to.match(/post/i);
                expect(payload).to.have.property('handle', session.handle);
                expect(payload).to.have.property('username', username);
                expect(payload).to.have.property('password', password);
                return { session: sessionLater };
            };
            let credentials = {
                type: 'password',
                username,
                password
            };
            await dataSource.authenticate(location, credentials);
            expect(dataSource.hasAuthorization(location)).to.be.true;
            let evt = await authorizationEventPromise;
            expect(evt).to.have.property('session');
            expect(evt.session).to.have.property('token');
            expect(evt.session).to.have.property('user_id');
            expect(evt.session).to.have.property('etime');
        })
        it('should reject when username/password are wrong, with error object containing information sent by server', async function() {
            let changeEventPromise = ManualPromise();
            let expirationEventPromise = ManualPromise();
            let violationEventPromise = ManualPromise();
            dataSource.addEventListener('change', changeEventPromise.resolve);
            dataSource.addEventListener('expiration', expirationEventPromise.resolve);
            dataSource.addEventListener('violation', violationEventPromise.resolve)
            let location = { address: 'http://rivendell.me' };
            let session = { handle: 'abcdefg' };
            let system = { details: { en: 'Test' } };
            let servers = [ { id: 1, type: 'gitlab' } ];
            let username = 'frodo';
            let password = 'precious';
            HTTPRequest.fetch = async (method, url, payload, options) => {
                return { session, system, servers };
            };
            await dataSource.beginSession(location, 'client');
            expect(dataSource.hasAuthorization(location)).to.be.false;
            HTTPRequest.fetch = async (method, url, payload, options) => {
                throw new HTTPError(401, {
                    message: 'username/password are wrong',
                    reason: 'dark-magic',
                });
            };
            let credentials = {
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
            let result = await Promise.race([
                changeEventPromise,
                expirationEventPromise,
                violationEventPromise,
                Bluebird.resolve('no event').delay(100)
            ]);
            expect(result).to.equal('no event');
        })
        it('should trigger change event to restart session when failure is other than 401 Unauthorized', async function() {
            let changeEventPromise = ManualPromise();
            let expirationEventPromise = ManualPromise();
            let violationEventPromise = ManualPromise();
            dataSource.addEventListener('change', changeEventPromise.resolve);
            dataSource.addEventListener('expiration', expirationEventPromise.resolve);
            dataSource.addEventListener('violation', violationEventPromise.resolve)
            let location = { address: 'http://rivendell.me' };
            let session = { handle: 'abcdefg' };
            let system = { details: { en: 'Test' } };
            let servers = [ { id: 1, type: 'gitlab' } ];
            let username = 'frodo';
            let password = 'precious';
            HTTPRequest.fetch = async (method, url, payload, options) => {
                return { session, system, servers };
            };
            await dataSource.beginSession(location, 'client');
            HTTPRequest.fetch = async (method, url, payload, options) => {
                throw new HTTPError(404, {
                    message: 'Session has disappeared!',
                    reason: 'one-ring',
                });
            };
            let credentials = {
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
            let evt = await Promise.race([ changeEventPromise, expirationEventPromise, violationEventPromise ]);
            expect(evt).to.have.property('type', 'change');
        })
    })
    describe('#endSession()', function() {
        it('should end a session', async function() {
            let location = { address: 'http://helms-deep.me' };
            let session = { handle: 'abcdefg' };
            let system = { details: { en: 'Test' } };
            let servers = [ { id: 1, type: 'gitlab' } ];
            let username = 'frodo';
            let password = 'precious';
            HTTPRequest.fetch = async (method, url, payload, options) => {
                return { session, system, servers };
            };
            await dataSource.beginSession(location, 'client');
            HTTPRequest.fetch = async (method, url, payload, options) => {
                expect(method).to.match(/delete/i);
                expect(payload).to.property('handle', session.handle);
                return {};
            };
            await dataSource.endSession(location);
            expect(dataSource.hasAuthorization(location)).to.be.false;
        })
    })
    describe('#getOAuthURL()', function() {
        it('should return a URL for logging in through OAuth', async function() {
            let location = { address: 'http://helms-deep.me' };
            let session = { handle: 'abcdefg' };
            let system = { details: { en: 'Test' } };
            let servers = [ { id: 1, type: 'gitlab' } ];
            let username = 'frodo';
            let password = 'precious';
            HTTPRequest.fetch = async (method, url, payload, options) => {
                return { session, system, servers };
            };
            await dataSource.beginSession(location, 'client');
            let url1 = dataSource.getOAuthURL(location, servers[0]);
            let url2 = dataSource.getOAuthURL(location, servers[0], 'test');
            let url3 = dataSource.getOAuthURL(location, servers[0], 'activation');
            expect(url1).to.equal('http://helms-deep.me/srv/session/gitlab/?sid=1&handle=abcdefg');
            expect(url2).to.equal('http://helms-deep.me/srv/session/gitlab/?sid=1&handle=abcdefg&test=1');
            expect(url3).to.equal('http://helms-deep.me/srv/session/gitlab/?sid=1&handle=abcdefg&activation=1');
        })
    })
    describe('#restoreAuthorization()', function() {
        it('should add a session', async function() {
            let session = {
                handle: 'abcdefg',
                address: 'http://minas-tirith.me',
                token: '123456789',
                user_id: 3,
                area: 'client',
                etime: Moment().add(1, 'day').toISOString(),
            };
            let location = { address: session.address };
            expect(dataSource.hasAuthorization(location)).to.be.false;
            let restored = dataSource.restoreAuthorization(location, session);
            expect(restored).to.be.true;
            expect(dataSource.hasAuthorization(location)).to.be.true;
        })
        it('should not add an expired session', async function() {
            let session = {
                handle: 'abcdefg',
                address: 'http://angmar.me',
                token: '123456789',
                user_id: 3,
                area: 'client',
                etime: Moment().subtract(1, 'day').toISOString(),
            };
            let location = { address: session.address };
            expect(dataSource.hasAuthorization(location)).to.be.false;
            let restored = dataSource.restoreAuthorization(location, session);
            expect(restored).to.be.false;
            expect(dataSource.hasAuthorization(location)).to.be.false;
        })
    })
    describe('#start()', function() {
        it('should return the user id', async function() {
            let session = {
                handle: 'abcdefg',
                address: 'http://minas-tirith.me',
                token: '123456789',
                user_id: 3,
                area: 'client',
                etime: Moment().add(1, 'day').toISOString(),
            };
            let location = { address: session.address, schema: 'global' };
            let restored = dataSource.restoreAuthorization(location, session);
            expect(restored).to.be.true;
            let userID = await dataSource.start(location);
            expect(userID).to.equal(session.user_id);
        })
        it('should reject with 401 Unauthorized error when there is no session', async function() {
            dataSource.addEventListener('authentication', (evt) => {
                evt.preventDefault();
            });
            let location = { address: 'http://minas-morgul.me', schema: 'global' };
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
            let query = {
                address: 'http://minas-tirith.me',
                schema: 'global',
                table: 'user',
                criteria: {
                    id: 3
                }
            };
            let objects = [
                { id: 3, gn: 2, username: 'frodo' }
            ]
            let discovery = 0;
            let retrieval = 0;
            HTTPRequest.fetch = async (method, url, payload, options) => {
                expect(method).to.match(/post/i);
                if (/discovery/.test(url)) {
                    discovery++;
                    expect(payload).to.have.property('id', 3);
                    return {
                        ids: _.map(objects, 'id'),
                        gns: _.map(objects, 'gn')
                    };
                } else if (/retrieval/.test(url)) {
                    retrieval++;
                    expect(payload).to.have.property('ids').that.deep.equal([ 3 ]);
                    return _.filter(objects, (object) => {
                        return _.includes(payload.ids, object.id);
                    });
                }
            };
            let users = await dataSource.find(query);
            expect(discovery).to.equal(1);
            expect(retrieval).to.equal(1);
            expect(users[0]).to.have.property('id', objects[0].id);
        })
        it('should reuse results from a previous search', async function() {
            let query = {
                address: 'http://minas-tirith.me',
                schema: 'global',
                table: 'user',
                criteria: {
                    id: 1
                }
            };
            let objects = [
                { id: 1, gn: 70, username: 'gandolf' }
            ]
            let discovery = 0;
            let retrieval = 0;
            HTTPRequest.fetch = async (method, url, payload, options) => {
                expect(method).to.match(/post/i);
                if (/discovery/.test(url)) {
                    discovery++;
                    expect(payload).to.have.property('id', 1);
                    return {
                        ids: _.map(objects, 'id'),
                        gns: _.map(objects, 'gn')
                    };
                } else if (/retrieval/.test(url)) {
                    retrieval++;
                    expect(payload).to.have.property('ids').that.deep.equal([ 1 ]);
                    return _.filter(objects, (object) => {
                        return _.includes(payload.ids, object.id);
                    });
                }
            };
            let users1 = await dataSource.find(query);
            expect(users1[0]).to.have.property('id', objects[0].id);
            let users2 = await dataSource.find(query);
            expect(discovery).to.equal(1);
            expect(retrieval).to.equal(1);
        })
        it('should return objects from cache without hitting remote server when the object count matches and the objects are retrieved recently', async function() {
            // put objects into cache first
            let location = { address: 'http://moria.me', schema: 'global', table: 'user' };
            let rtime = Moment().toISOString();
            let objects = [
                { id: 1, gn: 70, username: 'gandolf', rtime },
                { id: 2, gn: 3, username: 'bilbo', rtime },
            ];
            await cache.save(location, objects);
            let query = {
                address: location.address,
                schema: 'global',
                table: 'user',
                criteria: {
                    id: [ 1, 2 ]
                }
            };
            let discovery = 0;
            let retrieval = 0;
            HTTPRequest.fetch = async (method, url, payload, options) => {
                expect(method).to.match(/post/i);
                if (/discovery/.test(url)) {
                    discovery++;
                    return {
                        ids: _.map(objects, 'id'),
                        gns: _.map(objects, 'gn')
                    };
                } else if (/retrieval/.test(url)) {
                    retrieval++;
                    return _.filter(objects, (object) => {
                        return _.includes(payload.ids, object.id);
                    });
                }
            };
            let users = await dataSource.find(query);
            expect(discovery).to.equal(0);
            expect(retrieval).to.equal(0);
            expect(users[0]).to.have.property('id', objects[0].id);
            expect(users[1]).to.have.property('id', objects[1].id);
        })
        it('should return objects from cache then perform a server-side check when cached objects might be stale', async function() {
            let location = { address: 'http://level2.moria.me', schema: 'global', table: 'user' };
            let rtime = Moment().subtract(1, 'day').toISOString();
            let objects = [
                { id: 1, gn: 70, username: 'gandolf', rtime },
                { id: 2, gn: 3, username: 'bilbo', rtime },
            ];
            await cache.save(location, objects);
            let query = {
                address: location.address,
                schema: 'global',
                table: 'user',
                criteria: {
                    id: [ 1, 2 ]
                }
            };
            let discovery = 0;
            let retrieval = 0;
            HTTPRequest.fetch = async (method, url, payload, options) => {
                if (/discovery/.test(url)) {
                    discovery++;
                    return {
                        ids: _.map(objects, 'id'),
                        gns: _.map(objects, 'gn')
                    };
                } else if (/retrieval/.test(url)) {
                    retrieval++;
                    return _.filter(objects, (object) => {
                        return _.includes(payload.ids, object.id);
                    });
                }
            };
            let users = await dataSource.find(query);
            expect(discovery).to.equal(1);
            expect(retrieval).to.equal(0);
            expect(users[0]).to.have.property('id', objects[0].id);
            expect(users[1]).to.have.property('id', objects[1].id);
        })
        it('should update object whose gn has changed', async function() {
            let changeEventPromise = ManualPromise();
            dataSource.addEventListener('change', changeEventPromise.resolve);
            let location = { address: 'http://level3.moria.me', schema: 'global', table: 'user' };
            let rtime = Moment().subtract(1, 'day').toISOString();
            let objects = [
                { id: 1, gn: 70, username: 'gandolf', rtime },
                { id: 2, gn: 3, username: 'bilbo', rtime },
            ];
            await cache.save(location, objects);
            // bump gn
            objects[1] = _.cloneDeep(objects[1]);
            objects[1].gn++;
            let query = {
                address: location.address,
                schema: 'global',
                table: 'user',
                criteria: {
                    id: [ 1, 2 ]
                }
            };
            let discovery = 0;
            let retrieval = 0;
            HTTPRequest.fetch = async (method, url, payload, options) => {
                await Bluebird.delay(50);
                if (/discovery/.test(url)) {
                    discovery++;
                    return {
                        ids: _.map(objects, 'id'),
                        gns: _.map(objects, 'gn')
                    };
                } else if (/retrieval/.test(url)) {
                    expect(payload).to.have.property('ids').that.deep.equal([ objects[1].id ])
                    retrieval++;
                    return _.filter(objects, (object) => {
                        return _.includes(payload.ids, object.id);
                    });
                }
            };
            let users1 = await dataSource.find(query);
            // the cached objects are returned first
            expect(discovery).to.equal(0);
            expect(retrieval).to.equal(0);
            expect(users1).to.have.property('length', 2);
            expect(users1[1]).to.have.property('id', objects[1].id);
            expect(users1[1]).to.have.property('gn', objects[1].gn - 1);

            // wait for change event
            await changeEventPromise;

            // second query should yield updated object
            let users2 = await dataSource.find(query);
            expect(discovery).to.equal(1);
            expect(retrieval).to.equal(1);
            expect(users2[1]).to.have.property('id', objects[1].id);
            expect(users2[1]).to.have.property('gn', objects[1].gn);
        })
        it('should return objects from cache on an open-ended search, perform discovery, then conclude that the initial result set was correct', async function() {
            let changeEventPromise = ManualPromise();
            dataSource.addEventListener('change', changeEventPromise.resolve);
            let location = { address: 'http://level4.moria.me', schema: 'global', table: 'user' };
            let rtime = Moment().toISOString();
            let objects = [
                { id: 1, gn: 70, username: 'gandolf', rtime },
                { id: 2, gn: 3, username: 'bilbo', rtime },
            ];
            await cache.save(location, objects);
            let query = {
                address: location.address,
                schema: 'global',
                table: 'user',
                criteria: {},
                blocking: 'never',
            };
            let discovery = 0;
            let retrieval = 0;
            HTTPRequest.fetch = async (method, url, payload, options) => {
                await Bluebird.delay(50);
                if (/discovery/.test(url)) {
                    discovery++;
                    return {
                        ids: _.map(objects, 'id'),
                        gns: _.map(objects, 'gn')
                    };
                } else if (/retrieval/.test(url)) {
                    retrieval++;
                    return _.filter(objects, (object) => {
                        return _.includes(payload.ids, object.id);
                    });
                }
            };
            let users1 = await dataSource.find(query);
            expect(discovery).to.equal(0);
            expect(retrieval).to.equal(0);
            expect(users1).to.have.property('length', 2);

            await Bluebird.delay(100);
            expect(discovery).to.equal(1);
            expect(retrieval).to.equal(0);

            let result = Promise.race([
                changeEventPromise,
                Bluebird.resolve('no event').delay(500)
            ]);
            expect(result).to.equal('no event');
        })
        it('should return objects from cache, perform discovery, then retrieve an additional object', async function() {
            let changeEventPromise = ManualPromise();
            dataSource.addEventListener('change', changeEventPromise.resolve);
            let location = { address: 'http://level5.moria.me', schema: 'global', table: 'user' };
            let rtime = Moment().toISOString();
            let objects = [
                { id: 1, gn: 70, username: 'gandolf', rtime },
                { id: 2, gn: 3, username: 'bilbo', rtime },
            ];
            await cache.save(location, objects);
            objects.push({ id: 3, gn: 1, username: 'sauron' });
            let query = {
                address: location.address,
                schema: 'global',
                table: 'user',
                criteria: {},
                blocking: 'never'
            };
            let discovery = 0;
            let retrieval = 0;
            HTTPRequest.fetch = async (method, url, payload, options) => {
                await Bluebird.delay(50);
                if (/discovery/.test(url)) {
                    discovery++;
                    return {
                        ids: _.map(objects, 'id'),
                        gns: _.map(objects, 'gn')
                    };
                } else if (/retrieval/.test(url)) {
                    retrieval++;
                    return _.filter(objects, (object) => {
                        return _.includes(payload.ids, object.id);
                    });
                }
            };
            let users1 = await dataSource.find(query);
            expect(discovery).to.equal(0);
            expect(retrieval).to.equal(0);
            expect(users1).to.have.property('length', 2);
            await changeEventPromise;

            let users2 = await dataSource.find(query);
            expect(discovery).to.equal(1);
            expect(retrieval).to.equal(1);
            expect(users2).to.have.property('length', 3);
        })
        it('should not perform remote search when there is no connection', async function() {
            let changeEventPromise = ManualPromise();
            dataSource.addEventListener('change', changeEventPromise.resolve);
            dataSource.deactivate();
            let location = { address: 'http://level6.moria.me', schema: 'global', table: 'user' };
            let rtime = Moment().toISOString();
            let objects = [
                { id: 1, gn: 70, username: 'gandolf', rtime },
                { id: 2, gn: 3, username: 'bilbo', rtime },
            ];
            await cache.save(location, objects);
            objects.push({ id: 3, gn: 1, username: 'sauron' });
            let query = {
                address: location.address,
                schema: 'global',
                table: 'user',
                criteria: {}
            };
            let discovery = 0;
            let retrieval = 0;
            HTTPRequest.fetch = async (method, url, payload, options) => {
                await Bluebird.delay(50);
                if (/discovery/.test(url)) {
                    discovery++;
                    return {
                        ids: _.map(objects, 'id'),
                        gns: _.map(objects, 'gn')
                    };
                } else if (/retrieval/.test(url)) {
                    retrieval++;
                    return _.filter(objects, (object) => {
                        return _.includes(payload.ids, object.id);
                    });
                }
            };
            let users = await dataSource.find(query);
            expect(discovery).to.equal(0);
            expect(retrieval).to.equal(0);
            expect(users).to.have.property('length', 2);

            let result = Promise.race([
                changeEventPromise,
                Bluebird.resolve('no event').delay(200)
            ]);
            expect(result).to.equal('no event');
            dataSource.activate();
        })
    })
    describe('#save()', function() {
        it('should send an object to remote server and save result to cache', async function() {
            let changeEventPromise = ManualPromise();
            dataSource.addEventListener('change', changeEventPromise.resolve);
            let location = { address: 'http://level1.misty-mountain.me', schema: 'global', table: 'project' };
            let newObject = { name: 'anduril' };
            let storage = 0, id = 1;
            HTTPRequest.fetch = async (method, url, payload, options) => {
                await Bluebird.delay(50);
                if (/storage/.test(url)) {
                    storage++;
                    expect(method).to.match(/post/i);
                    expect(payload).to.have.property('objects').that.is.an.array;
                    return _.map(payload.objects, (object) => {
                        object = _.clone(object);
                        if (!object.id) {
                            object.id = id++;
                        }
                        return object;
                    });
                }
            };
            let savedObjects = await dataSource.save(location, [ newObject ]);
            for (let object of savedObjects) {
                let cachedObjects = await cache.find(location, { id: object.id });
                expect(cachedObjects).to.have.length(1);
            }
            let evt = await changeEventPromise;
            expect(evt).to.have.property('type', 'change');
        })
        it('should update an existing object', async function() {
            let changeEventPromise = ManualPromise();
            dataSource.addEventListener('change', changeEventPromise.resolve);
            let location = { address: 'http://level2.misty-mountain.me', schema: 'global', table: 'project' };
            let objects = [
                { id: 3, name: 'smeagol' }
            ];
            await cache.save(location, objects);
            let storage = 0;
            let discovery = 0;
            let updatedObject = _.clone(objects[0]);
            updatedObject.name = 'gollum';
            HTTPRequest.fetch = async (method, url, payload, options) => {
                await Bluebird.delay(50);
                if (/storage/.test(url)) {
                    storage++;
                    expect(method).to.match(/post/i);
                    expect(payload).to.have.property('objects').that.is.an.array;
                    let object = _.clone(payload.objects[0]);
                    objects[0] = object;
                    return [ object ];
                } else if (/discovery/.test(url)) {
                    discovery++;
                    return {
                        ids: _.map(objects, 'id'),
                        gns: _.map(objects, 'gn')
                    };
                }
            };
            let savedObjects = await dataSource.save(location, [ updatedObject ]);
            for (let object of savedObjects) {
                let cachedObjects = await cache.find(location, { id: object.id });
                expect(cachedObjects).to.have.length(1);
                expect(cachedObjects[0]).to.have.property('name', updatedObject.name);
            }
            let evt = await changeEventPromise;
            expect(evt).to.have.property('type', 'change');
        })
        it('should make uncommitted objects available immediately when feature is on', async function() {
            dataSource.options.discoveryFlags = {
                include_uncommitted: true
            };
            let location = { address: 'http://level3.misty-mountain.me', schema: 'global', table: 'project' };
            let newObject = { name: 'anduril' };
            let storage = 0, id = 1;
            let discovery = 0;
            let retrieval = 0;
            let objects = []
            HTTPRequest.fetch = async (method, url, payload, options) => {
                if (/storage/.test(url)) {
                    storage++;
                    expect(method).to.match(/post/i);
                    expect(payload).to.have.property('objects').that.is.an.array;

                    // wait for the search
                    await presaveSearchPromise;

                    // return the results only after we've done a search
                    let object = _.clone(payload.objects[0]);
                    object.id = id++;
                    object.gn = 1;
                    objects.push(object);
                    return [ object ];
                } else if (/discovery/.test(url)) {
                    discovery++;
                    return {
                        ids: _.map(objects, 'id'),
                        gns: _.map(objects, 'gn'),
                    };
                } else if (/retrieval/.test(url)) {
                    retrieval++;
                    return objects;
                }
            };

            // the logic here is a bit convoluted...
            //
            // 1. The first thing that happens is that we call save()
            // 2. save() will place newObject into the change queue
            // 3. save() then triggers a change event, which causes changeEventPromise
            //    (below) to fulfill itself
            // 4. at this point we run the query, which should yield newObject among
            //    the results (the feature we're testing)
            // 5. since save() would replace newObject with the saved version
            //    we want our pseudo-server code above to block until we've
            //    performed step 4, the reason why it waits for presaveSearchPromise
            // 6. once this happens, the pseudo-server code unblocks, and
            //    HTTPRequest.fetch() returns
            // 7. save() now has the object "returned by the server", which is
            //    inserted into the cached query
            // 8. save() returns and we can check the results from step 4 now
            //    that we're inside the promise-chain given to Chai
            // 9. then we run the query again and check that the result of step 7
            let changeEventPromise = ManualPromise();
            dataSource.addEventListener('change', changeEventPromise.resolve);
            let presaveSearch = async () => {
                await changeEventPromise;
                dataSource.removeEventListener('change', changeEventPromise.resolve);

                // perform the query that should yield the object with temporary ID
                let query = _.assign({ criteria: {} }, location);
                return dataSource.find(query);
            };
            let presaveSearchPromise = presaveSearch();
            let savedObjects = await dataSource.save(location, [ newObject ]);
            // the promise should fulfill immediately
            let projectsImmediately = await presaveSearchPromise;
            // project should have a temporary ID
            expect(projectsImmediately).to.have.length(1);
            expect(projectsImmediately[0]).to.have.property('id').that.is.below(1);

                // this search should not trigger a remote search, since it's
                // the same as the one performed in the change event handler
            let projectsLater = await dataSource.find(location, {});
            expect(projectsLater).to.have.length(1);
            expect(projectsLater[0]).to.have.property('id').that.is.at.least(1);
            expect(discovery).to.equal(1);
            expect(retrieval).to.equal(0);
        })
        it('should block search on a table until saving is complete', async function() {
            let location = { address: 'http://level4.misty-mountain.me', schema: 'global', table: 'project' };
            let newObject = { name: 'anduril' };
            let storage = 0, id = 1;
            let discovery = 0;
            let retrieval = 0;
            let objects = [];
            HTTPRequest.fetch = async (method, url, payload, options) => {
                if (/storage/.test(url)) {
                    storage++;
                    // make object available, then wait a bit
                    let object = _.clone(payload.objects[0]);
                    object.id = id++;
                    object.gn = 1;
                    objects.push(object);
                    await Bluebird.delay(100);
                    return [ object ];
                } else if (/discovery/.test(url)) {
                    discovery++;
                    return {
                        ids: _.map(objects, 'id'),
                        gns: _.map(objects, 'gn'),
                    };
                } else if (/retrieval/.test(url)) {
                    retrieval++;
                    return objects;
                }
            };
            dataSource.save(location, [ newObject ]);
            let projects = await dataSource.find(location, {});
            // it would return two objects--the uncommitted and the committed
            // one if search is allowed to proceed before before a save() is
            // finished
            expect(projects).to.have.length(1);
        })
        it('should merge multiple deferred saves', async function() {
            let event = null;
            let additionalSavePromises = [];
            let additionalSavesTriggeredPromise = ManualPromise();
            dataSource.addEventListener('change', () => {
                let num = additionalSavePromises.length + 1;
                if (num <= 4) {
                    // load the only object and modify it
                    let query = _.assign({ criteria: {} }, location);
                    let save = async (num) => {
                        let objects = await dataSource.find(query);
                        let object = objects[0];
                        // should still be uncommitted at this point
                        expect(object).to.have.property('id').that.is.below(1);
                        expect(object).to.have.property('uncommitted').that.is.true;
                        object = _.clone(object);
                        object['prop' + num] = num;
                        return dataSource.save(location, [ object ], { delay: 200 });
                    };
                    let promise = save(num);
                    additionalSavePromises.push(promise);
                } else {
                    additionalSavesTriggeredPromise.resolve();
                }
            });
            let location = { address: 'http://level5.misty-mountain.me', schema: 'global', table: 'project' };
            let newObject = { name: 'anduril' };
            let storage = 0, id = 1;
            let discovery = 0;
            let retrieval = 0;
            let objects = [];
            HTTPRequest.fetch = async (method, url, payload, options) => {
                if (/storage/.test(url)) {
                    storage++;
                    let object = _.clone(payload.objects[0]);
                    object.id = id++;
                    object.gn = 1;
                    objects.push(object);
                    return [ object ];
                } else if (/discovery/.test(url)) {
                    discovery++;
                    return {
                        ids: _.map(objects, 'id'),
                        gns: _.map(objects, 'gn'),
                    };
                } else if (/retrieval/.test(url)) {
                    retrieval++;
                    return objects;
                }
            };
            let savedObjects = await dataSource.save(location, [ newObject ], { delay: 200 });
            // initial call should get canceled
            expect(savedObjects).to.have.length(0);

            // wait for addition saves to be triggered
            await additionalSavesTriggeredPromise;

            let results = await Promise.all(additionalSavePromises);
            expect(storage).to.equal(1);
            // all but the last should be canceled
            expect(results[0]).to.have.length(0);
            expect(results[1]).to.have.length(0);
            expect(results[2]).to.have.length(0);
            expect(results[3]).to.have.length(1);
            let savedObject = results[3][0];
            expect(savedObject).to.have.property('id').that.is.at.least(1);
            expect(savedObject).to.have.property('prop1', 1);
            expect(savedObject).to.have.property('prop2', 2);
            expect(savedObject).to.have.property('prop3', 3);
            expect(savedObject).to.have.property('prop4', 4);
        })
        it('should save objects to local schema', async function() {
            let location = {
                schema: 'local',
                table: 'bob'
            };
            let newObject = {
                key: 'old',
                details: {
                    age: 87
                }
            };
            await dataSource.save(location, [ newObject ]);
            cache.reset();
            let objects = await dataSource.find(location);
            expect(objects[0]).to.deep.equal(newObject);
        })
    })
    describe('#remove()', function() {
        it('should try to remove an object', async function() {
            let changeEventPromise = ManualPromise();
            dataSource.addEventListener('change', changeEventPromise.resolve);
            let location = { address: 'http://level1.lonely-mountain.me', schema: 'global', table: 'project' };
            let existingObject = { id: 1, name: 'smaug' };
            let storage = 0;
            HTTPRequest.fetch = async (method, url, payload, options) => {
                await Bluebird.delay(50);
                if (/storage/.test(url)) {
                    storage++;
                    expect(method).to.match(/post/i);
                    expect(payload).to.have.property('objects').that.is.an.array;
                    return _.map(payload.objects, (object) => {
                        expect(object.deleted).to.be.true;
                        return _.clone(object);
                    });
                }
            };
            let objects = await dataSource.remove(location, [ existingObject ]);
            expect(storage).to.equal(1);
            let evt = await changeEventPromise;
            expect(evt).to.have.property('type', 'change');
        })
        it('should keep a delete request in the change queue when there is no connection and send it when connection is restored', async function() {
            let location = { address: 'http://level2.lonely-mountain.me', schema: 'global', table: 'project' };
            let objects = [ { id: 1, gn: 2, name: 'smaug' } ];
            let storage = 0;
            HTTPRequest.fetch = async (method, url, payload, options) => {
                await Bluebird.delay(50);
                if (/storage/.test(url)) {
                    storage++;
                    return _.map(payload.objects, (object) => {
                        return _.clone(object);
                    });
                } else if (/discovery/.test(url)) {
                    return {
                        ids: _.map(objects, 'id'),
                        gns: _.map(objects, 'gn'),
                    };
                } else if (/retrieval/.test(url)) {
                    return objects;
                }
            };
            // create a search first
            let query = _.extend(location, { criteria: {} });
            let found1 = await dataSource.find(query);
            expect(found1).to.have.lengthOf(1);

            // deactivate data source
            dataSource.deactivate();

            // this call will stall
            let removalPromise = dataSource.remove(location, [ objects[0] ]);
            let result = await Promise.race([
                removalPromise,
                Bluebird.resolve('stalled').delay(100)
            ]);
            expect(result).to.equal('stalled');

            expect(storage).to.equal(0);
            let found2 = await dataSource.find(query);
            // merging uncommitted delete into result
            expect(found2).to.have.lengthOf(0);

            // reactivate data source
            dataSource.activate();

            await removalPromise;
            expect(storage).to.equal(1);
        })
        it('should remove an object from local schema', async function() {
            let location = {
                schema: 'local',
                table: 'bob'
            };
            let newObject = {
                key: 'old',
                details: {
                    age: 87
                }
            };
            await dataSource.save(location, [ newObject ]);
            await dataSource.remove(location, [ newObject ]);
            cache.reset();
            let objects = await dataSource.find(location);
            expect(objects).to.have.lengthOf(0);
        })
    })
    describe('#abandon()', function() {
        it('should make searches at a given server dirty', async function() {
            let location = { address: 'http://toilet.helms-deep.me', schema: 'global', table: 'project' };
            let objects = [ { id: 1, gn: 2, name: 'fart' } ];
            let discovery = 0, retrieval = 0;
            HTTPRequest.fetch = async (method, url, payload, options) => {
                await Bluebird.delay(50);
                if (/discovery/.test(url)) {
                    discovery++;
                    return {
                        ids: _.map(objects, 'id'),
                        gns: _.map(objects, 'gn'),
                    };
                } else if (/retrieval/.test(url)) {
                    retrieval++;
                    return objects;
                }
            };
            let query = _.extend(location, { blocking: 'expired', criteria: {} });
            let found1 = await dataSource.find(query);
            expect(found1).to.have.lengthOf(1);
            expect(discovery).to.equal(1);
            expect(retrieval).to.equal(1);

            // wait for cache write to complete
            await Bluebird.delay(500);
            let found2 = await cache.find(query);
            expect(found2).to.have.lengthOf(1);

            await dataSource.abandon(location.address, location.schema);

            let found3 = await dataSource.find(query);
            expect(found3).to.have.lengthOf(1);
            // a discovery will occur again, since the criteria is open-ended
            // as the gn hasn't changed, the no retrieval will occur
            expect(discovery).to.equal(2);
            expect(retrieval).to.equal(1);
        })
    })
    describe('#invalidate()', function() {
        it('should flag searches as dirty based on change info', async function() {
            let location = { address: 'http://kitchen.helms-deep.me', schema: 'global', table: 'project' };
            let objects = [ { id: 1, gn: 2, name: 'milk' } ];
            let discovery = 0, retrieval = 0;
            HTTPRequest.fetch = async (method, url, payload, options) => {
                await Bluebird.delay(50);
                if (/discovery/.test(url)) {
                    discovery++;
                    return {
                        ids: _.map(objects, 'id'),
                        gns: _.map(objects, 'gn'),
                    };
                } else if (/retrieval/.test(url)) {
                    retrieval++;
                    return objects;
                }
            };
            let query = _.extend(location, { criteria: {} });
            let found1 = await dataSource.find(query);
            expect(found1).to.have.lengthOf(1);
            expect(discovery).to.equal(1);
            expect(retrieval).to.equal(1);

            objects = [ { id: 1, gn: 3, name: 'cheese' } ];
            let changes = [
                {
                    address: location.address,
                    schema: 'global',
                    table: 'project',
                    id: 1,
                    gn: 3,
                }
            ];
            await dataSource.invalidate(changes);

            let changeEventPromise = ManualPromise();
            dataSource.addEventListener('change', changeEventPromise.resolve);

            let found2 = await dataSource.find(query);
            expect(found2).to.deep.equal(found1);
            // the initial call to find() will return what we got before
            await changeEventPromise;
            // a subsequent call triggered by change event will actually find
            // the updated results
            let found3 = await dataSource.find(query);
            expect(found3[0]).to.have.property('gn', 3);
            expect(discovery).to.equal(2);
            expect(retrieval).to.equal(2);
        })
        it('should flag all searches at all servers as dirty when no change info is given', async function() {
            HTTPRequest.fetch = async (method, url, payload, options) => {
                if (/discovery/.test(url)) {
                    return { ids: [], gns: [] };
                } else if (/retrieval/.test(url)) {
                    return [];
                }
            };
            let queries = [
                { address: 'http://mirkwood.me', schema: 'global', table: 'project', criteria: {}, blocking: true },
                { address: 'http://mirkwood.me', schema: 'global', table: 'user', criteria: {}, blocking: true },
                { address: 'http://mirkwood.me', schema: 'global', table: 'smerf', criteria: {}, blocking: true },
                { address: 'http://rivendell.me', schema: 'global', table: 'project', criteria: {}, blocking: true },
            ];
            for (let query of queries) {
                await dataSource.find(query);
            }
            await dataSource.invalidate();
            let searches = dataSource.recentSearchResults;
            for (let search of searches) {
                expect(search.dirty).to.be.true;
            }
        })
        it('should trigger merging of remote changes', async function() {
            let location = { address: 'http://arnor.me', schema: 'global', table: 'project' };
            let objects = [ { id: 7, gn: 1, name: 'piglet' } ];
            let changedObject = { id: 7, gn: 1, name: 'lizard' };
            let onConflictCalled = false;
            let onConflict = function(evt) {
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
            HTTPRequest.fetch = async (method, url, payload, options) => {
                await Bluebird.delay(50);
                if (/discovery/.test(url)) {
                    discovery++;
                    return {
                        ids: _.map(objects, 'id'),
                        gns: _.map(objects, 'gn'),
                    };
                } else if (/retrieval/.test(url)) {
                    retrieval++;
                    return objects;
                } else if (/storage/.test(url)) {
                    storage++;
                    expect(payload.objects[0]).to.have.property('name', 'merged');
                    return payload.objects;
                }
            };
            // initiate a deferred save
            let options = { delay: 500, onConflict };
            let savePromise = dataSource.save(location, [ changedObject ], options);
            // simulate a change by someone else in the meantime
            objects = [ { id: 7, gn: 2, name: 'cat' } ];
            let changes = [
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
            let results = await savePromise;
            expect(results).to.have.lengthOf(1);
            expect(onConflictCalled).to.be.true;
            expect(retrieval).to.equal(1);
            expect(storage).to.equal(1);
        })
        it('should force the abandonment of a change when onConflict is not set', async function() {
            let location = { address: 'http://esgaroth.me', schema: 'global', table: 'project' };
            let objects = [ { id: 7, gn: 1, name: 'piglet' } ];
            let changedObject = { id: 7, gn: 1, name: 'lizard' };
            let discovery = 0, retrieval = 0, storage = 0;
            HTTPRequest.fetch = async (method, url, payload, options) => {
                await Bluebird.delay(50);
                if (/discovery/.test(url)) {
                    discovery++;
                    return {
                        ids: _.map(objects, 'id'),
                        gns: _.map(objects, 'gn'),
                    };
                } else if (/retrieval/.test(url)) {
                    retrieval++;
                    return objects;
                } else if (/storage/.test(url)) {
                    storage++;
                    return payload.objects;
                }
            };
            // initiate a deferred save
            let options = { delay: 500 };
            let savePromise = dataSource.save(location, [ changedObject ], options);
            // simulate a change by someone else in the meantime
            objects = [ { id: 7, gn: 2, name: 'cat' } ];
            let changes = [
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
            let results = await savePromise;
            expect(results).to.have.lengthOf(0);
            expect(storage).to.equal(0);
        })
        it('should force the abandonment of a change when onConflict does not call preventDefault', async function() {
            let location = { address: 'http://fangorn.me', schema: 'global', table: 'project' };
            let objects = [ { id: 7, gn: 1, name: 'piglet' } ];
            let changedObject = { id: 7, gn: 1, name: 'lizard' };
            let onConflictCalled = false;
            let onConflict = function(evt) {
                onConflictCalled = true;
            };
            let discovery = 0, retrieval = 0, storage = 0;
            HTTPRequest.fetch = async (method, url, payload, options) => {
                await Bluebird.delay(50);
                if (/discovery/.test(url)) {
                    discovery++;
                    return {
                        ids: _.map(objects, 'id'),
                        gns: _.map(objects, 'gn'),
                    };
                } else if (/retrieval/.test(url)) {
                    retrieval++;
                    return objects;
                } else if (/storage/.test(url)) {
                    storage++;
                    return payload.objects;
                }
            };
            // initiate a deferred save
            let options = { delay: 500, onConflict };
            let savePromise = dataSource.save(location, [ changedObject ], options);
            // simulate a change by someone else in the meantime
            objects = [ { id: 7, gn: 2, name: 'cat' } ];
            let changes = [
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
            let results = await savePromise;
            expect(results).to.have.lengthOf(0);
            expect(onConflictCalled).to.be.true;
            expect(retrieval).to.equal(1);
            expect(storage).to.equal(0);
        })
    })
})
