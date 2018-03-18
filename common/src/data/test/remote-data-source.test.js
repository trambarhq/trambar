var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var React = require('react');
var Chai = require('chai'), expect = Chai.expect;
var Enzyme = require('enzyme');

var RemoteDataSource = require('data/remote-data-source');
var IndexedDBCache = require('data/indexed-db-cache');
var HTTPRequest = require('transport/http-request');
var HTTPError = require('errors/http-error');

describe('RemoteDataSource', function() {
    before(function() {
        indexedDB.deleteDatabase('rds-test');
    })
    var fetchOriginal = HTTPRequest.fetch;
    after(function() {
        HTTPRequest.fetch = fetchOriginal;
    })

    var cacheWrapper = Enzyme.mount(<IndexedDBCache databaseName="rds-test"/>);
    var cache = cacheWrapper.instance();
    var dataSourceProps = {
        discoveryFlags: {
        },
        retrievalFlags: {
        },
        hasConnection: true,
        inForeground: true,
        prefetching: false,
        sessionRetryInterval: 100,
        cache: cache,

        onChange: null,
        onSearch: null,
        onAuthorization: null,
        onExpiration: null,
        onViolation: null,
        onStupefaction: null,
    };
    var dataSourceWrapper = Enzyme.mount(<RemoteDataSource {...dataSourceProps} />);
    var dataSource = dataSourceWrapper.instance();

    // restore props to default values after each test
    afterEach(function() {
        dataSourceWrapper.setProps(dataSourceProps);
    })

    describe('#beginSession()', function() {
        it('should initiate a session', function() {
            var location = { address: 'http://mordor.me' };
            var session = { handle: 'abcdefg' };
            var system = { details: { en: 'Test' } };
            var servers = [ { id: 1, type: 'gitlab' } ];
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
            var location = { address: 'http://rohan.me' };
            var session = { handle: 'abcdefg' };
            var system = { details: { en: 'Test' } };
            var servers = [ { id: 1, type: 'gitlab' } ];
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.try(() => {
                    return { session, system, servers };
                });
            };
            return dataSource.beginSession(location, 'client').then((result) => {
                var promise = dataSource.beginSession(location, 'client');
                expect(promise.isFulfilled()).to.be.true;
            });
        })
        it('should trigger onChange after failing', function() {
            var onChangePromise = new ManualPromise;
            dataSourceWrapper.setProps({
                onChange: onChangePromise.resolve
            });
            var location = { address: 'http://gondor.me' };
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.reject(new Error('boo'));
            };
            return dataSource.beginSession(location, 'client').then(() => {
                return false;
            }).catch((err) => {
                return true;
            }).then((rejected) => {
                expect(rejected).to.be.true;
                return onChangePromise.timeout(1000);
            }).then((evt) => {
                expect(evt).to.be.object;
            });
        })
    })
    describe('#checkSession()', function() {
        it('should fire onAuthorization when remote server indicates session is authorized', function() {
            var event = null;
            dataSourceWrapper.setProps({
                onAuthorization: (evt) => { event = evt }
            });
            var location = { address: 'http://isengard.me' };
            var session = { handle: 'abcdefg' };
            var sessionLater = {
                token: '123456789',
                user_id: 7,
                etime: Moment().add(1, 'day').toISOString(),
            };
            var system = { details: { en: 'Test' } };
            var servers = [ { id: 1, type: 'gitlab' } ];
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
                    expect(event).to.have.property('session');
                    expect(event.session).to.have.property('token');
                    expect(event.session).to.have.property('user_id');
                    expect(event.session).to.have.property('etime');
                });
            });
        })
        it('should simply return false when session is not authorized', function() {
            var event = null;
            dataSourceWrapper.setProps({
                onExpiration: (evt) => { event = evt },
                onViolation: (evt) => { event = evt },
            });
            var location = { address: 'http://dunland.me' };
            var session = { handle: 'abcdefg' };
            var system = { details: { en: 'Test' } };
            var servers = [ { id: 1, type: 'gitlab' } ];
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
                    expect(event).to.be.null;
                });
            });
        })
    })
    describe('#submitPassword()', function() {
        it('should trigger onAuthorization when server accepts username/password', function() {
            var event = null;
            dataSourceWrapper.setProps({
                onAuthorization: (evt) => { event = evt }
            });
            var location = { address: 'http://mdoom.mordor.me' };
            var session = { handle: 'abcdefg' };
            var sessionLater = {
                token: '123456789',
                user_id: 3,
                etime: Moment().add(1, 'day').toISOString(),
            };
            var system = { details: { en: 'Test' } };
            var servers = [ { id: 1, type: 'gitlab' } ];
            var username = 'frodo';
            var password = 'precious';
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
                    expect(event).to.have.property('session');
                    expect(event.session).to.have.property('token');
                    expect(event.session).to.have.property('user_id');
                    expect(event.session).to.have.property('etime');
                });
            });
        })
        it('should reject when username/password are wrong, with error object containing information sent by server', function() {
            var event = null;
            dataSourceWrapper.setProps({
                onChange: (evt) => { event = evt },
                onExpiration: (evt) => { event = evt },
                onViolation: (evt) => { event = evt },
            });
            var location = { address: 'http://rivendell.me' };
            var session = { handle: 'abcdefg' };
            var system = { details: { en: 'Test' } };
            var servers = [ { id: 1, type: 'gitlab' } ];
            var username = 'frodo';
            var password = 'precious';
            var error = new HTTPError(401, {
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
                return dataSource.submitPassword(location, username, password).catch((err) => {
                    expect(dataSource.hasAuthorization(location)).to.be.false;
                    return err;
                }).then((err) => {
                    expect(err).to.equal(error);
                    expect(event).to.be.null;
                });
            });
        })
        it('should trigger onChange to restart session when failure is other than 401 Unauthorized', function() {
            var event = null;
            dataSourceWrapper.setProps({
                onChange: (evt) => { event = evt },
                onExpiration: (evt) => { event = evt },
                onViolation: (evt) => { event = evt },
            });
            var location = { address: 'http://rivendell.me' };
            var session = { handle: 'abcdefg' };
            var system = { details: { en: 'Test' } };
            var servers = [ { id: 1, type: 'gitlab' } ];
            var username = 'frodo';
            var password = 'precious';
            var error = new HTTPError(404, {
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
                return dataSource.submitPassword(location, username, password).catch((err) => {
                    expect(event).to.have.property('type', 'change');
                });
            });
        })
    })
    describe('#endSession()', function() {
        it('should end a session', function() {
            var event = null;
            dataSourceWrapper.setProps({
                onChange: (evt) => { event = evt },
                onExpiration: (evt) => { event = evt },
                onViolation: (evt) => { event = evt },
            });
            var location = { address: 'http://helms-deep.me' };
            var session = { handle: 'abcdefg' };
            var system = { details: { en: 'Test' } };
            var servers = [ { id: 1, type: 'gitlab' } ];
            var username = 'frodo';
            var password = 'precious';
            var error = new HTTPError(404, {
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
            var event = null;
            dataSourceWrapper.setProps({
                onChange: (evt) => { event = evt },
                onExpiration: (evt) => { event = evt },
                onViolation: (evt) => { event = evt },
            });
            var location = { address: 'http://helms-deep.me' };
            var session = { handle: 'abcdefg' };
            var system = { details: { en: 'Test' } };
            var servers = [ { id: 1, type: 'gitlab' } ];
            var username = 'frodo';
            var password = 'precious';
            var error = new HTTPError(404, {
                message: 'Session has disappeared!',
                reason: 'one-ring',
            });
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.try(() => {
                    return { session, system, servers };
                });
            };
            return dataSource.beginSession(location, 'client').then(() => {
                var url1 = dataSource.getOAuthURL(location, servers[0]);
                var url2 = dataSource.getOAuthURL(location, servers[0], 'test');
                var url3 = dataSource.getOAuthURL(location, servers[0], 'activation');
                expect(url1).to.equal('http://helms-deep.me/srv/session/gitlab/?sid=1&handle=abcdefg');
                expect(url2).to.equal('http://helms-deep.me/srv/session/gitlab/?sid=1&handle=abcdefg&test=1');
                expect(url3).to.equal('http://helms-deep.me/srv/session/gitlab/?sid=1&handle=abcdefg&activation=1');
            });
        })
    })
    describe('#restoreSession()', function() {
        it('should add a session', function() {
            var session = {
                handle: 'abcdefg',
                address: 'http://minas-tirith.me',
                token: '123456789',
                user_id: 3,
                etime: Moment().add(1, 'day').toISOString(),
            };
            var location = { address: session.address };
            expect(dataSource.hasAuthorization(location)).to.be.false;
            dataSource.restoreSession(session);
            expect(dataSource.hasAuthorization(location)).to.be.true;
        })
        it('should not add an expired session', function() {
            var session = {
                handle: 'abcdefg',
                address: 'http://angmar.me',
                token: '123456789',
                user_id: 3,
                etime: Moment().subtract(1, 'day').toISOString(),
            };
            var location = { address: session.address };
            expect(dataSource.hasAuthorization(location)).to.be.false;
            dataSource.restoreSession(session);
            expect(dataSource.hasAuthorization(location)).to.be.false;
        })
    })
    describe('#start()', function() {
        it('should return the user id', function() {
            var session = {
                handle: 'abcdefg',
                address: 'http://minas-tirith.me',
                token: '123456789',
                user_id: 3,
                etime: Moment().subtract(1, 'day').toISOString(),
            };
            var location = { address: session.address, schema: 'global' };
            dataSource.restoreSession(session);
            return dataSource.start(location).then((userId) => {
                expect(userId).to.equal(session.user_id);
            });
        })
        it('should reject with 401 Unauthorized error when there is no session', function() {
            var location = { address: 'http://minas-morgul.me', schema: 'global' };
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
            var query = {
                address: 'http://minas-tirith.me',
                schema: 'global',
                table: 'user',
                criteria: {
                    id: 3
                }
            };
            var objects = [
                { id: 3, gn: 2, username: 'frodo' }
            ]
            var discovery = 0;
            var retrieval = 0;
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
            var query = {
                address: 'http://minas-tirith.me',
                schema: 'global',
                table: 'user',
                criteria: {
                    id: 1
                }
            };
            var objects = [
                { id: 1, gn: 70, username: 'gandolf' }
            ]
            var discovery = 0;
            var retrieval = 0;
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
            var location = { address: 'http://moria.me', schema: 'global', table: 'user' };
            var rtime = Moment().toISOString();
            var objects = [
                { id: 1, gn: 70, username: 'gandolf', rtime },
                { id: 2, gn: 3, username: 'bilbo', rtime },
            ];
            return cache.save(location, objects).then(() => {
                var query = {
                    address: location.address,
                    schema: 'global',
                    table: 'user',
                    criteria: {
                        id: [ 1, 2 ]
                    }
                };
                var discovery = 0;
                var retrieval = 0;
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
            var location = { address: 'http://level2.moria.me', schema: 'global', table: 'user' };
            var rtime = Moment().subtract(1, 'day').toISOString();
            var objects = [
                { id: 1, gn: 70, username: 'gandolf', rtime },
                { id: 2, gn: 3, username: 'bilbo', rtime },
            ];
            return cache.save(location, objects).then(() => {
                var query = {
                    address: location.address,
                    schema: 'global',
                    table: 'user',
                    criteria: {
                        id: [ 1, 2 ]
                    }
                };
                var discovery = 0;
                var retrieval = 0;
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
            var onChangePromise = new ManualPromise;
            dataSourceWrapper.setProps({
                onChange: onChangePromise.resolve
            });
            var location = { address: 'http://level3.moria.me', schema: 'global', table: 'user' };
            var rtime = Moment().subtract(1, 'day').toISOString();
            var objects = [
                { id: 1, gn: 70, username: 'gandolf', rtime },
                { id: 2, gn: 3, username: 'bilbo', rtime },
            ];
            return cache.save(location, objects).then(() => {
                // bump gn
                objects[1] = _.cloneDeep(objects[1]);
                objects[1].gn++;
                var query = {
                    address: location.address,
                    schema: 'global',
                    table: 'user',
                    criteria: {
                        id: [ 1, 2 ]
                    }
                };
                var discovery = 0;
                var retrieval = 0;
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

                    // wait for onChange
                    return onChangePromise.timeout(1000);
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
            var event = null;
            dataSourceWrapper.setProps({
                onChange: (evt) => { event = evt }
            });
            var location = { address: 'http://level4.moria.me', schema: 'global', table: 'user' };
            var rtime = Moment().toISOString();
            var objects = [
                { id: 1, gn: 70, username: 'gandolf', rtime },
                { id: 2, gn: 3, username: 'bilbo', rtime },
            ];
            return cache.save(location, objects).then(() => {
                var query = {
                    address: location.address,
                    schema: 'global',
                    table: 'user',
                    criteria: {}
                };
                var discovery = 0;
                var retrieval = 0;
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
                    expect(event).to.be.null;
                });
            });
        })
        it('should return objects from cache, perform discovery, then retrieve an additional object', function() {
            var onChangePromise = new ManualPromise;
            dataSourceWrapper.setProps({
                onChange: onChangePromise.resolve
            });
            var location = { address: 'http://level5.moria.me', schema: 'global', table: 'user' };
            var rtime = Moment().toISOString();
            var objects = [
                { id: 1, gn: 70, username: 'gandolf', rtime },
                { id: 2, gn: 3, username: 'bilbo', rtime },
            ];
            return cache.save(location, objects).then(() => {
                objects.push({ id: 3, gn: 1, username: 'sauron' });
                var query = {
                    address: location.address,
                    schema: 'global',
                    table: 'user',
                    criteria: {}
                };
                var discovery = 0;
                var retrieval = 0;
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
                    return onChangePromise.timeout(1000);
                }).then(() => {
                    return dataSource.find(query).then((users) => {
                        expect(discovery).to.equal(1);
                        expect(retrieval).to.equal(1);
                        expect(users).to.have.property('length', 3);
                    });
                });
            });
        })
        it('should not perform remote search when there is no connection', function() {
            var onChangePromise = new ManualPromise;
            dataSourceWrapper.setProps({
                hasConnection: false,
                onChange: onChangePromise.resolve,
            });
            var location = { address: 'http://level6.moria.me', schema: 'global', table: 'user' };
            var rtime = Moment().toISOString();
            var objects = [
                { id: 1, gn: 70, username: 'gandolf', rtime },
                { id: 2, gn: 3, username: 'bilbo', rtime },
            ];
            return cache.save(location, objects).then(() => {
                objects.push({ id: 3, gn: 1, username: 'sauron' });
                var query = {
                    address: location.address,
                    schema: 'global',
                    table: 'user',
                    criteria: {}
                };
                var discovery = 0;
                var retrieval = 0;
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
                    return onChangePromise.timeout(200);
                }).catch((err) => {
                    return err;
                }).then((err) => {
                    expect(err).to.be.instanceof(Promise.TimeoutError);
                });
            });
        })
    })
    describe('#save()', function() {
        it('should send an object to remote server and save result to cache', function() {
            var event = null;
            dataSourceWrapper.setProps({
                onChange: (evt) => { event = evt }
            });
            var location = { address: 'http://level1.misty-mountain.me', schema: 'global', table: 'project' };
            var newObject = { name: 'anduril' };
            var storage = 0, id = 1;
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
                expect(event).to.have.property('type', 'change');
                return cache.find(location, { id: object.id }).then((objects) => {
                    expect(objects).to.have.length(1);
                });
            });
        })
        it('should update an existing object', function() {
            var event = null;
            dataSourceWrapper.setProps({
                onChange: (evt) => { event = evt }
            });
            var location = { address: 'http://level2.misty-mountain.me', schema: 'global', table: 'project' };
            var objects = [
                { id: 3, name: 'smeagol' }
            ];
            return cache.save(location, objects).then(() => {
                var storage = 0;
                var discovery = 0;
                var updatedObject = _.clone(objects[0]);
                updatedObject.name = 'gollum';
                HTTPRequest.fetch = (method, url, payload, options) => {
                    return Promise.delay(50).then(() => {
                        return Promise.try(() => {
                            if (/storage/.test(url)) {
                                storage++;
                                expect(method).to.match(/post/i);
                                expect(payload).to.have.property('objects').that.is.an.array;
                                var object = _.clone(payload.objects[0]);
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
                    expect(event).to.have.property('type', 'change');
                    return cache.find(location, { id: object.id }).then((objects) => {
                        expect(objects).to.have.length(1);
                        expect(objects[0]).to.have.property('name', updatedObject.name);
                    });
                });
            });
        })
        it('should make uncommitted objects available immediately when feature is on', function() {
            var event = null;
            var postSaveSearchHappened = new ManualPromise;
            dataSourceWrapper.setProps({
                discoveryFlags: {
                    include_uncommitted: true
                },
                onChange: (evt) => {
                    if (!postSaveSearchHappened.isResolved()) {
                        var query = _.assign({ criteria: {} }, location);
                        dataSource.find(query).then((projects) => {
                            expect(projects).to.have.length(1);
                            expect(projects[0]).to.have.property('id').that.is.below(1);
                            postSaveSearchHappened.resolve();
                        }).catch((err) => {
                            postSaveSearchHappened.reject(err);
                        });
                    }
                }
            });
            var location = { address: 'http://level3.misty-mountain.me', schema: 'global', table: 'project' };
            var newObject = { name: 'anduril' };
            var storage = 0, id = 1;
            var discovery = 0;
            var retrieval = 0;
            var objects = []
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.try(() => {
                    if (/storage/.test(url)) {
                        storage++;
                        expect(method).to.match(/post/i);
                        expect(payload).to.have.property('objects').that.is.an.array;
                        return postSaveSearchHappened.then(() => {
                            // return the results only after we've done a search
                            var object = _.clone(payload.objects[0]);
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
            return dataSource.save(location, [ newObject ]).each((object) => {
                // this search should not trigger a remote search,
                // since it's the same as the one performed in the
                // onChange handler
                return dataSource.find(location, {}).then((projects) => {
                    expect(projects).to.have.length(1);
                    expect(projects[0]).to.have.property('id').that.is.at.least(1);
                    expect(discovery).to.equal(1);
                    expect(retrieval).to.equal(0);
                });
            });
        })
        it('should block search on a table until saving is complete', function() {
            var event = null;
            dataSourceWrapper.setProps({
                discoveryFlags: {
                    include_uncommitted: true
                },
            });
            var location = { address: 'http://level4.misty-mountain.me', schema: 'global', table: 'project' };
            var newObject = { name: 'anduril' };
            var storage = 0, id = 1;
            var discovery = 0;
            var retrieval = 0;
            var objects = [];
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.try(() => {
                    if (/storage/.test(url)) {
                        storage++;
                        // make object available, then wait a bit
                        var object = _.clone(payload.objects[0]);
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
            var event = null;
            var additionalSavePromises = [];
            var additionalSavesTriggeredPromise = new ManualPromise;
            dataSourceWrapper.setProps({
                discoveryFlags: {
                    include_uncommitted: true
                },
                onChange: () => {
                    var num = additionalSavePromises.length + 1;
                    if (num <= 4) {
                        // load the only object and modify it
                        var query = _.assign({ criteria: {} }, location);
                        var promise = dataSource.find(query).get(0).then((object) => {
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
                }
            });
            var location = { address: 'http://level5.misty-mountain.me', schema: 'global', table: 'project' };
            var newObject = { name: 'anduril' };
            var storage = 0, id = 1;
            var discovery = 0;
            var retrieval = 0;
            var objects = [];
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.try(() => {
                    if (/storage/.test(url)) {
                        storage++;
                        var object = _.clone(payload.objects[0]);
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
                var savedObject = results[3][0];
                expect(savedObject).to.have.property('id').that.is.at.least(1);
                expect(savedObject).to.have.property('prop1', 1);
                expect(savedObject).to.have.property('prop2', 2);
                expect(savedObject).to.have.property('prop3', 3);
                expect(savedObject).to.have.property('prop4', 4);
            });
        })
        it('should save objects to local schema', function() {
            var location = {
                schema: 'local',
                table: 'bob'
            };
            var newObject = {
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
            var event = null;
            dataSourceWrapper.setProps({
                onChange: (evt) => { event = evt }
            });
            var location = { address: 'http://level1.lonely-mountain.me', schema: 'global', table: 'project' };
            var existingObject = { id: 1, name: 'smaug' };
            var storage = 0;
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
            return dataSource.remove(location, [ existingObject ]).each((object) => {
                expect(event).to.have.property('type', 'change');
                expect(storage).to.equal(1);
            });
        })
        it('should keep a delete request in the change queue when there is no connection and send it when connection is restored', function() {
            var event = null;
            dataSourceWrapper.setProps({
                discoveryFlags: {
                    include_uncommitted: true
                },
                onChange: (evt) => { event = evt },
            });

            var location = { address: 'http://level2.lonely-mountain.me', schema: 'global', table: 'project' };
            var objects = [ { id: 1, gn: 2, name: 'smaug' } ];
            var storage = 0;
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
            var query = _.extend(location, { criteria: {} });
            return dataSource.find(query).then((found) => {
                expect(found).to.have.lengthOf(1);

                // disable connection
                dataSourceWrapper.setProps({ hasConnection: false });
            }).then(() => {
                // this call will stall
                return dataSource.remove(location, [ objects[0] ]).timeout(100);
            }).catch((err) => {
                return err;
            }).then((res) => {
                expect(res).to.be.instanceOf(Promise.TimeoutError);
                expect(storage).to.equal(0);
                return dataSource.find(query).then((found) => {
                    // merging uncommitted delete into result
                    expect(found).to.have.lengthOf(0);
                });
            }).then(() => {
                // restore connection
                dataSourceWrapper.setProps({ hasConnection: true });
                return null;
            }).delay(200).then(() => {
                expect(storage).to.equal(1);
            });
        })
        it('should remove an object from local schema', function() {
            var location = {
                schema: 'local',
                table: 'bob'
            };
            var newObject = {
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
    describe('#clear()', function() {
        it('should remove recent searches at a given server', function() {
            var location = { address: 'http://toilet.helms-deep.me', schema: 'global', table: 'project' };
            var objects = [ { id: 1, gn: 2, name: 'fart' } ];
            var discovery = 0, retrieval = 0;
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
            var query = _.extend(location, { blocking: true, criteria: {} });
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
                dataSource.clear(location.address, location.schema);
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
            var location = { address: 'http://kitchen.helms-deep.me', schema: 'global', table: 'project' };
            var objects = [ { id: 1, gn: 2, name: 'milk' } ];
            var discovery = 0, retrieval = 0;
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
            var query = _.extend(location, { criteria: {} });
            return dataSource.find(query).then((found) => {
                expect(found).to.have.lengthOf(1);
                expect(discovery).to.equal(1);
                expect(retrieval).to.equal(1);
            }).then(() => {
                objects = [ { id: 1, gn: 3, name: 'cheese' } ];
                var changes = {
                    'global.project': {
                        ids: [ 1 ],
                        gns: [ 3 ],
                    }
                };
                return dataSource.invalidate(location.address, changes);
            }).then(() => {
                var onChangePromise = new ManualPromise;
                dataSourceWrapper.setProps({
                    onChange: onChangePromise.resolve
                });

                return dataSource.find(query).then((found) => {
                    // the initial call to find() will return what we got before
                    return onChangePromise;
                }).then(() => {
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
        it('should flag all searches at a server as dirty when no change info is given', function() {
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.try(() => {
                    if (/discovery/.test(url)) {
                        return { ids: [], gns: [] };
                    } else if (/retrieval/.test(url)) {
                        return [];
                    }
                });
            };
            dataSource.clear();
            var queries = [
                { address: 'http://mirkwood.me', schema: 'global', table: 'project', criteria: {}, blocking: true },
                { address: 'http://mirkwood.me', schema: 'global', table: 'user', criteria: {}, blocking: true },
                { address: 'http://mirkwood.me', schema: 'global', table: 'smerf', criteria: {}, blocking: true },
                { address: 'http://rivendell.me', schema: 'global', table: 'project', criteria: {}, blocking: true },
            ];
            return Promise.each(queries, (query) => {
                return dataSource.find(query);
            }).then(() => {
                return dataSource.invalidate('http://mirkwood.me');
            }).then(() => {
                var searches = dataSource.recentSearchResults;
                _.each(searches, (search) => {
                    if (search.address === 'http://mirkwood.me') {
                        expect(search.dirty).to.be.true;
                    } else if (search.address === 'http://rivendell.me') {
                        expect(search.dirty).to.be.false;
                    }
                });
            });
        })
        it('should flag all searches at all servers as dirty when a server is not specified', function() {
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.try(() => {
                    if (/discovery/.test(url)) {
                        return { ids: [], gns: [] };
                    } else if (/retrieval/.test(url)) {
                        return [];
                    }
                });
            };
            dataSource.clear();
            var queries = [
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
                var searches = dataSource.recentSearchResults;
                _.each(searches, (search) => {
                    expect(search.dirty).to.be.true;
                });
            });
        })
        it('should trigger merging of remote changes', function() {
            var location = { address: 'http://arnor.me', schema: 'global', table: 'project' };
            var objects = [ { id: 7, gn: 1, name: 'piglet' } ];
            var changedObject = { id: 7, gn: 1, name: 'lizard' };
            var onConflictCalled = false;
            var onConflict = function(evt) {
                onConflictCalled = true;
                expect(evt).to.have.property('type', 'conflict');
                expect(evt).to.have.property('local');
                expect(evt).to.have.property('remote').that.has.property('gn', 2);
                // pretend we've performed a merge
                evt.local.name = 'merged'
                // default reaction is to drop the change
                evt.preventDefault();
            };
            var discovery = 0, retrieval = 0, storage = 0;
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
            var options = { delay: 500, onConflict };
            var savePromise = dataSource.save(location, [ changedObject ], options);
            return Promise.try(() => {
                // simulate a change by someone else in the meantime
                objects = [ { id: 7, gn: 2, name: 'cat' } ];
                var changes = {
                    'global.project': {
                        ids: [ 7 ],
                        gns: [ 2 ],
                    }
                };
                return dataSource.invalidate(location.address, changes);
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
            var location = { address: 'http://esgaroth.me', schema: 'global', table: 'project' };
            var objects = [ { id: 7, gn: 1, name: 'piglet' } ];
            var changedObject = { id: 7, gn: 1, name: 'lizard' };
            var discovery = 0, retrieval = 0, storage = 0;
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
            var options = { delay: 500 };
            var savePromise = dataSource.save(location, [ changedObject ], options);
            return Promise.try(() => {
                // simulate a change by someone else in the meantime
                objects = [ { id: 7, gn: 2, name: 'cat' } ];
                var changes = {
                    'global.project': {
                        ids: [ 7 ],
                        gns: [ 2 ],
                    }
                };
                return dataSource.invalidate(location.address, changes);
            }).then(() => {
                // wait for save() to finish
                return savePromise;
            }).then((results) => {
                expect(results).to.have.lengthOf(0);
                expect(retrieval).to.equal(0);
                expect(storage).to.equal(0);
            });
        })
        it('should force the abandonment of a change when onConflict does not call preventDefault', function() {
            var location = { address: 'http://fangorn.me', schema: 'global', table: 'project' };
            var objects = [ { id: 7, gn: 1, name: 'piglet' } ];
            var changedObject = { id: 7, gn: 1, name: 'lizard' };
            var onConflictCalled = false;
            var onConflict = function(evt) {
                onConflictCalled = true;
            };
            var discovery = 0, retrieval = 0, storage = 0;
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
            var options = { delay: 500, onConflict };
            var savePromise = dataSource.save(location, [ changedObject ], options);
            return Promise.try(() => {
                // simulate a change by someone else in the meantime
                objects = [ { id: 7, gn: 2, name: 'cat' } ];
                var changes = {
                    'global.project': {
                        ids: [ 7 ],
                        gns: [ 2 ],
                    }
                };
                return dataSource.invalidate(location.address, changes);
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

function ManualPromise() {
    Promise.call(this, (resolve, reject) => {
        this.resolve = resolve;
        this.reject = reject;
    });
}

ManualPromise.prototype = Object.create(Promise.prototype);
