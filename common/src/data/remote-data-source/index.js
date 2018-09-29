import _ from 'lodash';
import Promise from 'bluebird';
import React from 'react';
import Moment from 'moment';
import * as Async from 'async-do-while';
import EventEmitter, { GenericEvent } from 'relaks-event-emitter';
import ManualPromise from 'utils/manual-promise';
import * as HTTPRequest from 'transport/http-request';
import HTTPError from 'errors/http-error';
import * as LocalSearch from 'data/local-search';
import Search from 'data/remote-data-source/search';
import Change from 'data/remote-data-source/change';
import Storage from 'data/remote-data-source/storage';
import Removal from 'data/remote-data-source/removal';

const defaultOptions = {
    basePath: '/srv/data',
    area: 'client',
    discoveryFlags: {},
    retrievalFlags: {},
    prefetching: true,
    cacheValidation: true,
    refreshInterval: 15 * 60,   // 15 minutes
    sessionRetryInterval: 5000 * 10, // TODO: make it five seconds again
};

const signatureLocation = {
    schema: 'local',
    table: 'remote_schema',
};

class RemoteDataSource extends EventEmitter {
    constructor(options) {
        super();
        this.active = false;
        this.options = _.defaults({}, options, defaultOptions);
        this.disconnected = false;
        this.idMappings = {};
        this.cache = this.options.cache;
        this.cacheValidations = {};
        this.cacheClearing = {};
        this.changeMonitors = [];
        this.recentSearchResults = [];
        this.recentStorageResults = [];
        this.recentRemovalResults = [];
        this.sessions = [];
        this.changeQueue = [];
        this.sessionCheckInterval = 0;
        this.startTime = null;
    }

    activate() {
        if (!this.active) {
            this.sessionCheckInterval = setInterval(() => {
                this.clearExpiredSessions();
            }, 60 * 1000);
            this.active = true;
            this.startTime = Moment();
        }
    }

    deactivate() {
        if (this.active) {
            clearInterval(this.sessionCheckInterval);
            this.sessionCheckInterval = 0;
            this.active = false;
        }
    }

    obtainSession(location, type) {
        let { address } = location;
        if (!address) {
            throw new HTTPError(400);
        }
        let { area } = this.options;
        if (!type) {
            type = 'primary';
        }
        let session = _.find(this.sessions, { address, area, type });
        if (!session) {
            session = {
                address,
                area,
                type,
                handle: '',
                token: '',
                user_id: 0,
                info: {},
                establishmentPromise: null,
                authenticationPromise: null,
                authorizationPromise: null,
            };
            this.sessions.push(session);
        }
        return session;
    }

    discardSession(session) {
        if (_.includes(this.sessions, session)) {
            _.pull(this.sessions, session);
            this.triggerEvent(new RemoteDataSourceEvent('change', this));
        }
    }

    /**
     * Create a login session and retrieve information about the remote server,
     * including a list of OAuth providers
     *
     * @param  {Object} location
     *
     * @return {Promise<Object>}
     */
    beginSession(location) {
        let { sessionRetryInterval } = this.options;
        let session = this.obtainSession(location);
        if (session.establishmentPromise) {
            return session.establishmentPromise;
        }
        let loginInformation;
        Async.do(() => {
            if (!this.active) {
                return;
            }
            let url = `${session.address}/srv/session/`;
            let options = { responseType: 'json', contentType: 'json' };
            let payload = {
                area: session.area,
            };
            return HTTPRequest.fetch('POST', url, payload, options).then((res) => {
                session.handle = res.session.handle;
                session.info  = {
                    system: res.system,
                    servers: res.servers,
                };
            }).catch((err) => {
                console.error(err.message);
            });
        });
        Async.while(() => {
            if (session.handle) {
                return false;
            } else {
                return Promise.delay(sessionRetryInterval).return(true);
            }
        });
        Async.return(() => {
            return session.info;
        });
        session.establishmentPromise = Async.end();
        return session.establishmentPromise;
    }

    /**
     * Query server to see if authorization has been granted
     *
     * @param  {Object} location
     *
     * @return {Promise<Boolean>}
     */
    checkAuthorization(location) {
        let session = this.obtainSession(location);
        if (session.authenticationPromise) {
            return session.authenticationPromise;
        }
        let promise = session.establishmentPromise.then(() => {
            let url = `${session.address}/srv/session/`;
            let options = { responseType: 'json' };
            let payload = {
                handle: session.handle
            };
            return HTTPRequest.fetch('GET', url, payload, options).then((res) => {
                this.grantAuthorization(session, res.session);
                return true;
            }).catch((err) => {
                if (err.statusCode === 401) {
                    session.authenticationPromise = null;
                } else {
                    this.discardSession(session);
                }
                return false;
            });
        });
        session.authenticationPromise = promise;
        return promise;
    }

    /**
     * Authenticate user through username and password
     *
     * @param  {Object} location
     * @param  {Object} credentials
     *
     * @return {Promise}
     */
    authenticate(location, credentials) {
        let session = this.obtainSession(location);
        if (session.authenticationPromise) {
            // already authenticating
            return session.authenticationPromise;
        }
        let promise = session.establishmentPromise.then(() => {
            let url, payload;
            if (credentials.type === 'password') {
                let { username, password } = credentials;
                url = `${session.address}/srv/session/htpasswd/`;
                payload = {
                    handle: session.handle,
                    username,
                    password
                };
            }
            let options = { responseType: 'json', contentType: 'json' };
            return HTTPRequest.fetch('POST', url, payload, options).then((res) => {
                return this.grantAuthorization(session, res.session);
            }).catch((err) => {
                if (err.statusCode === 401) {
                    // credentials aren't valid
                    session.authenticationPromise = null;
                } else {
                    // discard the session if it's any other error
                    this.discardSession(session);
                }
                throw err;
            });
        });
        session.authenticationPromise = promise;
        return promise;
    }

    /**
     * End session at location
     *
     * @param  {Object} location
     *
     * @return {Promise}
     */
    endSession(location) {
        let session = this.obtainSession(location);
        if (!session.establishmentPromise) {
            this.discardSession(session);
            return Promise.resolve();
        }
        return session.establishmentPromise.then(() => {
            let url = `${session.address}/srv/session/`;
            let options = { responseType: 'json', contentType: 'json' };
            let payload = {
                handle: session.handle
            };
            return HTTPRequest.fetch('DELETE', url, payload, options).catch((err) => {
                // clean cached information anyway, even through we failed to
                // remove the session in the backend
                console.error(err);
            }).then(() => {
                this.discardSession(session);
                this.clearRecentOperations(session);
                this.clearCachedSchemas(session);
                this.triggerEvent(new RemoteDataSourceEvent('expiration', this, { session }));
                this.triggerEvent(new RemoteDataSourceEvent('change', this));
                return null;
            });
        });
    }

    /**
     * Start the device activation process (on browser side)
     *
     * @param  {Object} location
     *
     * @return {Promise<String>}
     */
    beginMobileSession(location) {
        let mobileSession = this.obtainSession(location, 'mobile');
        if (mobileSession.establishmentPromise) {
            return mobileSession.establishmentPromise;
        }
        let parentSession = this.obtainSession(location);
        let promise = parentSession.establishmentPromise.then(() => {
            let url = `${parentSession.address}/srv/session/`;
            let options = { responseType: 'json', contentType: 'json' };
            let payload = {
                handle: parentSession.handle,
                area,
            };
            return HTTPRequest.fetch('POST', url, payload, options).then((res) => {
                session.handle = res.session.handle;
                return session.handle;
            }).catch((err) => {
                this.discardSession(mobileSession);
                throw err;
            });
        });
        mobileSession.establishmentPromise = promise;
        return promise;
    }

    /**
     * Acquired a session created earlier through a web-browser (on mobile device)
     *
     * @param  {Object} location
     * @param  {String} handle
     *
     * @return {Promise<Number>}
     */
    acquireMobileSession(location, handle) {
        let session = this.obtainSession(location);
        // discard any other sessions
        while (session.handle && session.handle !== handle) {
            this.discardSession(session);
            session = this.obtainSession(location);
        }
        if (session.authenticationPromise) {
            return session.authenticationPromise;
        }
        // the session has been established already by the web-client
        session.handle = handle;
        session.establishmentPromise = Promise.resolve({});

        let url = `${address}/srv/session/`;
        let options = { responseType: 'json', contentType: 'json' };
        let payload = {
            handle
        };
        let promise = HTTPRequest.fetch('GET', url, payload, options).then((res) => {
            this.grantAuthorization(session, res.session);
            return session.user_id;
        }).catch((err) => {
            this.discardSession(session);
            throw err;
        });
        session.authenticationPromise = promise;
        return promise;
    }

    /**
     * End the activation process, so another device can be activated (on browser side)
     *
     * @param  {Object} location
     *
     * @return {Promise}
     */
    releaseMobileSession(location) {
        let mobileSession = this.obtainSession(location, 'mobile');
        this.discardSession(mobileSession);
    }

    /**
     * Remove authorization from mobile device
     *
     * @param  {Object} location
     * @param  {String} handle
     *
     * @return {Promise}
     */
    endMobileSession(location, handle) {
        let { address } = location;
        let url = `${address}/srv/session/`;
        let options = { responseType: 'json', contentType: 'json' };
        let payload = {
            handle
        };
        return HTTPRequest.fetch('DELETE', url, payload, options).then(() => {
            return null;
        });
    }

    /**
     * Destroy expired sessions. Also remove those that haven't received
     * authorization yet and will be expiring soon so they'd be recreated
     */
    clearExpiredSessions() {
        let changed = false;
        let now = Moment().toISOString();
        let soon = Moment().add(5, 'minute').toISOString();
        _.remove(this.sessions, (session) => {
            if (session.etime < now || (session.etime < soon && !session.token)) {
                changed = true;
                return true;
            }
        });
        if (changed) {
            this.triggerEvent(new RemoteDataSourceEvent('change', this));
        }
    }

    /**
     * Return an URL for granting OAuth access to the backend
     *
     * @param  {Object} location
     * @param  {Object} oauthServer
     * @param  {String} type
     *
     * @return {String}
     */
    getOAuthURL(location, oauthServer, type) {
        let session = this.obtainSession(location);
        if (!session.handle) {
            return '';
        }
        let query = `sid=${oauthServer.id}&handle=${session.handle}`;
        if (type === 'activation') {
            query += '&activation=1';
        } else if (type === 'test') {
            query += '&test=1';
        }
        let url = `${session.address}/srv/session/${oauthServer.type}/?${query}`;
        return url;
    }

    /**
     * Trigger an authentication event, then wait for authorization be to
     * granted. This can happen due to either a call to checkAuthentication()
     * or authenticate() is called.
     *
     * @param  {Object} location
     *
     * @return {Promise<Boolean>}
     */
    requestAuthentication(location) {
        let session = this.obtainSession(location);
        if (session.token) {
            // user is already authenticated
            return Promise.resolve(true);
        }
        // emit an event so a user-interface for authentication is shown
        let event = new RemoteDataSourceEvent('authentication', this, {
            location
        });
        this.triggerEvent(event);
        return event.waitForDecision().then(() => {
            if (event.defaultPrevented) {
                // maybe the event listener restored a saved session
                return !!session.token;
            }
            return this.waitForAuthorization(session);
        });
    }

    /**
     * Indicate that the user has declined to authenticate himself and
     * authorization will not be gained.
     *
     * @param  {Object} location
     */
    cancelAuthentication(location) {
        let session = this.obtainSession(location);
        if (session.authorizationPromise && session.authorizationPromise.resolve) {
            session.authorizationPromise.resolve(false);
        }
    }

    /**
     * Return a promise that fulfills when authorization has been granted
     *
     * @param  {[type]} session
     *
     * @return {[type]}
     */
    waitForAuthorization(session) {
        if (!session.authorizationPromise) {
            session.authorizationPromise = new ManualPromise;
        }
        return session.authorizationPromise;
    }

    /**
     * Attach authorization token to session and trigger authorization event
     *
     * @param  {Object} session
     * @param  {Object} sessionInfo
     *
     * @return {null}
     */
    grantAuthorization(session, sessionInfo) {
        let now = Moment().toISOString();
        if (!sessionInfo) {
            throw HTTPError(500);
        }
        if (sessionInfo.error) {
            throw HTTPError(sessionInfo.error);
        }
        if (!sessionInfo.token || !sessionInfo.user_id || !(sessionInfo.etime > now)) {
            throw HTTPError(401);
        }
        if (sessionInfo.area !== session.area) {
            if (sessionInfo.hasOwnProperty('area')) {
                throw HTTPError(500);
            }
        }
        session.token = sessionInfo.token;
        session.user_id = sessionInfo.user_id;
        session.etime = sessionInfo.etime;
        if (session.authorizationPromise && session.authorizationPromise.resolve) {
            session.authorizationPromise.resolve(true);
        }
        this.triggerEvent(new RemoteDataSourceEvent('authorization', this, {
            session
        }));
        return null;
    }

    restoreAuthorization(location, sessionInfo) {
        let session = this.obtainSession(location);
        try {
            this.grantAuthorization(session, sessionInfo);
            return true;
        } catch (err) {
            this.discardSession(session);
            return false;
        }
    }

    /**
     * Return true if the current user has access to the specified server
     *
     * @param  {Object} location
     *
     * @return {Boolean}
     */
    hasAuthorization(location) {
        let session = this.obtainSession(location);
        return (session.token) ? true : false;
    }

    /**
     * Begin data access at given location, returning the user id
     *
     * @param  {Object} location
     *
     * @return {Promise<Number>}
     */
    start(location) {
        return Promise.try(() => {
            if (location.schema === 'local') {
                return 0;
            }
            let session = this.obtainSession(location);
            if (session.token) {
                return session.user_id;
            } else {
                return this.requestAuthentication(location).then(() => {
                    return this.start(location);
                });
            }
        });
    }

    /**
     * Look for objects matching given query, which includes location info
     *
     * @param  {Object} query
     *
     * @return {Promise<Array<Object>>}
     */
    find(query) {
        let newSearch = new Search(query);
        if (newSearch.isLocal()) {
            return this.searchLocalCache(newSearch).then(() => {
                return newSearch.results;
            });
        } else {
            let byComponent = _.get(query, 'by.constructor.displayName');
            let required = query.required;
            let committed = query.committed;
            let blocking;
            if (query.blocking === true) {
                blocking = 'insufficient';
            } else if (query.blocking === false) {
                blocking = 'never';
            } else if (query.blocking == undefined) {
                blocking = 'insufficient'
            } else {
                blocking = query.blocking;
            }
            if (required) {
                // if results are required, block when they're incomplete
                if (blocking === 'never') {
                    blocking = 'incomplete'
                }
            }
            let search;
            let existingSearch = this.findExistingSearch(newSearch);
            if (existingSearch) {
                // don't reuse search if it has failed
                if (existingSearch.promise.isRejected()) {
                    existingSearch = null;
                }
            }
            if (existingSearch) {
                if (byComponent) {
                    // add the component to the "by" array so we can figure out
                    // who requested the data
                    if (!_.includes(existingSearch.by, byComponent)) {
                        existingSearch.by.push(byComponent);
                    }
                }
                let status;
                if (existingSearch.promise.isFulfilled()) {
                    let { refreshInterval } = this.options;
                    let elapsed = Moment() - this.startTime;
                    if (elapsed < refreshInterval) {
                        // consider objects retrieved prior to the start of the
                        // app to be stale
                        refreshInterval = elapsed;
                    }
                    if (existingSearch.isFresh(refreshInterval)) {
                        status = 'complete';
                    } else {
                        if (existingSearch.updating) {
                            status = 'updating';
                        } else {
                            status = 'expired';
                        }
                    }
                } else {
                    status = 'running';
                }
                if (status === 'expired') {
                    // search is perhaps out-of-date--check with the server
                    let remoteSearchPromise = this.searchRemoteDatabase(existingSearch).then((changed) => {
                        if (changed) {
                            // data returned earlier wasn't entirely correct
                            // trigger a new search through a onChange event
                            this.triggerEvent(new RemoteDataSourceEvent('change', this));
                        }
                        return existingSearch.results;
                    });
                    let waitForRemoteSearch = true;
                    if (blocking !== 'expired') {
                        waitForRemoteSearch = false;
                    }
                    if (waitForRemoteSearch) {
                        existingSearch.promise = remoteSearchPromise;
                    }
                }
                search = existingSearch;
            } else {
                newSearch = this.addSearch(newSearch);

                // look for records in cache first
                newSearch.promise = this.searchLocalCache(newSearch).then(() => {
                    // see what's the status is after scanning the local cache
                    let status;
                    if (newSearch.isMeetingExpectation()) {
                        // local search yield the expected number of objects
                        let { refreshInterval } = this.options;
                        if (newSearch.isSufficientlyRecent(refreshInterval)) {
                            // we got everything we need
                            status = 'complete';
                        } else {
                            // these objects might not be up to date
                            status = 'stale';
                        }
                    } else {
                        if (newSearch.isSufficientlyCached()) {
                            // we don't have everything, but the number meets
                            // or exceeds the minimum specified
                            status = 'incomplete';
                        } else {
                            // no minimum was specified or we're below it
                            status = 'insufficient';
                        }
                    }

                    if (status === 'complete') {
                        // no need to search remotely
                        return newSearch.results;
                    }

                    // perform search on remote server
                    let remoteSearchPromise = this.searchRemoteDatabase(newSearch).then((changed) => {
                        if (changed) {
                            this.triggerEvent(new RemoteDataSourceEvent('change', this));
                        };
                        return search.results;
                    });
                    let waitForRemoteSearch = true;

                    // see if we should wait for the remote search to complete
                    // that depends on what we have from the cache
                    //
                    // generally, if the result set is complete but stale, we
                    // don't block
                    if (blocking === 'never') {
                        waitForRemoteSearch = false;
                    } else {
                        if (status === 'stale') {
                            if (blocking === 'incomplete' || blocking === 'insufficient') {
                                waitForRemoteSearch = false;
                            }
                        } else if (status === 'incomplete') {
                            if (blocking === 'insufficient') {
                                waitForRemoteSearch = false;
                            }
                        }
                    }
                    if (!waitForRemoteSearch) {
                        // return cached results immediately, without waiting for
                        // the remote search to finish
                        //
                        // if the remote search yield new data, an onChange event will
                        // trigger a new search
                        return newSearch.results;
                    }
                    return remoteSearchPromise;
                });
                search = newSearch;
            }
            return search.promise.then((results) => {
                let includeUncommitted = _.get(this.options.discoveryFlags, 'include_uncommitted');
                if (includeUncommitted && committed !== true) {
                    // apply changes that haven't been saved yet
                    search = this.applyUncommittedChanges(search);
                }
                if (required) {
                    if (!search.isMeetingExpectation()) {
                        this.triggerEvent(new RemoteDataSourceEvent('stupefaction', this, {
                            query,
                            results: newSearch.results
                        }));
                        throw new HTTPError(404);
                    }
                }
                return search.results;
            });
        }
    }

    /**
     * Save objects to specified location, which may be the user's computer
     * (if schema is "local") or the remote server.
     *
     * @param  {Object} location
     * @param  {Array<Object>} objects
     * @param  {Object|undefined} options
     *
     * @return {Promise<Array<Object>>}
     */
    save(location, objects, options) {
        let storage = this.addStorage(new Storage(location, objects, options));
        if (storage.isLocal()) {
            return this.updateLocalDatabase(storage).then(() => {
                this.triggerEvent(new RemoteDataSourceEvent('change', this));
                return storage.results;
            });
        } else {
            return this.updateRemoteDatabase(storage).then(() => {
                if (storage.cancelled) {
                    return [];
                }
                this.updateLocalCache(storage);
                this.updateRecentSearchResults(storage);
                this.triggerEvent(new RemoteDataSourceEvent('change', this));
                return storage.results;
            });
        }
    }

    /**
     * Remove objects at given location
     *
     * @param  {Object} location
     * @param  {Array<Object>} objects
     *
     * @return {Promise<Array<Object>>}
     */
    remove(location, objects) {
        let removal = this.addRemoval(new Removal(location, objects));
        if (removal.isLocal()) {
            return this.updateLocalDatabase(removal).then(() => {
                this.triggerEvent(new RemoteDataSourceEvent('change', this));
                return removal.results;
            });
        } else {
            if (process.env.NODE_ENV !== 'production') {
                if (_.get(this.options.discoveryFlags, 'include_deleted')) {
                    console.warn('remove() should not be used when deleted objects are not automatically filtered out');
                }
            }
            return this.updateRemoteDatabase(removal).then(() => {
                this.updateLocalCache(removal);
                this.updateRecentSearchResults(removal);
                this.triggerEvent(new RemoteDataSourceEvent('change', this));
                return removal.results;
            });
        }
    }

    /**
     * Wait for an object to change
     *
     * @param  {Object} location
     * @param  {Object} object
     * @param  {Number} timeout
     *
     * @return {Promise<Boolean>}
     */
    await(location, object, timeout) {
        let monitor = {
            location: _.pick(location, 'address', 'schema', 'table'),
            id: object.id,
            promise: null,
            resolve: null,
        };
        let promise = new Promise((resolve) => {
            monitor.resolve = resolve;
        });
        monitor.promise = promise.timeout(timeout).then(() => {
            return true;
        }).catch((err) => {
            return false;
        }).finally(() => {
            _.pull(this.changeMonitors, monitor);
        });
        this.changeMonitors.push(monitor);
        return monitor.promise;
    }

    /**
     * Override cache mechansim and ensure that the remote searches are
     * perform on given object
     *
     * @param  {Object} location
     * @param  {Object} object
     *
     * @return {Promise<Boolean>}
     */
    refresh(location, object) {
        let relevantSearches = this.getRelevantRecentSearches(location);
        _.each(relevantSearches, (search) => {
            let results = search.results;
            let dirty = false;
            let index = _.sortedIndexBy(results, object, 'id');
            let target = results[index];
            if (target && target.id === object.id) {
                dirty = true;
            }
            if (dirty) {
                search.dirty = true;
            }
        });
    }

    /**
     * Indicate that we're not longer using data from specific location
     *
     * @param  {String} address
     * @param  {String|undefined} schema
     */
    abandon(address, schema) {
        _.each(this.recentSearchResults, (search) => {
            if (!search.isLocal()) {
                if (search.address === address) {
                    if (!schema || search.schema === schema) {
                        search.dirty = true;
                    }
                }
            }
        });
        if (this.cache) {
            this.cache.reset(address, schema);
        }
    }

    /**
     * Invalidate queries based on changes
     *
     * @param  {Array<Object>|undefined} changes
     *
     * @return {Promise}
     */
    invalidate(changes) {
        if (changes) {
            changes = this.omitOwnChanges(changes);
            if (_.isEmpty(changes)) {
                return;
            }
        }
        return this.reconcileChanges(changes).then(() => {
            let invalidated = [];
            _.each(this.recentSearchResults, (search) => {
                if (search.dirty) {
                    return;
                }
                let dirty;
                if (changes) {
                    dirty = _.some(changes, (their) => {
                        if (search.matchLocation(their)) {
                            if (search.isMeetingExpectation()) {
                                // we have all the possible results
                                // see if the changed object is among them
                                let index = _.sortedIndexBy(search.results, { id: their.id }, 'id');
                                let object = search.results[index];
                                if (object && object.id === their.id) {
                                    return true;
                                }
                            } else {
                                // an open-ended search--the changed object
                                // we can't tell if new objects won't show up
                                // in the results
                                return true;
                            }
                        }
                    });
                } else {
                    // invalidate all results
                    dirty = true;
                }
                if (dirty) {
                    search.dirty = true;
                    invalidated.push(search);
                }
            });
            if (_.isEmpty(invalidated)) {
                return false;
            }
            if (this.active) {
                // tell data consuming components to rerun their queries
                // initially, they'd all get the data they had before
                // another change event will occur if new objects are
                // actually retrieved from the remote server
                this.triggerEvent(new RemoteDataSourceEvent('change', this));

                // update recent searches that aren't being used currently
                if (this.options.prefetching) {
                    this.schedulePrefetch(invalidated);
                }
            }
            return true;
        });
    }

    /**
     * Force cache revalidation
     *
     * @param  {Object|null} revalidation
     */
    revalidate(revalidation) {
        this.cacheValidations = _.mapValues(this.cacheValidations, (promises, address) => {
            return _.omitBy(promises, (promise, schema) => {
                if (revalidation) {
                    if (revalidation.address === address) {
                        if (revalidation.schema === '*' || revalidation.schema === schema) {
                            return true;
                        }
                    }
                } else {
                    return true;
                }
            });
        });
    }

    /**
     * Trigger promise created by await()
     *
     * @param  {Object} location
     * @param  {Array<Number>} ids
     */
    triggerChangeMonitors(location, ids) {
        _.each(this.changeMonitors, (monitor) => {
            if (_.isEqual(location, monitor.location)) {
                if (_.includes(ids, monitor.id)) {
                    monitor.resolve();
                }
            }
        });
    }

    /**
     * Filter out notification about changes made by this browser instance
     *
     * @param  {Array<Object>|null} changes
     *
     * @return {Array<Object>|null}
     */
    omitOwnChanges(changes) {
        if (!changes) {
            return null;
        }
        return _.filter(changes, (their) => {
            // examine changes that have been sent earlier
            let relevantChanges = _.filter(this.changeQueue, (change) => {
                if (change.dispatched && !change.failed) {
                    if (change.matchLocation(their)) {
                        return true;
                    }
                }
            });

            // see if the change notification is about an object that was
            // recently saved or is being saved at this very moment
            return !_.some(relevantChanges, (change) => {
                if (change.committed) {
                    return _.some(change.received, (own) => {
                        if (own.id === their.id) {
                            if (own.gn >= their.gn) {
                                // the notification is either due to our own action
                                // or is moot since we've overwritten the remote object
                                return true;
                            }
                        }
                    });
                } else {
                    return _.some(change.delivered, (own) => {
                        if (own.id === their.id) {
                            // the notification is about an object that's in flight
                            return true;
                        }
                    });
                }
            });
        });
    }

    /**
     * Adjust items in change queue to reflect data on server
     *
     * @param  {Array<Object>|null} changes
     *
     * @return {Promise}
     */
    reconcileChanges(changes) {
        return Promise.each(this.changeQueue, (change) => {
            if (change.onConflict === false) {
                // don't need to reconcile object removal
                // we still want the object deleted even if it has changed
                return;
            }
            if (change.dispatched) {
                // it's in-flight already
                return;
            }
            let relevantChanges = _.filter(changes, (their) => {
                return change.matchLocation(their);
            });

            // look for uncommitted objects that were changed remotely
            let affectedObjects = _.filter(change.objects, (own, index) => {
                if (!change.removed[index]) {
                    if (!changes) {
                        // we're dealing with a reconnection scenario
                        // all objects are impacted, unless they're new
                        if (own.id >= 1) {
                            return true;
                        }
                    }
                    return _.some(relevantChanges, (their) => {
                        if (their.id === own.id) {
                            return true;
                        }
                    });
                }
            });
            if (_.isEmpty(affectedObjects)) {
                return null;
            }
            // load the (possibly) new objects
            let affectedIDs = _.map(affectedObjects, 'id');
            return this.retrieveRemoteObjects(change.location, affectedIDs, true).then((remoteObjects) => {
                _.each(affectedObjects, (own) => {
                    let their = _.find(remoteObjects, { id: own.id });
                    if (their) {
                        if (their.gn > own.gn) {
                            let preserve = false;
                            if (change.onConflict) {
                                // use the onConflict handler supplied by caller of
                                // save() to resolve the conflict
                                change.onConflict({
                                    type: 'conflict',
                                    target: this,
                                    local: own,
                                    remote: their,
                                    preventDefault: () => { preserve = true }
                                });
                            }
                            // if preventDefault() wasn't called, then the change
                            // is cancelled
                            if (!preserve) {
                                let index = _.indexOf(change.objects, own);
                                change.removed[index] = true;
                            }
                        }
                    }
                });
                if (_.every(change.removed)) {
                    change.cancel();
                }
                return null;
            });
        });
    }

    /**
     * Look for a recent search that has the same criteria
     *
     * @param  {Search} newSearch
     *
     * @return {Search|null}
     */
    findExistingSearch(newSearch) {
        let index = _.findIndex(this.recentSearchResults, (existingSearch) => {
            return newSearch.match(existingSearch);
        });
        if (index !== -1) {
            // move the matching search to the top
            let existingSearch = this.recentSearchResults[index];
            this.recentSearchResults.splice(index, 1);
            this.recentSearchResults.unshift(existingSearch);
            return existingSearch;
        } else {
            return null;
        }
    }

    /**
     * @param  {Search} newSearch
     *
     * @return {Search}
     */
    addSearch(newSearch) {
        // save the search
        this.recentSearchResults.unshift(newSearch);
        while (this.recentSearchResults.length > 1024) {
            after.pop();
        }
        return newSearch;
    }

    /**
     * Add storage to list
     *
     * @param  {Storage} newStorage
     *
     * @return {Storage}
     */
    addStorage(newStorage) {
        this.recentStorageResults.unshift(newStorage);
        _.remove(this.recentStorageResults, { canceled: true });
        while (this.recentStorageResults.length > 32) {
            this.recentStorageResults.pop();
        }
        return newStorage;
    }

    /**
     * Add removal operation to list
     *
     * @param  {Removal} newRemoval
     *
     * @return {Removal}
     */
    addRemoval(newRemoval) {
        this.recentRemovalResults.unshift(newRemoval);
        while (this.recentRemovalResults.length > 32) {
            this.recentRemovalResults.pop();
        }
        return newRemoval;
    }

    /**
     * Perform a search on the server sude
     *
     * @param  {Search} search
     *
     * @return {Promise<Boolean>}
     */
    searchRemoteDatabase(search) {
        if (search.isLocal()) {
            return Promise.resolve(false);
        }
        if (!this.active) {
            return Promise.resolve(false);
        }
        if (search.updating) {
            return Promise.resolve(false);
        }
        search.updating = true;
        search.scheduled = false;
        let location = search.getLocation();
        let criteria = search.criteria;
        search.start();
        return this.discoverRemoteObjects(location, criteria).then((discovery) => {
            return this.searchLocalCache(search, discovery).return(discovery);
        }).then((discovery) => {
            // use the list of ids and gns (generation number) to determine
            // which objects have changed and which have gone missing
            let ids = discovery.ids;
            let gns = discovery.gns;
            let idsUpdated = search.getUpdateList(ids, gns);
            let idsRemoved = search.getRemovalList(ids);
            if (!_.isEmpty(idsUpdated)) {
                // retrieve the updated (or new) objects from server
                return this.retrieveRemoteObjects(location, idsUpdated).then((retrieval) => {
                    // then add them to the list and remove missing ones
                    let newObjects = retrieval;
                    let newResults = insertObjects(search.results, newObjects);
                    newResults = removeObjects(newResults, idsRemoved);

                    // wait for any storage operation currently in flight to finish so
                    // we don't end up with both the committed and the uncommitted copy
                    let includeUncommitted = _.get(this.options.discoveryFlags, 'include_uncommitted');
                    if (includeUncommitted) {
                        let relatedChanges = _.filter(this.changeQueue, (change) => {
                            if (change.dispatched && !change.committed) {
                                if (change.matchLocation(location)) {
                                    return true;
                                }
                            }
                        });
                        if (!_.isEmpty(relatedChanges)) {
                            let promises = _.map(relatedChanges, 'promise');
                            return Promise.all(promises).reflect().then(() => {
                                return newResults;
                            });
                        }
                    }
                    return newResults;
                });
            } else if (!_.isEmpty(idsRemoved)) {
                // update the result set by removing objects
                let newResults = removeObjects(search.results, idsRemoved);
                return newResults;
            } else {
                return null;
            }
        }).then((newResults) => {
            search.finish(newResults);

            // save to cache
            this.updateLocalCache(search);
            return !!newResults;
        }).finally(() => {
            search.updating = false;

            // trigger onSearch event to indicate searching is finished after
            // some time, if no further search is done
            if (this.searchingEndTimeout) {
                clearTimeout(this.searchingEndTimeout);
            }
            this.searchingEndTimeout = setTimeout(() => {
                let nextPrefetch = _.find(this.recentSearchResults, { scheduled: true });
                if (nextPrefetch) {
                    this.searchRemoteDatabase(nextPrefetch);
                }
                this.searchingEndTimeout = 0;
            }, 250);
        });
    }

    /**
     * Discover objects that meet the criteria specified in the query. Will
     * produce an array of ids and generation numbers.
     *
     * @param  {Object} location
     * @param  {Object} criteria
     *
     * @return {Promise<Array<Object>>}
     */
    discoverRemoteObjects(location, criteria) {
        return this.performRemoteAction(location, 'discovery', criteria);
    }

    /**
     * Retrieve objects that were discovered
     *
     * @param  {Object} location
     * @param  {Array<Number>} ids
     *
     * @return {Promise<Array<Object>>}
     */
    retrieveRemoteObjects(location, ids) {
        return this.performRemoteAction(location, 'retrieval', { ids });
    }

    /**
     * Save objects to remote database; results are saved to the storage object
     *
     * @param  {Storage} storage
     *
     * @return {Promise>}
     */
    updateRemoteDatabase(storage) {
        let change = new Change(storage.getLocation(), storage.objects, storage.options);
        _.each(this.changeQueue, (earlierOp) => {
            if (!earlierOp.committed && !earlierOp.canceled) {
                change.merge(earlierOp);
            }
        });
        if (change.noop()) {
            // deleting new objects that haven't been committed
            storage.finish(storage.objects);
            return Promise.resolve();
        }
        change.onDispatch = (change) => {
            let objects = change.deliverables();
            let location = change.location;
            storage.start();
            return this.performRemoteAction(location, 'storage', { objects }).then((objects) => {
                this.saveIDMapping(location, change.objects, objects);
                return objects;
            });
        };
        this.queueChange(change);
        if (this.active) {
            // send it if we've connectivity
            change.dispatch();
        }
        this.triggerEvent(new RemoteDataSourceEvent('change', this));
        return change.promise.then((objects) => {
            if (!change.canceled) {
                storage.finish(objects);
            } else {
                storage.cancel();
            }
        }).catch((err) => {
            // signal that the change was removed
            this.triggerEvent(new RemoteDataSourceEvent('change', this));
            throw err;
        });
    }

    /**
     * Add an entry to the change queue
     *
     * @param  {Change} change
     */
    queueChange(change) {
        // get rid of entries that's no longer needed
        let delay = (process.env.PLATFORM === 'CORDOVA') ? 10 : 1;
        let someTimeAgo = Moment().subtract(delay, 'minute').toISOString();
        _.remove(this.changeQueue, (oldChange) => {
            if (oldChange.committed) {
                // keep entry in queue until we're certain we won't receive
                // notification about it
                if (oldChange.time < someTimeAgo) {
                    return true;
                }
            } else if (oldChange.dispatched) {
                if (oldChange.error) {
                    // dispatched but failed
                    return true;
                }
            } else if (oldChange.canceled) {
                // undispatched and canceled
                return true;
            }
        });
        this.changeQueue.push(change);
    }

    /**
     * Save relationships between temporary IDs and database IDs
     *
     * @param  {Object} location
     * @param  {Array<Object>} localObjects
     * @param  {Array<Object>} remoteObjects
     */
    saveIDMapping(location, localObjects, remoteObjects) {
        if (localObjects.length !== remoteObjects.length) {
            return;
        }
        let path = [ location.address, location.schema, location.table ];
        let list = _.get(this.idMappings, path);
        if (!list) {
            list = [];
            _.set(this.idMappings, path, list);
        }
        _.each(localObjects, (localObject, index) => {
            if (localObject.id < 1) {
                let remoteObject = remoteObjects[index];
                _.remove(list, { permanent: remoteObject.id });
                list.push({
                    temporary: localObject.id,
                    permanent: remoteObject.id,
                });
            }
        });
    }

    /**
     * Return the tempoprary ID used to reference an object before it
     * was saved
     *
     * @param  {Object} location
     * @param  {Number} permanentID
     *
     * @return {Number|undefined}
     */
    findTemporaryID(location, permanentID) {
        let path = [ location.address, location.schema, location.table ];
        let list = _.get(this.idMappings, path);
        let entry = _.find(list, { permanent: permanentID });
        if (entry) {
            return entry.temporary;
        }
    }

    /**
     * Return the permanent ID assigned to an object after saving
     *
     * @param  {Object} location
     * @param  {Number} temporaryID
     *
     * @return {Number|undefined}
     */
    findPermanentID(location, temporaryID) {
        let path = [ location.address, location.schema, location.table ];
        let list = _.get(this.idMappings, path);
        let entry = _.find(list, { temporary: temporaryID });
        if (entry) {
            return entry.permanent;
        }
    }

    /**
     * Apply uncommitted changes to search results
     *
     * @param  {Search} search
     *
     * @return {Object}
     */
    applyUncommittedChanges(search) {
        let uncommittedChanges = _.filter(this.changeQueue, {
            committed: false,
            canceled: false,
            error: null
        });
        if (!_.isEmpty(uncommittedChanges)) {
            let includeDeleted = _.get(this.options.discoveryFlags, 'include_deleted');
            search = _.clone(search);
            search.results = _.slice(search.results);
            _.each(uncommittedChanges, (change) => {
                change.apply(search, includeDeleted);
            });
        }
        return search;
    }

    /**
     * Perform either a discovery, retrieval, or storage operation at remote
     * server
     *
     * @param  {Object} location
     * @param  {String} action
     * @param  {*} payload
     *
     * @return {Prmise}
     */
    performRemoteAction(location, action, payload) {
        let session = this.obtainSession(location);
        let { schema, table } = location;
        let { basePath } = this.options;
        if (!schema) {
            return Promise.reject(new Error('No schema specified'));
        }
        if (!table) {
            return Promise.reject(new Error('No table specified'));
        }
        let flags;
        if (action === 'retrieval' || action === 'storage') {
            flags = this.options.retrievalFlags;
        } else if (action === 'discovery') {
            flags = _.omit(this.options.discoveryFlags, 'include_uncommitted');
        }
        let url = `${session.address}${basePath}/${action}/${schema}/${table}/`;
        let req = _.assign({}, payload, flags, { auth_token: session.token });
        let options = {
            contentType: 'json',
            responseType: 'json',
        };
        return HTTPRequest.fetch('POST', url, req, options).then((result) => {
            return result;
        }).catch((err) => {
            if (process.env.NODE_ENV !== 'production') {
                console.log(err.message)
                console.log(req);
            }
            if (err.statusCode === 401 || err.statusCode == 403) {
                this.clearRecentOperations(session);
                this.clearCachedSchemas(session);
                if (err.statusCode === 401) {
                    this.discardSession(session);
                    this.triggerEvent(new RemoteDataSourceEvent('expiration', this, { session }));
                } else if (err.statusCode == 403) {
                    this.triggerEvent(new RemoteDataSourceEvent('violation', this, { address, schema }));
                }
                this.triggerEvent(new RemoteDataSourceEvent('change', this));
            }
            throw err;
        });
    }

    /**
     * Store objects in local schema
     *
     * @param  {Storage|Removal} op
     *
     * @return {Promise>}
     */
    updateLocalDatabase(op) {
        return Promise.try(() => {
            let location = op.getLocation();
            op.start();
            if (op instanceof Removal) {
                op.promise = this.cache.remove(location, op.objects);
            } else {
                op.promise = this.cache.save(location, op.objects);
            }
            return op.promise.then((objects) => {
                op.finish(objects);
            });
        });
    }

    /**
     * Search local cache
     *
     * @param  {Search} search
     * @param  {Object|undefined} discovery
     *
     * @return {Promise<Boolean>}
     */
    searchLocalCache(search, discovery) {
        return this.validateCache(search).then((signature) => {
            search.validateResults(signature);

            if (!discovery) {
                // pre-discovery search of cache
                if (search.remote) {
                    // don't scan cache initially if we must perform the search
                    // on the remote server (i.e. the criteria are too complex)
                    return false;
                }
                let query = search.getQuery();
                return this.cache.find(query).then((objects) => {
                    search.results = objects;
                    return true;
                });
            } else {
                // post discovery loading of cached objects, needed only when
                // we can't search locally
                if (!search.remote) {
                    return false;
                }
                let ids = search.getFetchList(discovery.ids);
                if (_.isEmpty(ids)) {
                    return false;
                }
                let query = _.assign({ criteria: { id: ids } }, search.getLocation());
                return cache.find(query).then((objects) => {
                    search.results = insertObjects(search.results, objects);
                    return true;
                });
            }
        }).catch((err) => {
            console.error(err);
            return false;
        });
    }

    /**
     * Compare signature stored previous with current signature; if they do
     * not match, clean the cache
     *
     * @param  {Object} location
     *
     * @return {Promise<String>}
     */
    validateCache(location) {
        let { address, schema } = location;
        if (schema === 'local' || !this.options.cacheValidation) {
            return Promise.resolve('none');
        }
        let path = [ address, schema ];
        let promise = _.get(this.cacheValidations, path);
        if (promise) {
            return promise;
        }
        promise = this.getRemoteSignature(location).then((remoteSignature) => {
            return this.getCacheSignature(location).then((cacheSignature) => {
                if (!remoteSignature) {
                    return cacheSignature || 'none';
                }
                if (cacheSignature) {
                    if (cacheSignature === remoteSignature) {
                        return remoteSignature;
                    } else {
                        return this.clearCachedObjects(location).then(() => {
                            this.setCacheSignature(location, remoteSignature);
                            return remoteSignature;
                        });
                    }
                } else {
                    // wait for any cache clearing operation to complete
                    return this.waitForCacheClearing(address, schema).then(() => {
                        this.setCacheSignature(location, remoteSignature);
                        return remoteSignature;
                    });
                }
            });
        }).catch((err) => {
            console.error(err);
            _.unset(this.cacheValidations, path);
        });
        _.set(this.cacheValidations, path, promise);
        return promise;
    }

    /**
     * Clear cached schema at given address
     *
     * @param  {Object} session
     *
     * @return {Promise}
     */
    clearCachedSchemas(session) {
        // remove all validation results for address
        _.unset(this.cacheValidations, [ session.address ]);

        // clear the objects first
        let location = { address: session.address, schema: '*' };
        return this.clearCachedObjects(location).then(() => {
            // remove the signatures
            let prefix = `${session.address}/`;
            return this.cache.find(signatureLocation).filter((row) => {
                return _.startsWith(row.key, prefix);
            }).then((rows) => {
                return this.cache.remove(location, rows);
            })
        });
    }

    /**
     * Fetch signature of schema
     *
     * @param  {Object} location
     *
     * @return {Promise<String>}
     */
    getRemoteSignature(location) {
        if (!this.active) {
            return Promise.resolve('');
        }
        let { schema } = location;
        let { basePath } = this.options;
        let session = this.obtainSession(location)
        let url = `${session.address}${basePath}/signature/${schema}`;
        let options = { responseType: 'json', contentType: 'json' };
        let payload = { auth_token: session.token };
        return HTTPRequest.fetch('POST', url, payload, options).then((result) => {
            return _.get(result, 'signature');
        });
    }

    /**
     * Load signature of cached schema
     *
     * @param  {Object} location
     *
     * @return {Promise<String>}
     */
    getCacheSignature(location) {
        let { address, schema } = location;
        let key = `${address}/${schema}`;
        let query = _.assign({}, signatureLocation, { criteria: { key } });
        return this.cache.find(query).get(0).then((result) => {
            return _.get(result, 'signature');
        });
    }

    /**
     * Save signature of cached schema
     *
     * @param  {Object} location
     * @param  {String} signature
     *
     * @return {Promise}
     */
    setCacheSignature(location, signature) {
        let { address, schema } = location;
        let key = `${address}/${schema}`;
        let entry = { key, signature };
        return this.cache.save(signatureLocation, [ entry ]);
    }

    /**
     * Update objects in local cache with remote copies
     *
     * @param  {Search|Storage|Removal} op
     *
     * @return {Promise<Boolean>}
     */
    updateLocalCache(op) {
        return Promise.try(() => {
            let location = op.getLocation();
            if (op instanceof Search) {
                return this.cache.save(location, op.results).then(() => {
                    return this.cache.remove(location, op.missingResults);
                });
            } else if (op instanceof Removal) {
                return this.cache.remove(location, op.results);
            } else if (op instanceof Storage) {
                return this.cache.save(location, op.results);
            }
        }).then(() => {
            return true;
        }).catch((err) => {
            console.error(err);
            return false;
        });
    }

    /**
     * Deleted all cached objects originating from given server
     *
     * @param  {Object} location
     *
     * @return {Promise<Number>}
     */
    clearCachedObjects(location) {
        return Promise.try(() => {
            let { address, schema } = location;
            // see if we're in the middle of clearing everything from address
            let clearingAllPromise = _.get(this.cacheClearing, [ address, '*' ]);
            if (clearingAllPromise) {
                return clearingAllPromise;
            }

            let path = [ address, schema ];
            let clearingSchemaPromise = _.get(this.cacheClearing, path);
            if (!clearingSchemaPromise) {
                clearingSchemaPromise = this.cache.clean({ address, schema }).then((count) => {
                    _.unset(this.cacheClearing, path);
                    return count;
                });
                _.set(this.cacheClearing, path, clearingSchemaPromise);
            }
            return clearingSchemaPromise;
        });
    }

    /**
     * If a schema is in the middle of being cleared, return the promise from
     * that operation
     *
     * @param  {String} address
     * @param  {String} schema
     *
     * @return {Promise<Number>}
     */
    waitForCacheClearing(address, schema) {
        let clearingAllPromise = _.get(this.cacheClearing, [ address, '*' ]);
        if (clearingAllPromise) {
            return clearingAllPromise;
        }
        let clearingSchemaPromise = _.get(this.cacheClearing, [ address, schema ]);
        if (clearingSchemaPromise) {
            return clearingSchemaPromise;
        }
        return Promise.resolve(0);
    }

    /**
     * Update recent search results; if a storage operation was performed,
     * add any new objects that match the criteria of a search; if a removal
     * was done, take the objects out of the search results
     *
     * @param  {Storage|Removal} op
     */
    updateRecentSearchResults(op) {
        let relevantSearches = this.getRelevantRecentSearches(op.getLocation());
        _.each(relevantSearches, (search) => {
            let resultsBefore = search.results;
            let resultsAfter = resultsBefore;
            _.each(op.results, (object) => {
                let index = _.sortedIndexBy(resultsAfter, object, 'id');
                let target = resultsAfter[index];
                let present = (target && target.id === object.id);
                // note: Removal is a subclass of Storage
                if (op instanceof Removal) {
                    if (present) {
                        if (resultsAfter === resultsBefore) {
                            resultsAfter = _.slice(resultsAfter);
                        }
                        resultsAfter.splice(index, 1);
                    }
                } else if (op instanceof Storage) {
                    let match = LocalSearch.match(search.table, object, search.criteria);
                    if (match || present) {
                        if (resultsAfter === resultsBefore) {
                            // create new array so memoized functions won't return old results
                            resultsAfter = _.slice(resultsAfter);
                        }
                        if (match && present) {
                            // update the object with new one
                            resultsAfter[index] = object;
                        } else if (match && !present) {
                            // insert a new object
                            resultsAfter.splice(index, 0, object);
                            LocalSearch.limit(search.table, resultsAfter, search.criteria)
                        } else if (!match && present) {
                            // remove object from the list as it no longer
                            // meets the criteria
                            resultsAfter.splice(index, 1);
                        }
                    }
                }
            });
            if (resultsAfter !== resultsBefore) {
                search.results = resultsAfter;
                search.promise = Promise.resolve(resultsAfter);
            }
        });
    }

    /**
     * Return recent searches that were done at the given location
     *
     * @param  {Object} location
     *
     * @return {Array<Object>}
     */
    getRelevantRecentSearches(location) {
        return _.filter(this.recentSearchResults, (search) => {
            if (search.matchLocation(location)) {
                return true;
            }
        });
    }

    /**
     * Remove recent search performed on given server
     *
     * @param  {Object} session
     */
    clearRecentOperations(session) {
        let lists = [
            this.recentSearchResults,
            this.recentStorageResults,
            this.recentRemovalResults
        ];
        _.each(lists, (list) => {
            _.remove(list, (op) => {
                return (op.address === session.address);
            });
        });
    }

    /**
     * Start updating recent searches that are dirty
     *
     * @param  {Array<Object>} dirtySearches
     */
    schedulePrefetch(dirtySearches) {
        let selected = [];
        _.each(dirtySearches, (search) => {
            if (!search.prefetch) {
                return;
            }
            // don't prefetch a search if the same component has done a
            // search with the same shape more recently
            let shape = search.getCriteriaShape();
            let similar = _.some(selected, (f) => {
                if (_.includes(search.by, f.component)) {
                    if (_.isEqual(shape, f.shape)) {
                        return true;
                    }
                }
            });
            if (!similar) {
                selected.push(search);
                if (!search.updating) {
                    search.scheduled = true;
                }
                if (selected.length > 16) {
                    return false;
                }
            }
        });

        // if searching hasn't start after a while, trigger prefetching
        setTimeout(() => {
            if (!this.searching) {
                let search = _.find(this.recentSearchResults, { scheduled: true, updating: false });
                if (search) {
                    this.searchRemoteDatabase(search);
                }
            }
        }, 50);
    }
}

/**
 * Remove objects matching a list of ids from a sorted array, returning a
 * new array
 *
 * @param  {Array<Object>} objects
 * @param  {Array<Number>} ids
 *
 * @return {Array<Object>}
 */
function removeObjects(objects, ids) {
    if (_.isEmpty(ids)) {
        return objects;
    }
    objects = _.slice(objects);
    _.each(ids, (id) => {
        let index = _.sortedIndexBy(objects, { id }, 'id');
        let object = (objects) ? objects[index] : null;
        if (object && object.id === id) {
            objects.splice(index, 1);
        }
    });
    return objects;
}

/**
 * Insert objects into an array of objects sorted by id, returning a new array
 *
 * @param  {Array<Object>} objects
 * @param  {Array<Object>} newObjects
 *
 * @return {Array<Object>}
 */
function insertObjects(objects, newObjects) {
    objects = _.slice(objects);
    _.each(newObjects, (newObject) => {
        let index = _.sortedIndexBy(objects, newObject, 'id');
        let object = objects[index];
        if (object && object.id === newObject.id) {
            objects[index] = newObject;
        } else {
            objects.splice(index, 0, newObject);
        }
    });
    return objects;
}

class RemoteDataSourceEvent extends GenericEvent {
}

export {
    RemoteDataSource as default,
    RemoteDataSource,
};
