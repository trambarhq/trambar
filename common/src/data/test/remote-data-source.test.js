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
    var fetchOriginal = HTTPRequest.fetch;
    after(function() {
        HTTPRequest.fetch = fetchOriginal;
    })

    var cacheWrapper = Enzyme.mount(<IndexedDBCache databaseName="rds-test"/>);
    var cache = cacheWrapper.instance();
    var dataSourceProps = {
        discoveryFlags: {
            include_uncommitted: true
        },
        hasConnection: true,
        inForeground: true,
        sessionRetryInterval: 100,
        cache: cache,
    };
    var dataSourceWrapper = Enzyme.mount(<RemoteDataSource {...dataSourceProps} />);
    var dataSource = dataSourceWrapper.instance();
    var cleared = true;
    var setHandlers = (handlers) => {
        dataSourceWrapper.setProps(handlers);
        after(() => {
            var nulls = _.mapValues(handlers, () => { return null });
            dataSourceWrapper.setProps(null);
        });
    };

    describe('#beginSession()', function() {
        it('should initiate a session', function() {
            var location = {
                address: 'http://mordor.me',
            };
            var session = {
                handle: 'abcdefg'
            };
            var system = {
                details: { en: 'Test' }
            };
            var servers = [
                { id: 1, type: 'gitlab' }
            ];
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
            var location = {
                address: 'http://rohan.me',
            };
            var session = {
                handle: 'abcdefg'
            };
            var system = {
                details: { en: 'Test' }
            };
            var servers = [
                { id: 1, type: 'gitlab' }
            ];
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.try(() => {
                    return { session, system, servers };
                });
            };
            dataSource.beginSession(location, 'client').then((result) => {
                var promise = dataSource.beginSession(location, 'client');
                expect(promise.isFulfilled()).to.be.true;
            });
        })
        it('should trigger onChange after failing', function() {
            var onChangePromise = new Promise((resolve, reject) => {
                setHandlers({
                    onChange: (evt) => {
                        resolve(evt);
                    }
                });
            });
            var location = {
                address: 'http://gondor.me',
            };
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
            var onAuthorizationPromise = new Promise((resolve, reject) => {
                setHandlers({
                    onAuthorization: (evt) => {
                        resolve(evt);
                    }
                });
            });
            var location = {
                address: 'http://isengard.me',
            };
            var session = {
                handle: 'abcdefg'
            };
            var sessionLater = {
                token: '123456789',
                user_id: 7,
                etime: Moment().add(1, 'day').toISOString(),
            };
            var system = {
                details: { en: 'Test' }
            };
            var servers = [
                { id: 1, type: 'gitlab' }
            ];
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.try(() => {
                    return { session, system, servers };
                });
            };
            return dataSource.beginSession(location, 'client').then(() => {
                HTTPRequest.fetch = (method, url, payload, options) => {
                    return Promise.try(() => {
                        expect(method).to.match(/get/i);
                        expect(payload).to.have.property('handle', session.handle);
                        return { session: sessionLater };
                    });
                };
                return dataSource.checkSession(location).then((authorized) => {
                    expect(authorized).to.be.true;
                }).then(() => {
                    return onAuthorizationPromise.timeout(1000);
                }).then((evt) => {
                    expect(evt).to.have.property('session');
                    expect(evt.session).to.have.property('token');
                    expect(evt.session).to.have.property('user_id');
                    expect(evt.session).to.have.property('etime');
                });
            });
        })
        it('should simply return false when session is not authorized', function() {
            var event = null;
            setHandlers({
                onExpiration: (evt) => {
                    event = evt;
                },
                onViolation: (evt) => {
                    event = evt;
                },
            });
            var location = {
                address: 'http://dunland.me',
            };
            var session = {
                handle: 'abcdefg'
            };
            var system = {
                details: { en: 'Test' }
            };
            var servers = [
                { id: 1, type: 'gitlab' }
            ];
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.try(() => {
                    return { session, system, servers };
                });
            };
            return dataSource.beginSession(location, 'client').then(() => {
                HTTPRequest.fetch = (method, url, payload, options) => {
                    return Promise.try(() => {
                        return {};
                    });
                };
                return dataSource.checkSession(location).then((authorized) => {
                    expect(authorized).to.be.false;
                    expect(event).to.be.null;
                });
            });
        })
    })
    describe('#submitPassword()', function() {
    })
    describe('#endSession()', function() {
    })
    describe('#beginMobileSession()', function() {
    })
    describe('#acquireMobileSession()', function() {
    })
    describe('#releaseMobileSession()', function() {
    })
    describe('#endMobileSession()', function() {
    })
    describe('#getOAuthURL()', function() {
    })
    describe('#hasAuthorization()', function() {
    })
    describe('#restoreSession()', function() {
    })
    describe('#start()', function() {
    })
    describe('#find()', function() {
    })
    describe('#save()', function() {
    })
    describe('#remove()', function() {
    })
    describe('#clear()', function() {
    })
    describe('#invalidate()', function() {
    })
})
