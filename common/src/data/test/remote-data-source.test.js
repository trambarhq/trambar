import _ from 'lodash';
import Promise from 'bluebird';
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
        it('should initiate a session', function() {
            let location = { address: 'http://mordor.me' };
            let session = { handle: 'abcdefg' };
            let system = { details: { en: 'Test' } };
            let servers = [ { id: 1, type: 'gitlab' } ];
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.try(() => {
                    expect(method).to.match(/post/i);
                    expect(url).to.contain(location.address);
                    expect(payload).to.have.property('area', 'client');
                    return { session, system, servers };
                });
            };
            dataSource.beginSession(location, 'client').then((result) => {
                expect(result).to.have.property('system', system);
                expect(result).to.have.property('servers', servers);
            });
        })
        it('should return a fulfilled promise when session was created already', function() {
            let location = { address: 'http://rohan.me' };
            let session = { handle: 'abcdefg' };
            let system = { details: { en: 'Test' } };
            let servers = [ { id: 1, type: 'gitlab' } ];
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.try(() => {
                    return { session, system, servers };
                });
            };
            return dataSource.beginSession(location, 'client').then((result) => {
                let promise = dataSource.beginSession(location, 'client');
                expect(promise.isFulfilled()).to.be.true;
            });
        })
        it('should trigger onChange after failing', function() {
            let changeEventPromise = new ManualPromise;
            dataSource.addEventListener('change', changeEventPromise.resolve);

            let location = { address: 'http://gondor.me' };
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.reject(new Error('boo'));
            };
            return dataSource.beginSession(location, 'client').then(() => {
                return false;
            }).catch((err) => {
                return true;
            }).then((rejected) => {
                expect(rejected).to.be.true;
                return changeEventPromise.timeout(1000);
            }).then((evt) => {
                expect(evt).to.be.object;
                expect(evt).to.have.property('type', 'change');
            });
        })
    })
    describe('#checkSession()', function() {
        it('should fire onAuthorization when remote server indicates session is authorized', function() {
            let authorizationEventPromise = new ManualPromise;
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
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.try(() => {
                    return { session, system, servers };
                });
            };
            return dataSource.beginSession(location, 'client').then(() => {
                expect(dataSource.hasAuthorization(location)).to.be.false;
                HTTPRequest.fetch = (method, url, payload, options) => {
                    return Promise.try(() => {
                        expect(method).to.match(/get/i);
                        expect(payload).to.have.property('handle', session.handle);
                        return { session: sessionLater };
                    });
                };
                return dataSource.checkSession(location).then((authorized) => {
                    expect(authorized).to.be.true;
                    expect(dataSource.hasAuthorization(location)).to.be.true;
                    return authorizationEventPromise.timeout(1000);
                }).then((evt) => {
                    expect(evt).to.have.property('session');
                    expect(evt.session).to.have.property('token');
                    expect(evt.session).to.have.property('user_id');
                    expect(evt.session).to.have.property('etime');
                });
            });
        })
        it('should simply return false when session is not authorized', function() {
            let expirationEventPromise = new ManualPromise;
            let violationEventPromise = new ManualPromise;
            dataSource.addEventListener('expiration', expirationEventPromise.resolve);
            dataSource.addEventListener('violation', violationEventPromise.resolve);
            let location = { address: 'http://dunland.me' };
            let session = { handle: 'abcdefg' };
            let system = { details: { en: 'Test' } };
            let servers = [ { id: 1, type: 'gitlab' } ];
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.try(() => {
                    return { session, system, servers };
                });
            };
            return dataSource.beginSession(location, 'client').then(() => {
                expect(dataSource.hasAuthorization(location)).to.be.false;
                HTTPRequest.fetch = (method, url, payload, options) => {
                    return Promise.try(() => {
                        return {};
                    });
                };
                return dataSource.checkSession(location).then((authorized) => {
                    expect(dataSource.hasAuthorization(location)).to.be.false;
                    expect(authorized).to.be.false;

                    return Promise.race([ expirationEventPromise, violationEventPromise ]).timeout(500);
                }).then((evt) => {
                    expect(evt).to.be.null;
                });
            });
        })
    })
    describe('#submitPassword()', function() {
        it('should trigger onAuthorization when server accepts username/password', function() {
            let authorizationEventPromise = new ManualPromise;
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
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.try(() => {
                    return { session, system, servers };
                });
            };
            return dataSource.beginSession(location, 'client').then(() => {
                expect(dataSource.hasAuthorization(location)).to.be.false;
                HTTPRequest.fetch = (method, url, payload, options) => {
                    return Promise.try(() => {
                        expect(method).to.match(/post/i);
                        expect(payload).to.have.property('handle', session.handle);
                        expect(payload).to.have.property('username', username);
                        expect(payload).to.have.property('password', password);
                        return { session: sessionLater };
                    });
                };
                return dataSource.submitPassword(location, username, password).then(() => {
                    expect(dataSource.hasAuthorization(location)).to.be.true;
                    return authorizationEventPromise;
                }).then((evt) => {
                    expect(evt).to.have.property('session');
                    expect(evt.session).to.have.property('token');
                    expect(evt.session).to.have.property('user_id');
                    expect(evt.session).to.have.property('etime');
                });
            });
        })
        it('should reject when username/password are wrong, with error object containing information sent by server', function() {
            let changeEventPromise = new ManualPromise;
            let expirationEventPromise = new ManualPromise;
            let violationEventPromise = new ManualPromise;
            dataSource.addEventListener('change', changeEventPromise.resolve);
            dataSource.addEventListener('expiration', expirationEventPromise.resolve);
            dataSource.addEventListener('violation', violationEventPromise.resolve)
            let location = { address: 'http://rivendell.me' };
            let session = { handle: 'abcdefg' };
            let system = { details: { en: 'Test' } };
            let servers = [ { id: 1, type: 'gitlab' } ];
            let username = 'frodo';
            let password = 'precious';
            let error = new HTTPError(401, {
                message: 'You fool!',
                reason: 'dark-magic',
            });
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.try(() => {
                    return { session, system, servers };
                });
            };
            return dataSource.beginSession(location, 'client').then(() => {
                expect(dataSource.hasAuthorization(location)).to.be.false;
                HTTPRequest.fetch = (method, url, payload, options) => {
                    return Promise.try(() => {
                        throw error;
                    });
                };
                return expect(dataSource.submitPassword(location, username, password))
                    .to.eventually.be.rejectedWith(Error)
                    .that.has.property('reason', 'dark-magic');
            }).then(() => {
                let anyEventPromise = Promise.race([ changeEventPromise, expirationEventPromise, violationEventPromise ]).timeout(100);
                return expect(anyEventPromise)
                    .to.eventually.be.rejectedWith(Promise.TimeoutError);
            });
        })
        it('should trigger onChange to restart session when failure is other than 401 Unauthorized', function() {
            let changeEventPromise = new ManualPromise;
            let expirationEventPromise = new ManualPromise;
            let violationEventPromise = new ManualPromise;
            dataSource.addEventListener('change', changeEventPromise.resolve);
            dataSource.addEventListener('expiration', expirationEventPromise.resolve);
            dataSource.addEventListener('violation', violationEventPromise.resolve)
            let location = { address: 'http://rivendell.me' };
            let session = { handle: 'abcdefg' };
            let system = { details: { en: 'Test' } };
            let servers = [ { id: 1, type: 'gitlab' } ];
            let username = 'frodo';
            let password = 'precious';
            let error = new HTTPError(404, {
                message: 'Session has disappeared!',
                reason: 'one-ring',
            });
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.try(() => {
                    return { session, system, servers };
                });
            };
            return dataSource.beginSession(location, 'client').then(() => {
                HTTPRequest.fetch = (method, url, payload, options) => {
                    return Promise.try(() => {
                        throw error;
                    });
                };
                return expect(dataSource.submitPassword(location, username, password))
                    .to.eventually.be.rejected;
            }).then(() => {
                Promise.race([ changeEventPromise, expirationEventPromise, violationEventPromise ]).then((evt) => {
                    expect(evt).to.have.property('type', 'change');
                });
            });
        })
    })
    describe('#endSession()', function() {
        it('should end a session', function() {
            let location = { address: 'http://helms-deep.me' };
            let session = { handle: 'abcdefg' };
            let system = { details: { en: 'Test' } };
            let servers = [ { id: 1, type: 'gitlab' } ];
            let username = 'frodo';
            let password = 'precious';
            let error = new HTTPError(404, {
                message: 'Session has disappeared!',
                reason: 'one-ring',
            });
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.try(() => {
                    return { session, system, servers };
                });
            };
            return dataSource.beginSession(location, 'client').then(() => {
                HTTPRequest.fetch = (method, url, payload, options) => {
                    return Promise.try(() => {
                        expect(method).to.match(/delete/i);
                        expect(payload).to.property('handle', session.handle);
                        return {};
                    });
                };
                return dataSource.endSession(location).then(() => {
                    expect(dataSource.hasAuthorization(location)).to.be.false;
                });
            });
        })
    })
    describe('#getOAuthURL()', function() {
        it('should return a URL for logging in through OAuth', function() {
            let location = { address: 'http://helms-deep.me' };
            let session = { handle: 'abcdefg' };
            let system = { details: { en: 'Test' } };
            let servers = [ { id: 1, type: 'gitlab' } ];
            let username = 'frodo';
            let password = 'precious';
            let error = new HTTPError(404, {
                message: 'Session has disappeared!',
                reason: 'one-ring',
            });
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.try(() => {
                    return { session, system, servers };
                });
            };
            return dataSource.beginSession(location, 'client').then(() => {
                let url1 = dataSource.getOAuthURL(location, servers[0]);
                let url2 = dataSource.getOAuthURL(location, servers[0], 'test');
                let url3 = dataSource.getOAuthURL(location, servers[0], 'activation');
                expect(url1).to.equal('http://helms-deep.me/srv/session/gitlab/?sid=1&handle=abcdefg');
                expect(url2).to.equal('http://helms-deep.me/srv/session/gitlab/?sid=1&handle=abcdefg&test=1');
                expect(url3).to.equal('http://helms-deep.me/srv/session/gitlab/?sid=1&handle=abcdefg&activation=1');
            });
        })
    })
    describe('#restoreSession()', function() {
        it('should add a session', function() {
            let session = {
                handle: 'abcdefg',
                address: 'http://minas-tirith.me',
                token: '123456789',
                user_id: 3,
                etime: Moment().add(1, 'day').toISOString(),
            };
            let location = { address: session.address };
            expect(dataSource.hasAuthorization(location)).to.be.false;
            dataSource.restoreSession(session);
            expect(dataSource.hasAuthorization(location)).to.be.true;
        })
        it('should not add an expired session', function() {
            let session = {
                handle: 'abcdefg',
                address: 'http://angmar.me',
                token: '123456789',
                user_id: 3,
                etime: Moment().subtract(1, 'day').toISOString(),
            };
            let location = { address: session.address };
            expect(dataSource.hasAuthorization(location)).to.be.false;
            dataSource.restoreSession(session);
            expect(dataSource.hasAuthorization(location)).to.be.false;
        })
    })
    describe('#start()', function() {
        it('should return the user id', function() {
            let session = {
                handle: 'abcdefg',
                address: 'http://minas-tirith.me',
                token: '123456789',
                user_id: 3,
                etime: Moment().subtract(1, 'day').toISOString(),
            };
            let location = { address: session.address, schema: 'global' };
            dataSource.restoreSession(session);
            return dataSource.start(location).then((userID) => {
                expect(userID).to.equal(session.user_id);
            });
        })
        it('should reject with 401 Unauthorized error when there is no session', function() {
            let location = { address: 'http://minas-morgul.me', schema: 'global' };
            return dataSource.start(location).catch((err) => {
                return err;
            }).then((err) => {
                expect(err).to.be.an.instanceof(HTTPError);
                expect(err).to.have.property('statusCode', 401);
            });
        })
    })
    describe('#find()', function() {
        it('should request objects from remote server', function() {
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
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.try(() => {
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
                });
            };
            return dataSource.find(query).then((users) => {
                expect(discovery).to.equal(1);
                expect(retrieval).to.equal(1);
                expect(users[0]).to.have.property('id', objects[0].id);
            });
        })
        it('should reuse results from a previous search', function() {
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
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.try(() => {
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
                });
            };
            return dataSource.find(query).then((users) => {
                expect(users[0]).to.have.property('id', objects[0].id);
                return dataSource.find(query).then((users) => {
                    expect(discovery).to.equal(1);
                    expect(retrieval).to.equal(1);
                });
            });
        })
        it('should return objects from cache without hitting remote server when the object count matches and the objects are retrieved recently', function() {
            // put objects into cache first
            let location = { address: 'http://moria.me', schema: 'global', table: 'user' };
            let rtime = Moment().toISOString();
            let objects = [
                { id: 1, gn: 70, username: 'gandolf', rtime },
                { id: 2, gn: 3, username: 'bilbo', rtime },
            ];
            return cache.save(location, objects).then(() => {
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
                HTTPRequest.fetch = (method, url, payload, options) => {
                    return Promise.try(() => {
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
                    });
                };
                return dataSource.find(query).then((users) => {
                    expect(discovery).to.equal(0);
                    expect(retrieval).to.equal(0);
                    expect(users[0]).to.have.property('id', objects[0].id);
                    expect(users[1]).to.have.property('id', objects[1].id);
                });
            });
        })
        it('should return objects from cache then perform a server-side check when cached objects might be stale', function() {
            let location = { address: 'http://level2.moria.me', schema: 'global', table: 'user' };
            let rtime = Moment().subtract(1, 'day').toISOString();
            let objects = [
                { id: 1, gn: 70, username: 'gandolf', rtime },
                { id: 2, gn: 3, username: 'bilbo', rtime },
            ];
            return cache.save(location, objects).then(() => {
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
                HTTPRequest.fetch = (method, url, payload, options) => {
                    return Promise.try(() => {
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
                    });
                };
                return dataSource.find(query).then((users) => {
                    expect(discovery).to.equal(1);
                    expect(retrieval).to.equal(0);
                    expect(users[0]).to.have.property('id', objects[0].id);
                    expect(users[1]).to.have.property('id', objects[1].id);
                });
            });
        })
        it('should update object whose gn has changed', function() {
            let changeEventPromise = new ManualPromise;
            dataSource.addEventListener('change', changeEventPromise.resolve);
            let location = { address: 'http://level3.moria.me', schema: 'global', table: 'user' };
            let rtime = Moment().subtract(1, 'day').toISOString();
            let objects = [
                { id: 1, gn: 70, username: 'gandolf', rtime },
                { id: 2, gn: 3, username: 'bilbo', rtime },
            ];
            return cache.save(location, objects).then(() => {
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
                HTTPRequest.fetch = (method, url, payload, options) => {
                    return Promise.delay(50).then(() => {
                        return Promise.try(() => {
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
                        });
                    });
                };
                return dataSource.find(query).then((users) => {
                    // the cached objects are returned first
                    expect(discovery).to.equal(0);
                    expect(retrieval).to.equal(0);
                    expect(users).to.have.property('length', 2);
                    expect(users[1]).to.have.property('id', objects[1].id);
                    expect(users[1]).to.have.property('gn', objects[1].gn - 1);

                    // wait for change event
                    return changeEventPromise.timeout(1000);
                }).then(() => {
                    // second query should yield updated object
                    return dataSource.find(query).then((users) => {
                        expect(discovery).to.equal(1);
                        expect(retrieval).to.equal(1);
                        expect(users[1]).to.have.property('id', objects[1].id);
                        expect(users[1]).to.have.property('gn', objects[1].gn);
                    });
                });
            });
        })
        it('should return objects from cache on an open-ended search, perform discovery, then conclude that the initial result set was correct', function() {
            let changeEventPromise = new ManualPromise;
            dataSource.addEventListener('change', changeEventPromise.resolve);
            let location = { address: 'http://level4.moria.me', schema: 'global', table: 'user' };
            let rtime = Moment().toISOString();
            let objects = [
                { id: 1, gn: 70, username: 'gandolf', rtime },
                { id: 2, gn: 3, username: 'bilbo', rtime },
            ];
            return cache.save(location, objects).then(() => {
                let query = {
                    address: location.address,
                    schema: 'global',
                    table: 'user',
                    criteria: {},
                    blocking: 'never',
                };
                let discovery = 0;
                let retrieval = 0;
                HTTPRequest.fetch = (method, url, payload, options) => {
                    return Promise.delay(50).then(() => {
                        return Promise.try(() => {
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
                        });
                    });
                };
                return dataSource.find(query).then((users) => {
                    expect(discovery).to.equal(0);
                    expect(retrieval).to.equal(0);
                    expect(users).to.have.property('length', 2);
                    return Promise.delay(100);
                }).then(() => {
                    expect(discovery).to.equal(1);
                    expect(retrieval).to.equal(0);
                    return changeEventPromise;
                }).then((evt) => {
                    expect(event).to.be.null;
                });
            });
        })
        it('should return objects from cache, perform discovery, then retrieve an additional object', function() {
            let changeEventPromise = new ManualPromise;
            dataSource.addEventListener('change', changeEventPromise.resolve);
            let location = { address: 'http://level5.moria.me', schema: 'global', table: 'user' };
            let rtime = Moment().toISOString();
            let objects = [
                { id: 1, gn: 70, username: 'gandolf', rtime },
                { id: 2, gn: 3, username: 'bilbo', rtime },
            ];
            return cache.save(location, objects).then(() => {
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
                HTTPRequest.fetch = (method, url, payload, options) => {
                    return Promise.delay(50).then(() => {
                        return Promise.try(() => {
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
                        });
                    });
                };
                return dataSource.find(query).then((users) => {
                    expect(discovery).to.equal(0);
                    expect(retrieval).to.equal(0);
                    expect(users).to.have.property('length', 2);
                    return changeEventPromise.timeout(1000);
                }).then((evt) => {
                    return dataSource.find(query).then((users) => {
                        expect(discovery).to.equal(1);
                        expect(retrieval).to.equal(1);
                        expect(users).to.have.property('length', 3);
                    });
                });
            });
        })
        it('should not perform remote search when there is no connection', function() {
            let changeEventPromise = new ManualPromise;
            dataSource.addEventListener('change', changeEventPromise.resolve);
            dataSource.deactivate();
            let location = { address: 'http://level6.moria.me', schema: 'global', table: 'user' };
            let rtime = Moment().toISOString();
            let objects = [
                { id: 1, gn: 70, username: 'gandolf', rtime },
                { id: 2, gn: 3, username: 'bilbo', rtime },
            ];
            return cache.save(location, objects).then(() => {
                objects.push({ id: 3, gn: 1, username: 'sauron' });
                let query = {
                    address: location.address,
                    schema: 'global',
                    table: 'user',
                    criteria: {}
                };
                let discovery = 0;
                let retrieval = 0;
                HTTPRequest.fetch = (method, url, payload, options) => {
                    return Promise.delay(50).then(() => {
                        return Promise.try(() => {
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
                        });
                    });
                };
                return dataSource.find(query).then((users) => {
                    expect(discovery).to.equal(0);
                    expect(retrieval).to.equal(0);
                    expect(users).to.have.property('length', 2);
                    return expect(changeEventPromise.timeout(200))
                        .to.eventually.be.rejectedWith(Promise.TimeoutError);
                });
            }).finally(() => {
                dataSource.activate();
            });
        })
    })
    describe('#save()', function() {
        it('should send an object to remote server and save result to cache', function() {
            let changeEventPromise = new ManualPromise;
            dataSource.addEventListener('change', changeEventPromise.resolve);
            let location = { address: 'http://level1.misty-mountain.me', schema: 'global', table: 'project' };
            let newObject = { name: 'anduril' };
            let storage = 0, id = 1;
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.delay(50).then(() => {
                    return Promise.try(() => {
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
                    });
                });
            };
            return dataSource.save(location, [ newObject ]).each((object) => {
                return cache.find(location, { id: object.id }).then((objects) => {
                    expect(objects).to.have.length(1);
                });
            }).then(() => {
                return changeEventPromise.timeout(1000);
            }).then((evt) => {
                expect(evt).to.have.property('type', 'change');
            });
        })
        it('should update an existing object', function() {
            let changeEventPromise = new ManualPromise;
            dataSource.addEventListener('change', changeEventPromise.resolve);
            let location = { address: 'http://level2.misty-mountain.me', schema: 'global', table: 'project' };
            let objects = [
                { id: 3, name: 'smeagol' }
            ];
            return cache.save(location, objects).then(() => {
                let storage = 0;
                let discovery = 0;
                let updatedObject = _.clone(objects[0]);
                updatedObject.name = 'gollum';
                HTTPRequest.fetch = (method, url, payload, options) => {
                    return Promise.delay(50).then(() => {
                        return Promise.try(() => {
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
                        });
                    });
                };
                return dataSource.save(location, [ updatedObject ]).each((object) => {
                    return cache.find(location, { id: object.id }).then((objects) => {
                        expect(objects).to.have.length(1);
                        expect(objects[0]).to.have.property('name', updatedObject.name);
                    });
                }).then(() => {
                    return changeEventPromise.timeout(1000);
                }).then((evt) => {
                    expect(evt).to.have.property('type', 'change');
                });
            });
        })
        it('should make uncommitted objects available immediately when feature is on', function() {
            let changeEventPromise = new ManualPromise;
            dataSource.addEventListener('change', changeEventPromise.resolve);
            dataSource.options.discoveryFlags = {
                include_uncommitted: true
            };
            let location = { address: 'http://level3.misty-mountain.me', schema: 'global', table: 'project' };
            let newObject = { name: 'anduril' };
            let storage = 0, id = 1;
            let discovery = 0;
            let retrieval = 0;
            let objects = []
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.try(() => {
                    if (/storage/.test(url)) {
                        storage++;
                        expect(method).to.match(/post/i);
                        expect(payload).to.have.property('objects').that.is.an.array;
                        return postSaveSearchHappened.then(() => {
                            // return the results only after we've done a search
                            let object = _.clone(payload.objects[0]);
                            object.id = id++;
                            object.gn = 1;
                            objects.push(object);
                            return [ object ];
                        });
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
                });
            };
            let postSaveResults = changeEventPromise.then((evt) => {
                // this should run as such as the new object reach the change queue
                let query = _.assign({ criteria: {} }, location);
                dataSource.removeEventListener('change', changeEventPromise.resolve);
                return dataSource.find(query);
            });
            return dataSource.save(location, [ newObject ]).then((objects) => {
                // this search should not trigger a remote search,
                // since it's the same as the one performed in the
                // onChange handler
                return dataSource.find(location, {}).then((projects) => {
                    expect(projects).to.have.length(1);
                    expect(projects[0]).to.have.property('id').that.is.at.least(1);
                    expect(discovery).to.equal(1);
                    expect(retrieval).to.equal(0);
                });
            }).then(() => {
                return postSaveQueryPromise.timeout(1000);
            }).then((projects) => {
                // project should have a temporary ID
                expect(projects).to.have.length(1);
                expect(projects[0]).to.have.property('id').that.is.below(1);
            });
        })
        it('should block search on a table until saving is complete', function() {
            let location = { address: 'http://level4.misty-mountain.me', schema: 'global', table: 'project' };
            let newObject = { name: 'anduril' };
            let storage = 0, id = 1;
            let discovery = 0;
            let retrieval = 0;
            let objects = [];
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.try(() => {
                    if (/storage/.test(url)) {
                        storage++;
                        // make object available, then wait a bit
                        let object = _.clone(payload.objects[0]);
                        object.id = id++;
                        object.gn = 1;
                        objects.push(object);
                        return Promise.delay(100).then(() => {
                            return [ object ];
                        });
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
                });
            };
            dataSource.save(location, [ newObject ]);
            return dataSource.find(location, {}).then((projects) => {
                // it would return two objects--the uncommitted and the committed
                // one if search is allowed to proceed before before a save() is
                // finished
                expect(projects).to.have.length(1);
            });
        })
        it('should merge multiple deferred saves', function() {
            let event = null;
            let additionalSavePromises = [];
            let additionalSavesTriggeredPromise = new ManualPromise;
            dataSource.addEventListener('change', () => {
                let num = additionalSavePromises.length + 1;
                if (num <= 4) {
                    // load the only object and modify it
                    let query = _.assign({ criteria: {} }, location);
                    let promise = dataSource.find(query).get(0).then((object) => {
                        // should still be uncommitted at this point
                        expect(object).to.have.property('id').that.is.below(1);
                        expect(object).to.have.property('uncommitted').that.is.true;
                        object = _.clone(object);
                        object['prop' + num] = num;
                        return dataSource.save(location, [ object ], { delay: 200 });
                    });
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
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.try(() => {
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
                });
            };
            return dataSource.save(location, [ newObject ], { delay: 200 }).then((objects) => {
                // initial call should get canceled
                expect(objects).to.have.length(0);
            }).then(() => {
                // wait for addition saves to be triggered
                return additionalSavesTriggeredPromise.timeout(1000);
            }).then(() => {
                return Promise.all(additionalSavePromises);
            }).then((results) => {
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
            });
        })
        it('should save objects to local schema', function() {
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
            return dataSource.save(location, [ newObject ]).then(() => {
                cache.reset();
                return dataSource.find(location).then((objects) => {
                    expect(objects[0]).to.deep.equal(newObject);
                });
            });
        })
    })
    describe('#remove()', function() {
        it('should try to remove an object', function() {
            let changeEventPromise = new ManualPromise;
            dataSource.addEventListener('change', changeEventPromise.resolve);
            let location = { address: 'http://level1.lonely-mountain.me', schema: 'global', table: 'project' };
            let existingObject = { id: 1, name: 'smaug' };
            let storage = 0;
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.delay(50).then(() => {
                    return Promise.try(() => {
                        if (/storage/.test(url)) {
                            storage++;
                            expect(method).to.match(/post/i);
                            expect(payload).to.have.property('objects').that.is.an.array;
                            return _.map(payload.objects, (object) => {
                                expect(object.deleted).to.be.true;
                                return _.clone(object);
                            });
                        }
                    });
                });
            };
            return dataSource.remove(location, [ existingObject ]).then((objects) => {
                expect(storage).to.equal(1);
                return changeEventPromise.timeout(1000);
            }).then((evt) => {
                expect(evt).to.have.property('type', 'change');
            });
        })
        it('should keep a delete request in the change queue when there is no connection and send it when connection is restored', function() {
            let location = { address: 'http://level2.lonely-mountain.me', schema: 'global', table: 'project' };
            let objects = [ { id: 1, gn: 2, name: 'smaug' } ];
            let storage = 0;
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.delay(50).then(() => {
                    return Promise.try(() => {
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
                    });
                });
            };
            // create a search first
            let query = _.extend(location, { criteria: {} });
            return dataSource.find(query).then((found) => {
                expect(found).to.have.lengthOf(1);

                // deactivate data source
                dataSource.deactivate();
            }).then(() => {
                // this call will stall
                return expect(dataSource.remove(location, [ objects[0] ]).timeout(100))
                    .to.eventually.be.rejectedWith(Promise.TimeoutError);
            }).then(() => {
                expect(storage).to.equal(0);
                return dataSource.find(query).then((found) => {
                    // merging uncommitted delete into result
                    expect(found).to.have.lengthOf(0);
                });
            }).then(() => {
                // reactivate data source
                dataSource.activate();
                return null;
            }).delay(200).then(() => {
                expect(storage).to.equal(1);
            });
        })
        it('should remove an object from local schema', function() {
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
            return dataSource.save(location, [ newObject ]).then(() => {
                return dataSource.remove(location, [ newObject ]).then(() => {
                    cache.reset();
                    return dataSource.find(location).then((objects) => {
                        expect(objects).to.have.lengthOf(0);
                    });
                });
            });
        })
    })
    describe('#abandon()', function() {
        it('should make searches at a given server dirty', function() {
            let location = { address: 'http://toilet.helms-deep.me', schema: 'global', table: 'project' };
            let objects = [ { id: 1, gn: 2, name: 'fart' } ];
            let discovery = 0, retrieval = 0;
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.delay(50).then(() => {
                    return Promise.try(() => {
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
                    });
                });
            };
            let query = _.extend(location, { blocking: 'expired', criteria: {} });
            return dataSource.find(query).then((found) => {
                expect(found).to.have.lengthOf(1);
                expect(discovery).to.equal(1);
                expect(retrieval).to.equal(1);

                // wait for cache write to complete
                return Promise.delay(500).then(() => {
                    return cache.find(query).then((found) => {
                        expect(found).to.have.lengthOf(1);
                    });
                });
            }).then(() => {
                dataSource.abandon(location.address, location.schema);
            }).then(() => {
                return dataSource.find(query).then((found) => {
                    expect(found).to.have.lengthOf(1);
                    // a discovery will occur again, since the criteria is open-ended
                    // as the gn hasn't changed, the no retrieval will occur
                    expect(discovery).to.equal(2);
                    expect(retrieval).to.equal(1);
                });
            });
        })
    })
    describe('#invalidate()', function() {
        it('should flag searches as dirty based on change info', function() {
            let location = { address: 'http://kitchen.helms-deep.me', schema: 'global', table: 'project' };
            let objects = [ { id: 1, gn: 2, name: 'milk' } ];
            let discovery = 0, retrieval = 0;
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.delay(50).then(() => {
                    return Promise.try(() => {
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
                    });
                });
            };
            let query = _.extend(location, { criteria: {} });
            return dataSource.find(query).then((found) => {
                expect(found).to.have.lengthOf(1);
                expect(discovery).to.equal(1);
                expect(retrieval).to.equal(1);
            }).then(() => {
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
                return dataSource.invalidate(changes);
            }).then(() => {
                let changeEventPromise = new ManualPromise;
                dataSource.addEventListener('change', changeEventPromise.resolve);

                return dataSource.find(query).then((found) => {
                    // the initial call to find() will return what we got before
                    return changeEventPromise.timeout(1000);
                }).then((evt) => {
                    // a subsequent call triggered by onChange will actually find
                    // the updated results
                    return dataSource.find(query).then((found) => {
                        expect(found[0]).to.have.property('gn', 3);
                        expect(discovery).to.equal(2);
                        expect(retrieval).to.equal(2);
                    });
                });
            });
        })
        it('should flag all searches at all servers as dirty when no change info is given', function() {
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.try(() => {
                    if (/discovery/.test(url)) {
                        return { ids: [], gns: [] };
                    } else if (/retrieval/.test(url)) {
                        return [];
                    }
                });
            };
            let queries = [
                { address: 'http://mirkwood.me', schema: 'global', table: 'project', criteria: {}, blocking: true },
                { address: 'http://mirkwood.me', schema: 'global', table: 'user', criteria: {}, blocking: true },
                { address: 'http://mirkwood.me', schema: 'global', table: 'smerf', criteria: {}, blocking: true },
                { address: 'http://rivendell.me', schema: 'global', table: 'project', criteria: {}, blocking: true },
            ];
            return Promise.each(queries, (query) => {
                return dataSource.find(query);
            }).then(() => {
                return dataSource.invalidate();
            }).then(() => {
                let searches = dataSource.recentSearchResults;
                _.each(searches, (search) => {
                    expect(search.dirty).to.be.true;
                });
            });
        })
        it('should trigger merging of remote changes', function() {
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
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.delay(50).then(() => {
                    return Promise.try(() => {
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
                    });
                });
            };
            // initiate a deferred save
            let options = { delay: 500, onConflict };
            let savePromise = dataSource.save(location, [ changedObject ], options);
            return Promise.try(() => {
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
                return dataSource.invalidate(changes);
            }).then(() => {
                // wait for save() to finish
                return savePromise;
            }).then((results) => {
                expect(results).to.have.lengthOf(1);
                expect(onConflictCalled).to.be.true;
                expect(retrieval).to.equal(1);
                expect(storage).to.equal(1);
            });
        })
        it('should force the abandonment of a change when onConflict is not set', function() {
            let location = { address: 'http://esgaroth.me', schema: 'global', table: 'project' };
            let objects = [ { id: 7, gn: 1, name: 'piglet' } ];
            let changedObject = { id: 7, gn: 1, name: 'lizard' };
            let discovery = 0, retrieval = 0, storage = 0;
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.delay(50).then(() => {
                    return Promise.try(() => {
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
                    });
                });
            };
            // initiate a deferred save
            let options = { delay: 500 };
            let savePromise = dataSource.save(location, [ changedObject ], options);
            return Promise.try(() => {
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
                return dataSource.invalidate(changes);
            }).then(() => {
                // wait for save() to finish
                return savePromise;
            }).then((results) => {
                expect(results).to.have.lengthOf(0);
                expect(storage).to.equal(0);
            });
        })
        it('should force the abandonment of a change when onConflict does not call preventDefault', function() {
            let location = { address: 'http://fangorn.me', schema: 'global', table: 'project' };
            let objects = [ { id: 7, gn: 1, name: 'piglet' } ];
            let changedObject = { id: 7, gn: 1, name: 'lizard' };
            let onConflictCalled = false;
            let onConflict = function(evt) {
                onConflictCalled = true;
            };
            let discovery = 0, retrieval = 0, storage = 0;
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.delay(50).then(() => {
                    return Promise.try(() => {
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
                    });
                });
            };
            // initiate a deferred save
            let options = { delay: 500, onConflict };
            let savePromise = dataSource.save(location, [ changedObject ], options);
            return Promise.try(() => {
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
                return dataSource.invalidate(changes);
            }).then(() => {
                // wait for save() to finish
                return savePromise;
            }).then((results) => {
                expect(results).to.have.lengthOf(0);
                expect(onConflictCalled).to.be.true;
                expect(retrieval).to.equal(1);
                expect(storage).to.equal(0);
            });
        })
    })
})
