import _ from 'lodash';
import Moment from 'moment';
import { EventEmitter, GenericEvent } from 'relaks-event-emitter';
import { promiseSelf } from '../utils/promise-self.js';
import { performHTTPRequest } from '../transport/http-request.js';
import { HTTPError } from '../errors.js';
import { matchSearchCriteria, limitSearchResults } from './local-search.js';
import { Search } from './remote-data-source/search.js';
import { Change } from './remote-data-source/change.js';
import { Storage } from './remote-data-source/storage.js';
import { Removal } from './remote-data-source/removal.js';
import { CacheSignature } from './remote-data-source/cache-signature.js';
import { ChangeMonitor } from './remote-data-source/change-monitor.js';
import { delay } from '../utils/delay.js';
import { pullAll, difference, sortedIndexBy } from '../utils/array-utils.js';
import { get, set } from '../utils/object-utils.js';

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

export class RemoteDataSource extends EventEmitter {
  constructor(options) {
    super();
    this.active = false;
    this.options = Object.assign({ ...defaultOptions }, options);
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
    const session = this.obtainSession(location);
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
    const newSearch = new Search(query);
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
    const required = query.required || false;
    const committed = query.committed || false;
    const refreshInterval = this.options.refreshInterval;
    let search = this.recentSearchResults.find(s => s.match(newSearch));
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

    const includeUncommitted = this.options.discoveryFlags.include_uncommitted || false;
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
    if (objects.length === 0) {
      return [];
    }
    const storage = this.addStorage(new Storage(location, objects, options));
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
    const includeDeleted = this.options.discoveryFlags.include_deleted || false;
    if (includeDeleted) {
      return storage.results;
    } else {
      const deleted = storage.results.filter(obj => obj.deleted);
      const saved = difference(storage.results, deleted);
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
    if (objects.length === 0) {
      return [];
    }
    const removal = this.addRemoval(new Removal(location, objects));
    if (removal.local) {
      await this.updateLocalDatabase(removal);
    } else {
      if (process.env.NODE_ENV !== 'production') {
        const includeDeleted = this.options.discoveryFlags.include_deleted || false;
        if (includeDeleted) {
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
      const session = this.obtainSession(location);
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
    const session = this.obtainSession(location);
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
    const session = this.obtainSession(location);
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
    const session = this.obtainSession(location);
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
    const session = this.obtainSession(location);
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
    const mobileSession = this.obtainSession(location, 'mobile');
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
    const mobileSession = this.obtainSession(location, 'mobile');
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
    const { address } = location;
    const url = `${address}/srv/session/`;
    const options = { responseType: 'json', contentType: 'json' };
    const payload = { handle };
    await performHTTPRequest('DELETE', url, payload, options);
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
    const path = [ location.address, location.schema, location.table ];
    const list = get(this.idMappings, path);
    const entry = list.find(e => e.permanent === permanentID);
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
    const path = [ location.address, location.schema, location.table ];
    const list = get(this.idMappings, path);
    const entry = list?.find(e => e.temporary === temporaryID);
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
    const invalidated = [];
    for (let search of this.recentSearchResults) {
      if (!search.dirty) {
        let dirty;
        if (changes) {
          for (let their of changes) {
            if (search.matchLocation(their)) {
              if (search.isMeetingExpectation()) {
                // we have all the possible results
                // see if the changed object is among them
                const index = sortedIndexBy(search.results, { id: their.id }, 'id');
                const object = search.results[index];
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
    if (invalidated.length === 0) {
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
    this.cacheSignatures = this.cacheSignatures.filter((cacheSignature) => {
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
    const relevantSearches = this.getRelevantRecentSearches(location);
    for (let search of relevantSearches) {
      const results = search.results;
      const index = sortedIndexBy(results, object, 'id');
      const target = results[index];
      if (target && target.id === object.id) {
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
    const { address, schema, table } = location;
    const { id } = object;
    const monitor = new ChangeMonitor(address, schema, table, id);
    this.changeMonitors.push(monitor);
    monitor.setTimeout(timeout);
    const result = await monitor.promise;
    pullAll(this.changeMonitors, [ monitor ]);
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
    return changes.filter((their) => {
      // examine changes that have been sent earlier
      const relevantChanges = this.changeQueue.filter((change) => {
        if (change.dispatched && !change.failed) {
          if (change.matchLocation(their)) {
            return true;
          }
        }
      });

      // see if the change notification is about an object that was
      // recently saved or is being saved at this very moment
      return !relevantChanges.some((change) => {
        if (change.committed) {
          return change.received.some((own) => {
            if (own.id === their.id) {
              if (own.gn >= their.gn) {
                // the notification is either due to our own action
                // or is moot since we've overwritten the remote object
                return true;
              }
            }
          });
        } else {
          return change.delivered.some((own) => {
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
      const relevantChanges = changes.filter((their) => {
        return change.matchLocation(their);
      });

      // look for uncommitted objects that were changed remotely
      const affectedObjects = change.objects.filter((own, index) => {
        if (!change.removed[index]) {
          if (!changes) {
            // we're dealing with a reconnection scenario
            // all objects are impacted, unless they're new
            if (own.id >= 1) {
              return true;
            }
          }
          return relevantChanges.some((their) => {
            if (their.id === own.id) {
              return true;
            }
          });
        }
      });
      if (affectedObjects.length === 0) {
        continue;
      }
      // load the (possibly) new objects
      const affectedIDs = affectedObjects.map(obj => obj.id);
      const remoteObjects = await this.retrieveRemoteObjects(change.location, affectedIDs, true);
      for (let own of affectedObjects) {
        const their = remoteObjects.find(obj => obj.id === own.id);
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
              const index = change.objects.indexOf(own);
              change.removed[index] = true;
            }
          }
        }
      }
      if (!change.removed.includes(false)) {
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
    const includeDeleted = this.options.discoveryFlags.include_deleted || false;
    for (let change of this.changeQueue) {
      if (change.matchLocation(search)) {
        if (!change.committed && !change.canceled && !change.error) {
          if (!newSearch) {
            newSearch = { ...search };
            newSearch.results = search.results.slice();
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
    const { address } = location;
    if (!address) {
      throw new HTTPError(400);
    }
    const { area } = this.options;
    if (!type) {
      type = 'primary';
    }
    let session = this.sessions.find(s => s.address === address && s.area === area && s.type === type);
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
    if (this.sessions.includes(session)) {
      pullAll(this.sessions, [ session ]);
      this.triggerEvent(new RemoteDataSourceEvent('change', this));
    }
  }

  async establishSession(session) {
    const { sessionRetryInterval } = this.options;
    for (;;) {
      try {
        const url = `${session.address}/srv/session/`;
        const options = { responseType: 'json', contentType: 'json' };
        const payload = { area: session.area };
        const res = await performHTTPRequest('POST', url, payload, options);
        session.handle = res.session.handle;
        session.info  = { system: res.system, servers: res.servers };
        return session.info;
      } catch (err) {
        console.error(err.message);
        await delay(sessionRetryInterval);
      }
    }
  }

  async confirmAuthorization(session) {
    try {
      await session.establishmentPromise;

      const url = `${session.address}/srv/session/`;
      const options = { responseType: 'json' };
      const payload = {
        handle: session.handle
      };
      const res = await performHTTPRequest('GET', url, payload, options);
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
        const { username, password } = credentials;
        url = `${session.address}/srv/session/htpasswd/`;
        payload = {
          handle: session.handle,
          username,
          password
        };
      }
      const options = { responseType: 'json', contentType: 'json' };
      const res = await performHTTPRequest('POST', url, payload, options);
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
      const url = `${session.address}/srv/session/`;
      const options = { responseType: 'json', contentType: 'json' };
      const payload = {
        handle: session.handle
      };
      await performHTTPRequest('DELETE', url, payload, options);
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
      const parentSession = this.obtainSession(mobileSession);
      if (!parentSession) {
        throw new HTTPError(400);
      }
      await parentSession.establishmentPromise;
      const { area } = this.options;
      const url = `${parentSession.address}/srv/session/`;
      const options = { responseType: 'json', contentType: 'json' };
      const payload = {
        handle: parentSession.handle,
        area,
      };
      const res = await performHTTPRequest('POST', url, payload, options);
      mobileSession.handle = res.session.handle;
      return mobileSession.handle;
    } catch (err) {
      this.discardSession(mobileSession);
      throw err;
    }
  }

  async authorizeMobileSession(session) {
    const url = `${session.address}/srv/session/`;
    const options = { responseType: 'json', contentType: 'json' };
    const payload = { handle: session.handle };
    const res = await performHTTPRequest('GET', url, payload, options);
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
    const now = Moment().toISOString();
    const soon = Moment().add(5, 'minute').toISOString();
    const removing = this.sessions.filter(s => s.etime < now || (s.etime < soon && !s.token));
    if (removing.length > 0) {
      pullAll(this.sessions, removing);
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
    const session = this.obtainSession(location);
    if (!session.handle) {
      return '';
    }
    let query = `sid=${oauthServer.id}&handle=${session.handle}`;
    if (type === 'activation') {
      query += '&activation=1';
    } else if (type === 'test') {
      query += '&test=1';
    }
    const url = `${session.address}/srv/session/${oauthServer.type}/?${query}`;
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
    const session = this.obtainSession(location);
    if (session.token) {
      // user is already authenticated
      return;
    }
    // emit an event so a user-interface for authentication is shown
    const event = new RemoteDataSourceEvent('authentication', this, { location });
    this.triggerEvent(event);
    await event.waitForDecision();
    const shouldWait = !event.defaultPrevented;
    if (!shouldWait) {
      throw new HTTPError(401);
    }
    const success = await this.waitForAuthorization(session);
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
    const session = this.obtainSession(location);
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
      session.authorizationPromise = promiseSelf();
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
    const now = Moment().toISOString();
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
    const session = this.obtainSession(location);
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
      const query = search.getQuery();
      const location = search.getLocation();
      search.results = await this.cache.find(query);
      search.signature = await this.getCacheSignature(location);
    } catch (err) {
    }
  }

  async retrieveFromLocalCache(search, discovery) {
    try {
      const location = search.getLocation();
      const ids = search.getFetchList(discovery.ids);
      if (ids.length > 0) {
        const query = { criteria: { id: ids }, ...location };
        const objects = await this.cache.find(query);
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
            const refreshInterval = this.options.refreshInterval;
            if (search.isSufficientlyRecent(refreshInterval)) {
              return;
            }
          }
        }
      }

      search.start();
      const location = search.getLocation();
      const criteria = search.criteria;
      const discovery = await this.discoverRemoteObjects(location, criteria);
      if (search.remote) {
        await this.retrieveFromLocalCache(search, discovery);
        await this.verifyCacheSignature(search);
      }
      // use the list of ids and gns (generation number) to determine
      // which objects have changed and which have gone missing
      const idsUpdated = search.getUpdateList(discovery.ids, discovery.gns);
      const idsRemoved = search.getRemovalList(discovery.ids);

      let newResults = search.results;
      if (idsRemoved.length > 0) {
        newResults = removeObjects(newResults, idsRemoved);
      }
      if (idsUpdated.length > 0) {
        // retrieve the updated (or new) objects from server
        const newObjects = await this.retrieveRemoteObjects(location, idsUpdated);
        // then add them to the list
        newResults = insertObjects(newResults, newObjects);
      }
      if (newResults === undefined) {
        newResults = [];
      }

      const includeUncommitted = this.options.discoveryFlags.include_uncommitted || false;
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
    const location = search.getLocation();
    const remoteSignature = await this.getRemoteSignature(location);
    if (remoteSignature) {
      if (search.signature !== remoteSignature) {
        search.invalid = true;
        search.signature = remoteSignature;

        const localSignature = await this.getCacheSignature(location);
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
    const { address, schema } = location;
    const key = `${address}/${schema}`;
    const query = { ...signatureLocation, criteria: { key } };
    const results = await this.cache.find(query);
    return results[0]?.signature || '';
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
    const { address, schema } = location;
    const key = `${address}/${schema}`;
    const entry = { key, signature };
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
    const { address, schema } = location;
    let cacheSignature = this.cacheSignatures.find(s => s.address === address && s.schema === schema);
    if (!cacheSignature) {
      cacheSignature = new CacheSignature(address, schema);
      cacheSignature.promise = this.performRemoteAction(location, 'signature');
      this.cacheSignatures.push(cacheSignature);
    }
    const result = await cacheSignature.promise;
    cacheSignature.signature = result?.signature;
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
    const { address, schema } = location;
    const count = await this.cache.clean({ address, schema });
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
    this.cacheSignatures = this.cacheSignatures.filter((cacheSignature) => {
       return (cacheSignature.address !== session.address);
    });

    // clear the objects first
    const location = { address: session.address, schema: '*' };
    await this.clearLocalCache(location);

    // remove the signatures
    const prefix = `${session.address}/`;
    const rows = await this.cache.find(signatureLocation)
    const matchingRows = rows.filter(r => r.key.startsWith(prefix));
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
    const location = op.getLocation();
    if (op instanceof Removal) {
      op.promise = this.cache.remove(location, op.objects);
    } else {
      op.promise = this.cache.save(location, op.objects);
    }
    const objects = await op.promise;
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
      const location = op.getLocation();
      if (op instanceof Search) {
        await this.cache.save(location, op.results);
        await this.cache.remove(location, op.missingResults);
      } else if (op instanceof Removal) {
        await this.cache.remove(location, op.results);
      } else if (op instanceof Storage) {
        const includeDeleted = this.options.discoveryFlags.include_deleted || false;
        if (includeDeleted) {
          await this.cache.save(location, op.results);
        } else {
          const deleted = op.results.filter(obj => obj.deleted);
          const saved = difference(op.results, deleted);
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
    const change = new Change(storage.getLocation(), storage.objects, storage.options);
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
      const location = change.location;
      const deliverables = change.deliverables();
      const objects = deliverables.map((object) => {
        // replace temporary IDs with permanent ones (if created)
        if (object.id < 1) {
          let permanentID = this.findPermanentID(location, object.id);
          if (permanentID) {
            object = { ...object, id: permanentID };
          } else {
            const { id: tempID, uncommitted, ...objProps } = object;
            object = objProps;
          }
        } else {
          if (object.uncommitted !== undefined) {
            const { uncommitted, ...objProps } = object;
            object = objProps;
          }
        }
        return object;
      });
      storage.start();
      const results = await this.performRemoteAction(location, 'storage', { objects });
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
      const results = await change.promise;
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
    const relevantSearches = this.getRelevantRecentSearches(op.getLocation());
    for (let search of relevantSearches) {
      const resultsBefore = search.results;
      let resultsAfter = resultsBefore;
      for (let object of op.results) {
        const index = sortedIndexBy(resultsAfter, object, 'id');
        const target = resultsAfter[index];
        const present = (target && target.id === object.id);
        // note: Removal is a subclass of Storage
        if (op instanceof Removal) {
          if (present) {
            if (resultsAfter === resultsBefore) {
              resultsAfter = resultsAfter.slice();
            }
            resultsAfter.splice(index, 1);
          }
        } else if (op instanceof Storage) {
          let match = matchSearchCriteria(search.table, object, search.criteria);
          if (object.deleted) {
            const includeDeleted = this.options.discoveryFlags || false;
            if (!includeDeleted) {
              match = false;
            }
          }
          if (match || present) {
            if (resultsAfter === resultsBefore) {
              // create new array so memoized functions won't return old results
              resultsAfter = resultsAfter.slice();
            }
            if (match && present) {
              // update the object with new one
              resultsAfter[index] = object;
            } else if (match && !present) {
              // insert a new object
              resultsAfter.splice(index, 0, object);
              limitSearchResults(search.table, resultsAfter, search.criteria)
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
    const session = this.obtainSession(location);
    const { address, schema, table } = location;
    const { basePath } = this.options;
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
      const { include_uncommitted: ignore, ...serverSideFlags } = this.options.discoveryFlags;
      flags = serverSideFlags;
    }
    let url = `${address}${basePath}/${action}/${schema}/`;
    if (action !== 'signature') {
      url += `${table}/`;
    }
    const req = { ...payload, ...flags, auth_token: session.token };
    const options = { contentType: 'json', responseType: 'json' };
    this.requestCount++;
    this.triggerEvent(new RemoteDataSourceEvent('requeststart', this));
    let result;
    try {
      result = await performHTTPRequest('POST', url, req, options);
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(err.stack);
        console.log(url, req);
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
    return this.recentSearchResults.filter((search) => {
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
    const lists = [
      this.recentSearchResults,
      this.recentStorageResults,
      this.recentRemovalResults
    ];
    for (let list of lists) {
      const removing = list.filter(op => op.address === session.address);
      pullAll(list, removing);
    }
  }

  /**
   * Add an entry to the change queue
   *
   * @param  {Change} change
   */
  queueChange(change) {
    // get rid of entries that's no longer needed
    const delay = 1;
    const someTimeAgo = Moment().subtract(delay, 'minute').toISOString();
    const removing = this.changeQueue.filter((oldChange) => {
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
    pullAll(this.changeQueue, removing);
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
    const removing = this.recentStorageResults.filter((op, index) => {
      return op.canceled || index >= 32;
    });
    pullAll(this.recentStorageResults, removing);
    this.recentStorageResults.unshift(newStorage);
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
    const removing = this.recentRemovalResults.filter((op, index) => {
      return op.canceled || index >= 32;
    });
    pullAll(this.recentRemovalResults, removing);
    this.recentRemovalResults.unshift(newRemoval);
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
    let list = get(this.idMappings, path);
    if (!list) {
      list = [];
      set(this.idMappings, path, list);
    }
    for (let [ index, localObject ] of Object.entries(localObjects)) {
      if (localObject.id < 1) {
        const remoteObject = remoteObjects[index];
        const removing = list.filter(e => e.permanent === remoteObject.id);
        pullAll(list, removing);
        list.push({ temporary: localObject.id, permanent: remoteObject.id });
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
  if (ids.length === 0) {
    return objects;
  }
  objects = objects.slice();
  for (let id of ids) {
    const index = sortedIndexBy(objects, { id }, 'id');
    const object = (objects) ? objects[index] : null;
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
  if (newObjects.length === 0) {
    return objects;
  }
  objects = objects.slice();
  for (let newObject of newObjects) {
    const index = sortedIndexBy(objects, newObject, 'id');
    const object = objects[index];
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
