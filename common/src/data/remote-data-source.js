import _ from 'lodash';
import Bluebird from 'bluebird';
import Moment from 'moment';
import EventEmitter, { GenericEvent } from 'relaks-event-emitter';
import ManualPromise from 'utils/manual-promise';
import * as HTTPRequest from 'transport/http-request';
import HTTPError from 'errors/http-error';
import * as LocalSearch from 'data/local-search';
import Search from 'data/remote-data-source/search';
import Change from 'data/remote-data-source/change';
import Storage from 'data/remote-data-source/storage';
import Removal from 'data/remote-data-source/removal';
import CacheSignature from 'data/remote-data-source/cache-signature';
import ChangeMonitor from 'data/remote-data-source/change-monitor';

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
        this.idMappings = {};
        this.cache = this.options.cache;
        this.cacheSignatures = [];
        this.changeMonitors = [];
        this.recentSearchResults = [];
        this.recentStorageResults = [];
        this.recentRemovalResults = [];
        this.sessions = [];
        this.changeQueue = [];
        this.sessionCheckInterval = 0;
        this.startTime = null;
        this.requestCount = 0;
    }

    activate() {
        if (!this.active) {
            this.sessionCheckInterval = setInterval(() => {
                this.clearExpiredSessions();
            }, 60 * 1000);
            this.active = true;
            this.startTime = Moment();
            // force validation of schema signatures
            this.revalidate();
            this.invalidate();
            this.dispatchPending();
        }
    }

    deactivate() {
        if (this.active) {
            clearInterval(this.sessionCheckInterval);
            this.sessionCheckInterval = 0;
            this.active = false;
        }
    }

    /**
     * Begin data access at given location, returning the user id
     *
     * @param  {Object} location
     *
     * @return {Promise<Number>}
     */
    async start(location) {
        if (location.schema === 'local') {
            return 0;
        }
        let session = this.obtainSession(location);
        if (session.token) {
            return session.user_id;
        } else {
            await this.requestAuthentication(location);
            return this.start(location);
        }
    }

    /**
     * Look for objects matching given query, which includes location info
     *
     * @param  {Object} query
     *
     * @return {Promise<Array<Object>>}
     */
    async find(query) {
        let newSearch = new Search(query);
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
        let required = query.required || false;
        let committed = query.committed || false;
        let refreshInterval = this.options.refreshInterval;
        let search = _.find(this.recentSearchResults, (search) => {
            return search.match(newSearch);
        });
        if (!search) {
            search = newSearch;
            if (!search.remote) {
                search.localSearchPromise = this.searchLocalCache(search);
            }
            // don't save local searches
            if (!search.local) {
                search.remoteSearchPromise = this.searchRemoteDatabase(search);
                search = this.addSearch(newSearch);
            }
        } else {
            if (!search.updating) {
                if (!search.isFresh(refreshInterval)) {
                    search.remoteSearchPromise = this.searchRemoteDatabase(search);
                }
            }
        }

        if (search.localSearchPromise) {
            await search.localSearchPromise;
        }

        if (search.remoteSearchPromise) {
            let waitForRemote = false;
            if (search.remote) {
                waitForRemote = true;
            } else if (search.initial) {
                switch (blocking) {
                    case 'insufficient':
                        if (!search.isMeetingExpectation() && !search.isSufficientlyCached()) {
                            waitForRemote = true;
                        }
                        break;
                    case 'expired':
                    case 'stale':
                        if (!search.isMeetingExpectation() || !search.isSufficientlyRecent(refreshInterval)) {
                            waitForRemote = true;
                        }
                        break;
                    case 'never':
                        break;
                }
            } else {
                switch (blocking) {
                    case 'expired':
                        if (search.dirty) {
                            waitForRemote = true;
                        }
                        break;
                    case 'insufficient':
                    case 'never':
                    case 'sale':
                        break;
                }
            }
            if (waitForRemote) {
                await search.remoteSearchPromise;
            } else {
                search.notifying = true;
            }
        }

        let includeUncommitted = _.get(this.options.discoveryFlags, 'include_uncommitted');
        if (includeUncommitted && !committed) {
            search = this.applyUncommittedChanges(search);
        }
        if (required) {
            if (!search.isMeetingExpectation()) {
                if (search.failed) {
                    throw search.error;
                } else {
                    this.triggerEvent(new RemoteDataSourceEvent('stupefaction', this, {
                        query,
                        results: search.results
                    }));
                    throw new HTTPError(404);
                }
            }
        }
        return search.results;
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
    async save(location, objects, options) {
        let storage = this.addStorage(new Storage(location, objects, options));
        if (storage.local) {
            await this.updateLocalDatabase(storage);
        } else {
            await this.updateRemoteDatabase(storage);
            if (storage.canceled) {
                return [];
            }
            this.updateLocalCache(storage);
            this.updateRecentSearchResults(storage);
        }
        this.triggerEvent(new RemoteDataSourceEvent('change', this));
        if (_.get(this.options.discoveryFlags, 'include_deleted')) {
            return storage.results;
        } else {
            let deleted = _.filter(storage.results, { deleted: true });
            let saved = _.difference(storage.results, deleted);
            return saved;
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
    async remove(location, objects) {
        let removal = this.addRemoval(new Removal(location, objects));
        if (removal.local) {
            await this.updateLocalDatabase(removal);
        } else {
            if (process.env.NODE_ENV !== 'production') {
                if (_.get(this.options.discoveryFlags, 'include_deleted')) {
                    console.warn('remove() should not be used when deleted objects are not automatically filtered out');
                }
            }
            await this.updateRemoteDatabase(removal);
            this.updateLocalCache(removal);
            this.updateRecentSearchResults(removal);
        }
        this.triggerEvent(new RemoteDataSourceEvent('change', this));
        return removal.results;
    }

    /**
     * Return true if the current user has access to the specified server
     *
     * @param  {Object} location
     *
     * @return {Boolean}
     */
    hasAuthorization(location) {
        try {
            let session = this.obtainSession(location);
            return (session.token) ? true : false;
        } catch (err) {
            return false;
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
        let session = this.obtainSession(location);
        if (!session.establishmentPromise) {
            session.establishmentPromise = this.establishSession(session);
        }
        return session.establishmentPromise;
    }

    /**
     * Query server to see if authorization has been granted
     *
     * @param  {Object} location
     *
     * @return {Promise<Boolean>}
     */
    async checkAuthorization(location) {
        let session = this.obtainSession(location);
        if (!session.authenticationPromise) {
            session.authenticationPromise = this.confirmAuthorization(session);
        }
        return session.authenticationPromise;
    }

    /**
     * Authenticate user through username and password
     *
     * @param  {Object} location
     * @param  {Object} credentials
     *
     * @return {Promise}
     */
    async authenticate(location, credentials) {
        let session = this.obtainSession(location);
        if (!session.authenticationPromise) {
            session.authenticationPromise = this.authenticateSession(session, credentials);
        }
        return session.authenticationPromise;
    }

    /**
     * End session at location
     *
     * @param  {Object} location
     *
     * @return {Promise}
     */
    async endSession(location) {
        let session = this.obtainSession(location);
        this.discardSession(session);
        if (!session.establishmentPromise) {
            return;
        }
        return this.deauthorizeSession(session);
    }

    /**
     * Start the device activation process (on browser side)
     *
     * @param  {Object} location
     *
     * @return {Promise<String>}
     */
    async beginMobileSession(location) {
        let mobileSession = this.obtainSession(location, 'mobile');
        if (!mobileSession.establishmentPromise) {
            mobileSession.establishmentPromise = this.establishMobileSession(mobileSession);
        }
        return mobileSession.establishmentPromise;
    }

    /**
     * Acquired a session created earlier through a web-browser (on mobile device)
     *
     * @param  {Object} location
     * @param  {String} handle
     *
     * @return {Promise<Number>}
     */
    async acquireMobileSession(location, handle) {
        let session = this.obtainSession(location);
        // discard any other sessions
        while (session.handle && session.handle !== handle) {
            this.discardSession(session);
            session = this.obtainSession(location);
        }
        if (!session.authenticationPromise) {
            // the session has been established already by the web-client
            session.handle = handle;
            session.establishmentPromise = Promise.resolve({});
            session.authenticationPromise = this.authorizeMobileSession(session);
        }
        return session.authenticationPromise;
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
    async endMobileSession(location, handle) {
        let { address } = location;
        let url = `${address}/srv/session/`;
        let options = { responseType: 'json', contentType: 'json' };
        let payload = { handle };
        await HTTPRequest.fetch('DELETE', url, payload, options);
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
     * Dispatch pending changes
     */
    async dispatchPending() {
        if (this.active) {
            // reconcile changes and invalidate all searches
            await this.invalidate();
            // send pending changes
            for (let change of this.changeQueue) {
                change.dispatch();
            }
        }
    }

    /**
     * Invalidate queries based on changes
     *
     * @param  {Array<Object>|undefined} changes
     *
     * @return {Promise}
     */
    async invalidate(changes) {
        if (changes) {
            changes = this.omitOwnChanges(changes);
        }
        await this.reconcileChanges(changes);
        let invalidated = [];
        for (let search of this.recentSearchResults) {
            if (!search.dirty) {
                let dirty;
                if (changes) {
                    for (let their of changes) {
                        if (search.matchLocation(their)) {
                            if (search.isMeetingExpectation()) {
                                // we have all the possible results
                                // see if the changed object is among them
                                let index = _.sortedIndexBy(search.results, { id: their.id }, 'id');
                                let object = search.results[index];
                                if (object && object.id === their.id) {
                                    dirty = true;
                                    break;
                                }
                            } else {
                                // an open-ended search--the changed object
                                // we can't tell if new objects won't show up
                                // in the results
                                dirty = true;
                                break;
                            }
                        }
                    }
                } else {
                    // invalidate all results
                    dirty = true;
                }
                if (dirty) {
                    search.dirty = true;
                    invalidated.push(search);
                }
            } else {
            }
        }
        for (let changeMontior of this.changeMonitors) {
            for (let their of changes) {
                if (changeMontior.match(their)) {
                    changeMontior.resolve();
                }
            }
        }
        if (_.isEmpty(invalidated)) {
            return false;
        }
        if (this.active) {
            // tell data consuming components to rerun their queries
            // initially, they'd all get the data they had before
            // another change event will occur if new objects are
            // actually retrieved from the remote server
            this.triggerEvent(new RemoteDataSourceEvent('change', this));
        }
        return true;
    }

    /**
     * Force cache revalidation
     *
     * @param  {Object|null} revalidation
     */
    async revalidate(revalidation) {
        this.cacheSignatures = _.filter(this.cacheSignatures, (cacheSignature) => {
            if (!revalidation) {
                return false;
            } else if (revalidation.address === cacheSignature.address) {
                if (revalidation.schema === '*' || revalidation.schema === cacheSignature.schema) {
                    return false;
                }
            }
            return true;
        });
    }

    /**
     * Override cache mechansim and ensure that the remote searches are
     * perform on given object
     *
     * @param  {Object} location
     * @param  {Object} object
     */
    refresh(location, object) {
        let relevantSearches = this.getRelevantRecentSearches(location);
        for (let search of relevantSearches) {
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
        }
    }

    /**
     * Indicate that we're not longer using data from specific location
     *
     * @param  {String} address
     * @param  {String|undefined} schema
     */
    abandon(address, schema) {
        for (let search of this.recentSearchResults) {
            if (!search.local) {
                if (search.address === address) {
                    if (!schema || search.schema === schema) {
                        search.dirty = true;
                    }
                }
            }
        }
        if (this.cache) {
            this.cache.reset(address, schema);
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
    async waitForChange(location, object, timeout) {
        let { address, schema, table } = location;
        let { id } = object;
        let monitor = new ChangeMonitor(address, schema, table, id);
        this.changeMonitors.push(monitor);
        monitor.setTimeout(timeout);
        let result = await monitor.promise;
        _.pull(this.changeMonitors, monitor);
        return result;
    }

    /**
     * Filter out notification about changes made by this browser instance
     *
     * @param  {Array<Object>|null} changes
     *
     * @return {Array<Object>|null}
     */
    omitOwnChanges(changes) {
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
    async reconcileChanges(changes) {
        if (!this.active) {
            return;
        }
        for (let change of this.changeQueue) {
            if (change.onConflict === false) {
                // don't need to reconcile object removal
                // we still want the object deleted even if it has changed
                continue;
            }
            if (change.dispatched) {
                // it's in-flight already
                continue;
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
                continue;
            }
            // load the (possibly) new objects
            let affectedIDs = _.map(affectedObjects, 'id');
            let remoteObjects = await this.retrieveRemoteObjects(change.location, affectedIDs, true);
            for (let own of affectedObjects) {
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
            }
            if (_.every(change.removed)) {
                change.cancel();
            }
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
        let newSearch;
        let includeDeleted = _.get(this.options.discoveryFlags, 'include_deleted');
        for (let change of this.changeQueue) {
            if (change.matchLocation(search)) {
                if (!change.committed && !change.canceled && !change.error) {
                    if (!newSearch) {
                        newSearch = _.clone(search);
                        newSearch.results = _.slice(search.results);
                    }
                    change.apply(newSearch, includeDeleted);
                }
            }
        }
        return newSearch || search;
    }

    /**
     * Find existing session object for location or create a new one
     *
     * @param  {Object} location
     * @param  {String} type
     *
     * @return {Object|null}
     */
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

    async establishSession(session) {
        let { sessionRetryInterval } = this.options;
        for (;;) {
            try {
                let url = `${session.address}/srv/session/`;
                let options = { responseType: 'json', contentType: 'json' };
                let payload = { area: session.area };
                let res = await HTTPRequest.fetch('POST', url, payload, options);
                session.handle = res.session.handle;
                session.info  = {
                    system: res.system,
                    servers: res.servers,
                };
                return session.info;
            } catch (err) {
                console.error(err.message);
                await Bluebird.delay(sessionRetryInterval);
            }
        }
    }

    async confirmAuthorization(session) {
        try {
            await session.establishmentPromise;

            let url = `${session.address}/srv/session/`;
            let options = { responseType: 'json' };
            let payload = {
                handle: session.handle
            };
            let res = await HTTPRequest.fetch('GET', url, payload, options);
            if (res && res.session) {
                this.grantAuthorization(session, res.session);
                return true;
            } else {
                session.authenticationPromise = null;
                return false;
            }
        } catch (err) {
            if (err.statusCode === 401) {
                session.authenticationPromise = null;
            } else {
                this.discardSession(session);
                throw err;
            }
        }
    }

    async authenticateSession(session, credentials) {
        try {
            await session.establishmentPromise;
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
            let res = await HTTPRequest.fetch('POST', url, payload, options);
            this.grantAuthorization(session, res.session);
        } catch (err) {
            if (err.statusCode === 401) {
                // credentials aren't valid
                session.authenticationPromise = null;
            } else {
                // discard the session if it's any other error
                this.discardSession(session);
            }
            throw err;
        }
    }

    async deauthorizeSession(session) {
        try {
            await session.establishmentPromise;
            let url = `${session.address}/srv/session/`;
            let options = { responseType: 'json', contentType: 'json' };
            let payload = {
                handle: session.handle
            };
            await HTTPRequest.fetch('DELETE', url, payload, options);
        } catch(err) {
            // clean cached information anyway, even through we failed to
            // remove the session in the backend
            console.error(err);
        }
        this.clearRecentOperations(session);
        this.clearCachedSchemas(session);
        this.triggerEvent(new RemoteDataSourceEvent('expiration', this, { session }));
        this.triggerEvent(new RemoteDataSourceEvent('change', this));
    }

    async establishMobileSession(mobileSession) {
        try {
            let parentSession = this.obtainSession(mobileSession);
            if (!parentSession) {
                throw new HTTPError(400);
            }
            await parentSession.establishmentPromise;
            let { area } = this.options;
            let url = `${parentSession.address}/srv/session/`;
            let options = { responseType: 'json', contentType: 'json' };
            let payload = {
                handle: parentSession.handle,
                area,
            };
            let res = await HTTPRequest.fetch('POST', url, payload, options);
            mobileSession.handle = res.session.handle;
            return mobileSession.handle;
        } catch (err) {
            this.discardSession(mobileSession);
            throw err;
        }
    }

    async authorizeMobileSession(session) {
        let url = `${session.address}/srv/session/`;
        let options = { responseType: 'json', contentType: 'json' };
        let payload = { handle: session.handle };
        let res = await HTTPRequest.fetch('GET', url, payload, options);
        if (!res) {
            throw new HTTPError(400);
        }
        this.grantAuthorization(session, res.session);
        return session.user_id;
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
     * @return {Promise}
     */
    async requestAuthentication(location) {
        let session = this.obtainSession(location);
        if (session.token) {
            // user is already authenticated
            return;
        }
        // emit an event so a user-interface for authentication is shown
        let event = new RemoteDataSourceEvent('authentication', this, { location });
        this.triggerEvent(event);
        await event.waitForDecision();
        let shouldWait = !event.defaultPrevented;
        if (!shouldWait) {
            throw new HTTPError(401);
        }
        let success = await this.waitForAuthorization(session);
        if (!success) {
            throw new HTTPError(401);
        }
    }

    /**
     * Indicate that the user has declined to authenticate himself and
     * authorization will not be gained.
     *
     * @param  {Object} location
     */
    cancelAuthentication(location) {
        let session = this.obtainSession(location);
        if (session.authorizationPromise) {
            if (session.authorizationPromise.resolve) {
                session.authorizationPromise.resolve(false);
            }
        }
    }

    /**
     * Return a promise that fulfills when authorization has been granted
     *
     * @param  {Object} session
     *
     * @return {Promise}
     */
    waitForAuthorization(session) {
        if (!session.authorizationPromise) {
            session.authorizationPromise = ManualPromise();
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
            throw new HTTPError(500);
        }
        if (sessionInfo.error) {
            throw new HTTPError(sessionInfo.error);
        }
        if (!sessionInfo.token || !sessionInfo.user_id || !(sessionInfo.etime > now)) {
            throw new HTTPError(401);
        }
        if (sessionInfo.area !== session.area) {
            if (sessionInfo.hasOwnProperty('area')) {
                throw new HTTPError(500);
            }
        }
        if (!session.handle) {
            if (!sessionInfo.handle) {
                throw new HTTPError(500);
            }
            session.handle = sessionInfo.handle;
        }
        session.token = sessionInfo.token;
        session.user_id = sessionInfo.user_id;
        session.etime = sessionInfo.etime;
        if (session.authorizationPromise && session.authorizationPromise.resolve) {
            session.authorizationPromise.resolve(true);
        } else {
            session.authorizationPromise = Promise.resolve(true);
        }
        this.triggerEvent(new RemoteDataSourceEvent('authorization', this, {
            session
        }));
        this.triggerEvent(new RemoteDataSourceEvent('change', this));
        return null;
    }

    restoreAuthorization(location, sessionInfo) {
        let session = this.obtainSession(location);
        try {
            if (!session.establishmentPromise) {
                session.establishmentPromise = Promise.resolve(true);
            }
            this.grantAuthorization(session, sessionInfo);
            return true;
        } catch (err) {
            this.discardSession(session);
            return false;
        }
    }

    async searchLocalCache(search) {
        try {
            let query = search.getQuery();
            let location = search.getLocation();
            search.results = await this.cache.find(query);
            search.signature = await this.getCacheSignature(location);
        } catch (err) {
        }
    }

    async retrieveFromLocalCache(search, discovery) {
        try {
            let location = search.getLocation();
            let ids = search.getFetchList(discovery.ids);
            if (!_.isEmpty(ids)) {
                let query = _.assign({ criteria: { id: ids } }, location);
                let objects = await this.cache.find(query);
                search.results = insertObjects(search.results, objects);
            }
            search.signature = await this.getCacheSignature(location);
        } catch (err) {
        }
    }

    async searchRemoteDatabase(search) {
        if (search.localSearchPromise) {
            await search.localSearchPromise;
        }

        if (!this.active) {
            return;
        }
        try {
            if (!search.remote) {
                await this.verifyCacheSignature(search);

                if (!search.dirty) {
                    if (search.isMeetingExpectation()) {
                        let refreshInterval = this.options.refreshInterval;
                        if (search.isSufficientlyRecent(refreshInterval)) {
                            return;
                        }
                    }
                }
            }

            search.start();
            let location = search.getLocation();
            let criteria = search.criteria;
            let discovery = await this.discoverRemoteObjects(location, criteria);
            if (search.remote) {
                await this.retrieveFromLocalCache(search, discovery);
                await this.verifyCacheSignature(search);
            }
            // use the list of ids and gns (generation number) to determine
            // which objects have changed and which have gone missing
            let idsUpdated = search.getUpdateList(discovery.ids, discovery.gns);
            let idsRemoved = search.getRemovalList(discovery.ids);

            let newResults = search.results;
            if (!_.isEmpty(idsRemoved)) {
                newResults = removeObjects(newResults, idsRemoved);
            }
            if (!_.isEmpty(idsUpdated)) {
                // retrieve the updated (or new) objects from server
                let newObjects = await this.retrieveRemoteObjects(location, idsUpdated);
                // then add them to the list
                newResults = insertObjects(newResults, newObjects);
            }
            if (newResults === undefined) {
                newResults = [];
            }

            let includeUncommitted = _.get(this.options.discoveryFlags, 'include_uncommitted');
            if (includeUncommitted) {
                // wait for any storage operation currently in flight to finish so
                // we don't end up with both the committed and the uncommitted copy
                for (let change of this.changeQueue) {
                    if (change.matchLocation(search)) {
                        if (change.dispatched && !change.committed) {
                            try {
                                await change.promise;
                            } catch (err) {
                            }
                        }
                    }
                }
            }

            if (newResults !== search.results) {
                search.finish(newResults);

                // save to cache
                this.updateLocalCache(search);

                if (search.notifying) {
                    this.triggerEvent(new RemoteDataSourceEvent('change', this));
                }
            } else {
                search.finish();
            }
            search.notifying = false;
        } catch (err) {
            search.fail(err);
        }
    }

    async verifyCacheSignature(search) {
        if (!this.active || !this.options.cacheValidation) {
            return;
        }
        let location = search.getLocation();
        let remoteSignature = await this.getRemoteSignature(location);
        if (remoteSignature) {
            if (search.signature !== remoteSignature) {
                search.invalid = true;
                search.signature = remoteSignature;

                let localSignature = await this.getCacheSignature(location);
                if (localSignature !== remoteSignature) {
                    await this.clearLocalCache(search);
                    await this.setCacheSignature(search, remoteSignature);
                }
            }
        }
    }

    /**
     * Load signature of cached schema
     *
     * @param  {Object} location
     *
     * @return {Promise<String>}
     */
    async getCacheSignature(location) {
        let { address, schema } = location;
        let key = `${address}/${schema}`;
        let query = _.assign({}, signatureLocation, { criteria: { key } });
        let results = await this.cache.find(query);
        return _.get(results[0], 'signature', '');
    }

    /**
     * Save signature of cached schema
     *
     * @param  {Object} location
     * @param  {String} signature
     *
     * @return {Promise}
     */
    async setCacheSignature(location, signature) {
        let { address, schema } = location;
        let key = `${address}/${schema}`;
        let entry = { key, signature };
        return this.cache.save(signatureLocation, [ entry ]);
    }

    /**
     * Fetch signature of schema
     *
     * @param  {Object} location
     *
     * @return {Promise<String>}
     */
    async getRemoteSignature(location) {
        let { address, schema } = location;
        let cacheSignature = _.find(this.cacheSignatures, { address, schema });
        if (!cacheSignature) {
            cacheSignature = new CacheSignature(address, schema);
            cacheSignature.promise = this.performRemoteAction(location, 'signature');
            this.cacheSignatures.push(cacheSignature);
        }
        let result = await cacheSignature.promise;
        cacheSignature.signature = _.get(result, 'signature', '');
        return cacheSignature.signature;
    }

    /**
     * Deleted all cached objects originating from given server
     *
     * @param  {Object} location
     *
     * @return {Promise<Number>}
     */
    async clearLocalCache(location) {
        let { address, schema } = location;
        let count = await this.cache.clean({ address, schema });
        return count;
    }

    /**
      * Clear cached schema at given address
      *
      * @param  {Object} session
      *
      * @return {Promise}
      */
    async clearCachedSchemas(session) {
        // remove cached remote signatures
        this.cacheSignatures = _.filter(this.cacheSignatures, (cacheSignature) => {
             return (cacheSignature.address !== session.address);
        });

        // clear the objects first
        let location = { address: session.address, schema: '*' };
        await this.clearLocalCache(location);

        // remove the signatures
        let prefix = `${session.address}/`;
        let rows = await this.cache.find(signatureLocation)
        let matchingRows = _.filter(rows, (row) => {
            return _.startsWith(row.key, prefix);
        });
        await this.cache.remove(location, matchingRows);
    }

    /**
     * Store objects in local schema
     *
     * @param  {Storage|Removal} op
     *
     * @return {Promise>}
     */
    async updateLocalDatabase(op) {
        op.start();
        let location = op.getLocation();
        if (op instanceof Removal) {
            op.promise = this.cache.remove(location, op.objects);
        } else {
            op.promise = this.cache.save(location, op.objects);
        }
        let objects = await op.promise;
        op.finish(objects);
    }

    /**
     * Update objects in local cache with remote copies
     *
     * @param  {Search|Storage|Removal} op
     *
     * @return {Promise<Boolean>}
     */
    async updateLocalCache(op) {
        try {
            let location = op.getLocation();
            if (op instanceof Search) {
                await this.cache.save(location, op.results);
                await this.cache.remove(location, op.missingResults);
            } else if (op instanceof Removal) {
                await this.cache.remove(location, op.results);
            } else if (op instanceof Storage) {
                if (_.get(this.options.discoveryFlags, 'include_deleted')) {
                    await this.cache.save(location, op.results);
                } else {
                    let deleted = _.filter(op.results, { deleted: true });
                    let saved = _.difference(op.results, deleted);
                    await this.cache.save(location, saved);
                    await this.cache.remove(location, deleted);
                }

            }
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    }

    /**
     * Save objects to remote database; results are saved to the storage object
     *
     * @param  {Storage} storage
     *
     * @return {Promise>}
     */
    async updateRemoteDatabase(storage) {
        let change = new Change(storage.getLocation(), storage.objects, storage.options);
        // merge with uncommitted changes already in the queue
        for (let earlierOp of this.changeQueue) {
            if (!earlierOp.committed && !earlierOp.canceled) {
                change.merge(earlierOp);
            }
        }
        if (change.noop()) {
            // deleting new objects that haven't been committed
            storage.finish(storage.objects);
            return;
        }
        change.onDispatch = async (change) => {
            let location = change.location;
            let deliverables = change.deliverables();
            let objects = _.map(deliverables, (object) => {
                // replace temporary IDs with permanent ones (if created)
                if (object.id < 1) {
                    let permanentID = this.findPermanentID(location, object.id);
                    if (permanentID) {
                        object = _.clone(object);
                        object.id = permanentID;
                    } else {
                        object = _.omit(object, 'id', 'uncommitted');
                    }
                } else {
                    if (object.uncommitted !== undefined) {
                        object = _.omit(object, 'uncommitted');
                    }
                }
                return object;
            });
            storage.start();
            let results = await this.performRemoteAction(location, 'storage', { objects });
            this.saveIDMapping(location, deliverables, results);
            return results;
        };
        this.queueChange(change);
        if (this.active) {
            // send it if we've connectivity
            change.dispatch();
        }
        this.triggerEvent(new RemoteDataSourceEvent('change', this));
        try {
            let results = await change.promise;
            if (!change.canceled) {
                storage.finish(results);
            } else {
                storage.cancel();
            }
        } catch (err) {
            // signal that the change was removed
            this.triggerEvent(new RemoteDataSourceEvent('change', this));
            throw err;
        }
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
        for (let search of relevantSearches) {
            let resultsBefore = search.results;
            let resultsAfter = resultsBefore;
            for (let object of op.results) {
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
                    if (object.deleted) {
                        if (!_.get(this.options.discoveryFlags, 'include_deleted')) {
                            match = false;
                        }
                    }
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
            }
            if (resultsAfter !== resultsBefore) {
                search.results = resultsAfter;
                search.promise = Promise.resolve(resultsAfter);
            }
        }
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
     * Perform either a discovery, retrieval, or storage operation at remote
     * server
     *
     * @param  {Object} location
     * @param  {String} action
     * @param  {*} payload
     *
     * @return {Prmise}
     */
    async performRemoteAction(location, action, payload) {
        let session = this.obtainSession(location);
        let { address, schema, table } = location;
        let { basePath } = this.options;
        if (!schema) {
            throw new HTTPError(400, 'No schema specified');
        }
        if (!table) {
            if (action !== 'signature') {
                throw new HTTPError(400, 'No table specified');
            }
        }
        let flags;
        if (action === 'retrieval' || action === 'storage') {
            flags = this.options.retrievalFlags;
        } else if (action === 'discovery') {
            flags = _.omit(this.options.discoveryFlags, 'include_uncommitted');
        }
        let url = `${address}${basePath}/${action}/${schema}/`;
        if (action !== 'signature') {
            url += `${table}/`;
        }
        let req = _.assign({}, payload, flags, { auth_token: session.token });
        let options = { contentType: 'json', responseType: 'json' };
        this.requestCount++;
        this.triggerEvent(new RemoteDataSourceEvent('requeststart', this));
        let result;
        try {
            result = await HTTPRequest.fetch('POST', url, req, options);
        } catch (err) {
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
        } finally {
            this.requestCount--;
            this.triggerEvent(new RemoteDataSourceEvent('requestend', this));
        }
        return result;
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
            if (search.results) {
                return search.matchLocation(location);
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
        for (let list of lists) {
            _.remove(list, (op) => {
                return (op.address === session.address);
            });
        }
    }

    /**
     * Add an entry to the change queue
     *
     * @param  {Change} change
     */
    queueChange(change) {
        // get rid of entries that's no longer needed
        let delay = 1;
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
     * @param  {Search} newSearch
     *
     * @return {Search}
     */
    addSearch(newSearch) {
        // save the search
        this.recentSearchResults.unshift(newSearch);
        while (this.recentSearchResults.length > 1024) {
            this.recentSearchResults.pop();
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
        for (let [ index, localObject ] of _.entries(localObjects)) {
            if (localObject.id < 1) {
                let remoteObject = remoteObjects[index];
                _.remove(list, { permanent: remoteObject.id });
                list.push({
                    temporary: localObject.id,
                    permanent: remoteObject.id,
                });
            }
        }
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
    for (let id of ids) {
        let index = _.sortedIndexBy(objects, { id }, 'id');
        let object = (objects) ? objects[index] : null;
        if (object && object.id === id) {
            objects.splice(index, 1);
        }
    }
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
    if (_.isEmpty(newObjects)) {
        return objects;
    }
    objects = _.slice(objects);
    for (let newObject of newObjects) {
        let index = _.sortedIndexBy(objects, newObject, 'id');
        let object = objects[index];
        if (object && object.id === newObject.id) {
            objects[index] = newObject;
        } else {
            objects.splice(index, 0, newObject);
        }
    }
    return objects;
}

class RemoteDataSourceEvent extends GenericEvent {
}

export {
    RemoteDataSource as default,
    RemoteDataSource,
};
