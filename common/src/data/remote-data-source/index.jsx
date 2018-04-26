var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Moment = require('moment');

var HTTPRequest = require('transport/http-request');
var HTTPError = require('errors/http-error');
var LocalSearch = require('data/local-search');
var Search = require('data/remote-data-source/search');
var Change = require('data/remote-data-source/change');
var Storage = require('data/remote-data-source/storage');
var Removal = require('data/remote-data-source/removal');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var Diagnostics = require('widgets/diagnostics');
var DiagnosticsSection = require('widgets/diagnostics-section');
var RecentSearchTable = require('data/remote-data-source/recent-search-table');
var RecentStorageTable = require('data/remote-data-source/recent-storage-table');

module.exports = React.createClass({
    displayName: 'RemoteDataSource',
    mixins: [ UpdateCheck ],
    propTypes: {
        basePath: PropTypes.string,
        discoveryFlags: PropTypes.object,
        retrievalFlags: PropTypes.object,
        online: PropTypes.bool,
        connected: PropTypes.bool,
        inForeground: PropTypes.bool,
        prefetching: PropTypes.bool,
        cache: PropTypes.object,
        refreshInterval: PropTypes.number,
        sessionRetryInterval: PropTypes.number,

        onChange: PropTypes.func,
        onSearch: PropTypes.func,
        onAuthorization: PropTypes.func,
        onExpiration: PropTypes.func,
        onViolation: PropTypes.func,
        onStupefaction: PropTypes.func,
    },

    /**
     * Return default props
     *
     * @return {Object}
     */
    getDefaultProps: function() {
        return {
            basePath: '/srv/data',
            discoveryFlags: {},
            retrievalFlags: {},
            online: true,
            connected: false,
            inForeground: true,
            prefetching: true,
            refreshInterval: 15 * 60,   // 15 minutes
            sessionRetryInterval: 5000,
        };
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        this.searching = false;
        this.idMappings = {};
        this.cacheValidation = {};
        this.cacheClearing = {};
        this.changeMonitors = [];
        var lists = {
            recentSearchResults: [],
            recentStorageResults: [],
            recentRemovalResults: [],
            changeQueue: [],
        };
        _.assign(this, lists);
        return lists;
    },

    /**
     * Update an instance variable that's mirrored in the state
     *
     * @param  {String} name
     * @param  {Function} f
     */
    updateList: function(name, f) {
        var prevList = this[name];
        var nextList = f(prevList);
        this[name] = nextList;
        var state = {};
        state[name] = nextList;
        this.setState(state);
    },

    /**
     * Return true if there's internet connection
     *
     * @return {Boolean}
     */
    isOnline: function() {
        return this.props.online;
    },

    /**
     * Return true if we can receive change notifications
     *
     * @return {Boolean}
     */
    isReceivingNotification: function() {
        return this.props.connected;
    },

    /**
     * Create a login session and retrieve information about the remote server,
     * including a list of OAuth providers
     *
     * @param  {Object} location
     * @param  {String} area
     *
     * @return {Promise<Object>}
     */
    beginSession: function(location, area) {
        var address = location.address;
        var session = getSession(address);
        if (!session.promise) {
            var url = `${address}/srv/session/`;
            var options = { responseType: 'json', contentType: 'json' };
            session.promise = HTTPRequest.fetch('POST', url, { area }, options).then((res) => {
                _.assign(session, res.session);
                if (session.handle) {
                    // return login information to caller
                    return {
                        system: res.system,
                        servers: res.servers,
                    };
                } else {
                    throw new HTTPError(session.error);
                }
            }).catch((err) => {
                // clear the promise if it fails
                session.promise = null;
                // trigger a change event after a delay, which should cause the
                // caller to try again
                setTimeout(this.triggerChangeEvent, this.props.sessionRetryInterval);
                throw err;
            });
        }
        return session.promise;
    },

    /**
     * Query server to see if authorization has been granted and if so,
     * trigger the onAuthorization event
     *
     * @param  {Object} location
     *
     * @return {Promise<Boolean>}
     */
    checkSession: function(location) {
        var address = location.address;
        var session = getSession(address);
        var handle = session.handle;
        if (!handle) {
            return Promise.resolve(false);
        }
        var url = `${address}/srv/session/`;
        var options = { responseType: 'json' };
        return HTTPRequest.fetch('GET', url, { handle }, options).then((res) => {
            if (res && res.session) {
                _.assign(session, res.session);
            }
            if (session.token) {
                this.triggerAuthorizationEvent(session);
                return true;
            } else if (!session.error) {
                return false;
            } else {
                throw new HTTPError(session.error);
            }
        }).catch((err) => {
            // clear the promise if the session is no longer valid
            session.promise = null;
            this.triggerChangeEvent();
            throw err;
        });
    },

    /**
     * Authenticate user through username and password
     *
     * @param  {Object} location
     * @param  {String} username
     * @param  {String} password
     *
     * @return {Promise}
     */
    submitPassword: function(location, username, password) {
        var address = location.address;
        var session = getSession(address);
        var handle = session.handle;
        if (!handle) {
            return Promise.resolve(false);
        }
        var url = `${address}/srv/session/htpasswd/`;
        var payload = { handle, username, password };
        var options = { responseType: 'json', contentType: 'json' };
        return HTTPRequest.fetch('POST', url, payload, options).then((res) => {
            _.assign(session, res.session);
            this.triggerAuthorizationEvent(session);
            return null;
        }).catch((err) => {
            if (err.statusCode !== 401) {
                // clear the promise if the session is no longer valid
                session.promise = null;
                this.triggerChangeEvent();
            }
            throw err;
        });
    },

    /**
     * Remove authorization
     *
     * @param  {Object} location
     *
     * @return {Promise}
     */
    endSession: function(location) {
        var address = location.address;
        var session = getSession(address);
        var handle = session.handle;
        if (!handle) {
            return Promise.resolve(null);
        }
        return Promise.resolve(session.promise).then(() => {
            var url = `${address}/srv/session/`;
            var options = { responseType: 'json', contentType: 'json' };
            return HTTPRequest.fetch('DELETE', url, { handle }, options).catch((err) => {
                // clean cached information anyway, given when we failed to
                // remove the session in the backend
                console.error(err);
            }).then(() => {
                destroySession(session);
                this.clearRecentOperations(address);
                this.clearCachedSchemas(address);
                this.triggerExpirationEvent(session);
                return null;
            });
        });
    },

    /**
     * Start the device activation process (on browser side)
     *
     * @param  {Object} location
     * @param  {String} area
     *
     * @return {Promise<String>}
     */
    beginMobileSession: function(location, area) {
        var address = location.address;
        var session = getSession(address, 'mobile');
        if (!session.promise) {
            var parentSession = getSession(address);
            var handle = parentSession.handle;
            var url = `${address}/srv/session/`;
            var options = { responseType: 'json', contentType: 'json' };
            session.promise = HTTPRequest.fetch('POST', url, { area, handle }, options).then((res) => {
                _.assign(session, res.session);
                if (session.handle) {
                    return session.handle;
                } else {
                    throw HTTPError(session.error);
                }
            }).catch((err) => {
                session.promise = null;
                throw err;
            });
        }
        return session.promise;
    },

    /**
     * Acquired a session created earlier through a web-browser (on mobile device)
     *
     * @param  {Object} location
     * @param  {String} handle
     *
     * @return {Promise<Number>}
     */
    acquireMobileSession: function(location, handle) {
        var address = location.address;
        var session = getSession(address);
        if (session.handle !== handle) {
            session.promise = null;
            session.handle = handle;
        }
        if (!session.promise) {
            var url = `${address}/srv/session/`;
            var options = { responseType: 'json', contentType: 'json' };
            session.promise = HTTPRequest.fetch('GET', url, { handle }, options).then((res) => {
                _.assign(session, res.session);
                if (session.token) {
                    this.triggerAuthorizationEvent(session);
                    return session.user_id;
                } else {
                    throw new HTTPError(session.error);
                }
            }).catch((err) => {
                setTimeout(() => {
                    session.promise = null;
                    session.handle = null;
                }, 5000);
                throw err;
            });
        }
        return session.promise;
    },

    /**
     * End the activation process, so another device can be activated (on browser side)
     *
     * @param  {Object} location
     *
     * @return {Promise}
     */
    releaseMobileSession: function(location) {
        // just clear the promise--let unused authentication object expire on its own
        var address = location.address;
        var session = getSession(address, 'mobile');
        if (session.promise) {
            return session.promise.then(() => {
                destroySession(session);
            });
        } else {
            return Promise.resolve();
        }
    },

    /**
     * Remove authorization
     *
     * @param  {Object} location
     * @param  {String} handle
     *
     * @return {Promise}
     */
    endMobileSession: function(location, handle) {
        var address = location.address;
        var url = `${address}/srv/session/`;
        var options = { responseType: 'json', contentType: 'json' };
        return HTTPRequest.fetch('DELETE', url, { handle }, options).then(() => {
            return null;
        });
    },

    /**
     * Return an URL for granting OAuth access to the backend
     *
     * @param  {Object} location
     * @param  {Object} oauthServer
     * @param  {String} type
     *
     * @return {String}
     */
    getOAuthURL: function(location, oauthServer, type) {
        var address = location.address;
        var session = getSession(address);
        var handle = session.handle;
        if (!handle) {
            return '';
        }
        var query = `sid=${oauthServer.id}&handle=${handle}`;
        if (type === 'activation') {
            query += '&activation=1';
        } else if (type === 'test') {
            query += '&test=1';
        }
        var url = `${address}/srv/session/${oauthServer.type}/?${query}`;
        return url;
    },

    /**
     * Return true if the current user has access to the specified server
     *
     * @param  {Object} location
     *
     * @return {Boolean}
     */
    hasAuthorization: function(location) {
        var address = location.address;
        var session = getSession(address);
        if (session.token) {
            return true;
        } else {
            return false;
        }
    },

    /**
     * Restore session info that was retrieved earlier
     *
     * @param  {Object} session
     */
    restoreSession: function(session) {
        // only if the session hasn't expired
        if (Moment(session.etime) > Moment()) {
            // don't restore broken session
            if (session.handle && session.token) {
                var existing = getSession(session.address);
                _.assign(existing, session);
            }
        }
    },

    /**
     * Begin data access at given location, returning the user id
     *
     * @param  {Object} location
     *
     * @return {Promise<Number>}
     */
    start: function(location) {
        // Promise.resolve() ensures that the callback won't get called
        // within render(), where an exception can cause a cascade of other failures
        return Promise.resolve().then(() => {
            if (location.schema === 'local') {
                return 0;
            }
            var address = location.address;
            var session = getSession(address);
            if (session.token) {
                return session.user_id;
            } else {
                throw new HTTPError(401);
            }
        });
    },

    /**
     * Look for objects matching given query, which includes location info
     *
     * @param  {Object} query
     *
     * @return {Promise<Array<Object>>}
     */
    find: function(query) {
        var newSearch = new Search(query);
        if (newSearch.isLocal()) {
            return this.searchLocalCache(newSearch).then(() => {
                return newSearch.results;
            });
        } else {
            var byComponent = _.get(query, 'by.constructor.displayName');
            var required = query.required;
            var committed = query.committed;
            var blocking;
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
            var search;
            var existingSearch = this.findExistingSearch(newSearch);
            if (existingSearch) {
                if (byComponent) {
                    // add the component to the "by" array so we can figure out
                    // who requested the data
                    if (!_.includes(existingSearch.by, byComponent)) {
                        existingSearch.by.push(byComponent);
                    }
                }
                if (existingSearch.promise.isFulfilled()) {
                    if (!existingSearch.isFresh()) {
                        // search is perhaps out-of-date--indicate that the data
                        // is speculative and check with the server
                        this.searchRemoteDatabase(existingSearch).then((changed) => {
                            if (changed) {
                                // data returned earlier wasn't entirely correct
                                // trigger a new search through a onChange event
                                this.triggerChangeEvent();
                                return null;
                            }
                        });
                    }
                } else if (existingSearch.promise.isRejected()) {
                    // search didn't succeed--try again
                    existingSearch.promise = this.searchRemoteDatabase(existingSearch).then((changed) => {
                        if (changed) {
                            this.triggerChangeEvent();
                            return null;
                        }
                        return existingSearch.results;
                    });
                }
                search = existingSearch;
            } else {
                newSearch = this.addSearch(newSearch);

                // look for records in cache first
                newSearch.promise = this.searchLocalCache(newSearch).then(() => {
                    // see what's the status is after scanning the local cache
                    var status;
                    if (newSearch.isMeetingExpectation()) {
                        // local search yield the expected number of objects
                        if (newSearch.isSufficientlyRecent(this.props.refreshInterval)) {
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
                    var remoteSearchPromise = this.searchRemoteDatabase(newSearch).then((changed) => {
                        if (changed) {
                            this.triggerChangeEvent();
                        };
                        return null;
                    });
                    var waitForRemoteSearch = true;

                    // see if we should wait for the remote search to complete
                    // that depends on what we have from the cache
                    //
                    // generally, if the result set is complete but stale, we
                    // don't block
                    if (status === 'stale') {
                        if (blocking !== 'stale') {
                            waitForRemoteSearch = false;
                        }
                    } else if (status === 'incomplete') {
                        if (blocking !== 'stale' && blocking !== 'incomplete') {
                            waitForRemoteSearch = false;
                        }
                    } else if (status === 'insufficient') {
                        if (blocking !== 'stale' && blocking !== 'incomplete' && blocking !== 'insufficient') {
                            waitForRemoteSearch = false;
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

                    return remoteSearchPromise.then((changed) => {
                        if (required) {
                            if (!newSearch.isMeetingExpectation()) {
                                this.triggerStupefactionEvent(query, newSearch.results);
                                throw new HTTPError(404);
                            }
                        }
                        return newSearch.results;
                    });
                });
                search = newSearch;
            }
            return search.promise.then((results) => {
                var includeUncommitted = _.get(this.props.discoveryFlags, 'include_uncommitted');
                if (includeUncommitted && committed !== true) {
                    // apply changes that haven't been saved yet
                    search = this.applyUncommittedChanges(search);
                }
                return search.results;
            });
        }
    },

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
    save: function(location, objects, options) {
        var storage = this.addStorage(new Storage(location, objects, options));
        if (storage.isLocal()) {
            return this.updateLocalDatabase(storage).then(() => {
                this.triggerChangeEvent();
                return storage.results;
            });
        } else {
            return this.updateRemoteDatabase(storage).then(() => {
                if (storage.cancelled) {
                    return [];
                }
                this.updateLocalCache(storage);
                this.updateRecentSearchResults(storage);
                this.triggerChangeEvent();
                return storage.results;
            });
        }
    },

    /**
     * Remove objects at given location
     *
     * @param  {Object} location
     * @param  {Array<Object>} objects
     *
     * @return {Promise<Array<Object>>}
     */
    remove: function(location, objects) {
        var removal = this.addRemoval(new Removal(location, objects));
        if (removal.isLocal()) {
            return this.updateLocalDatabase(removal).then(() => {
                this.triggerChangeEvent();
                return removal.results;
            });
        } else {
            if (process.env.NODE_ENV !== 'production') {
                if (_.get(this.props.discoveryFlags, 'include_deleted')) {
                    console.warn('remove() should not be used when deleted objects are not automatically filtered out');
                }
            }
            return this.updateRemoteDatabase(removal).then(() => {
                this.updateLocalCache(removal);
                this.updateRecentSearchResults(removal);
                this.triggerChangeEvent();
                return removal.results;
            });
        }
    },

    /**
     * Wait for an object to change
     *
     * @param  {Object} location
     * @param  {Object} object
     * @param  {Number} timeout
     *
     * @return {Promise<Boolean>}
     */
    await: function(location, object, timeout) {
        var monitor = {
            location: _.pick(location, 'address', 'schema', 'table'),
            id: object.id,
            promise: null,
            resolve: null,
        };
        var promise = new Promise((resolve) => {
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
    },

    /**
     * Override cache mechansim and ensure that the remote searches are
     * perform on given object
     *
     * @param  {Object} location
     * @param  {Object} object
     *
     * @return {Promise<Boolean>}
     */
    refresh: function(location, object) {
        var relevantSearches = this.getRelevantRecentSearches(location);
        _.each(relevantSearches, (search) => {
            var results = search.results;
            var dirty = false;
            var index = _.sortedIndexBy(results, object, 'id');
            var target = results[index];
            if (target && target.id === object.id) {
                dirty = true;
            }
            if (dirty) {
                search.dirty = true;
            }
        });
    },

    /**
     * Indicate that we're not longer using data from specific location
     *
     * @param  {String} address
     * @param  {String|undefined} schema
     */
    abandon: function(address, schema) {
        this.updateList('recentSearchResults', (before) => {
            var after = _.slice(before);
            _.each(after, (search) => {
                if (!search.isLocal()) {
                    if (search.address === address) {
                        if (!schema || search.schema === schema) {
                            search.dirty = true;
                        }
                    }
                }
            });
            return after;
        });
        if (this.props.cache) {
            this.props.cache.reset(address, schema);
        }
    },

    /**
     * Invalidate queries based on changes
     *
     * @param  {String} address
     * @param  {Object|undefined} changes
     *
     * @return {Promise}
     */
    invalidate: function(address, changes) {
        return this.reconcileChanges(address, changes).then(() => {
            var changed = false;
            if (changes) {
                _.forIn(changes, (changedObjects, name) => {
                    var parts = _.split(name, '.');
                    var location = {
                        address: address,
                        schema: parts[0],
                        table: parts[1]
                    };
                    this.triggerChangeMonitors(location, changedObjects.ids);
                    var ids = _.filter(changedObjects.ids, (id, index) => {
                        var gn = changedObjects.gns[index];
                        if (this.isBeingSaved(location, id)) {
                            // change notification has arrived even before the
                            // save request has finished
                            return false;
                        } else if (this.isRecentlySaved(location, id, gn)) {
                            // change notification arrived shortly after save
                            // operation finishes
                            return false;
                        } else {
                            // change caused by someone else (or backend)
                            return true;
                        }
                    });
                    if (_.isEmpty(ids)) {
                        return;
                    }
                    var relevantSearches = this.getRelevantRecentSearches(location);
                    _.each(relevantSearches, (search) => {
                        var dirty = false;
                        if (search.isMeetingExpectation()) {
                            // see if the ids show up in the results
                            _.each(ids, (id) => {
                                var index = _.sortedIndexBy(search.results, { id }, 'id');
                                var object = search.results[index];
                                if (object && object.id === id) {
                                    dirty = true;
                                    return false;
                                }
                            });
                        } else {
                            // we can't tell if new objects won't suddenly show up
                            // in the search results
                            dirty = true;
                        }
                        if (dirty) {
                            search.dirty = true;
                            changed = true;
                        }
                    });
                });
            } else {
                // invalidate all results originating from address
                this.updateList('recentSearchResults', (before) => {
                    var after = _.slice(before);
                    _.each(after, (search) => {
                        if (!search.isLocal()) {
                            if (!address || search.address === address) {
                                search.dirty = true;
                                changed = true;
                            }
                        }
                    });
                    return after;
                });
            }
            if (changed) {
                if (this.props.online && this.props.connected) {
                    // tell data consuming components to rerun their queries
                    // initially, they'd all get the data they had before
                    // another change event will occur if new objects are
                    // actually retrieved from the remote server
                    this.triggerChangeEvent();
                }

                if (this.props.inForeground && this.props.online && this.props.connected) {
                    // update recent searches that aren't being used currently
                    if (this.props.prefetching) {
                        this.schedulePrefetch(address);
                    }
                }
            }
            return changed;
        });
    },

    /**
     * Trigger promise created by await()
     *
     * @param  {Object} location
     * @param  {Array<Number>} ids
     */
    triggerChangeMonitors: function(location, ids) {
        _.each(this.changeMonitors, (monitor) => {
            if (_.isEqual(location, monitor.location)) {
                if (_.includes(ids, monitor.id)) {
                    monitor.resolve();
                }
            }
        });
    },

    /**
     * Return true if an object with given id is currently being saved
     *
     * @param  {Object} location
     * @param  {Number} id
     *
     * @return {Boolean}
     */
    isBeingSaved: function(location, id) {
        return _.some(this.state.changeQueue, (change) => {
            if (change.dispatched) {
                if (change.matchLocation(location)) {
                    if (_.some(change.objects, { id })) {
                        return true;
                    }
                }
            }
        });
    },

    /**
     * Return true if an object with given id was saved recently
     *
     * @param  {Object} location
     * @param  {Number} id
     * @param  {Number} gn
     *
     * @return {Boolean}
     */
    isRecentlySaved: function(location, id, gn) {
        return _.some(this.recentStorageResults, (storage) => {
            if (storage.matchLocation(location)) {
                if (_.some(storage.results, { id, gn })) {
                    return true;
                }
            }
        });
    },

    /**
     * Adjust items in change queue to reflect data on server
     *
     * @param  {String|undefined} address
     * @param  {Object|undefined} changes
     *
     * @return {Promise}
     */
    reconcileChanges: function(address, changes) {
        return Promise.each(this.state.changeQueue, (change) => {
            if (change.onConflict === false) {
                // don't need to reconcile object removal
                // we still want it deleted even if it has changed
                return;
            }

            var affectedIds;
            if (!changes) {
                if (!address || change.location.address === address) {
                    // all the changed objects are affected (unless they're new)
                    affectedIds = _.filter(_.map(change.objects, 'id'), (id) => {
                        return (id >= 1);
                    });
                }
            } else {
                if (change.location.address === address) {
                    if (!change.dispatched) {
                        var name = `${change.location.schema}.${change.location.table}`;
                        var changedObjects = changes[name];
                        if (changedObjects) {
                            // look for changed objects that were changed remotely
                            affectedIds = _.filter(changedObjects.ids, (id, index) => {
                                var index = _.findIndex(change.objects, { id });
                                if (index !== -1) {
                                    if (!change.removed[index]) {
                                        return true;
                                    }
                                }
                            });
                        }
                    }
                }
            }
            if (_.isEmpty(affectedIds)) {
                return null;
            }
            if (!change.onConflict) {
                // can't deconflict--remove the affect objects from change queue
                for (var i = 0; i < change.removed.length; i++) {
                    change.removed[i] = true;
                }
                change.cancel();
                return null;
            }
            // load the (possibly) new objects
            return this.retrieveRemoteObjects(change.location, affectedIds, true).then((remoteObjects) => {
                _.each(affectedIds, (id) => {
                    var local = _.find(change.objects, { id });
                    var remote = _.find(remoteObjects, { id });
                    var preserve = false;
                    change.onConflict({
                        type: 'conflict',
                        target: this,
                        local,
                        remote,
                        preventDefault: () => { preserve = true }
                    });
                    if (!preserve) {
                        var index = _.indexOf(change.objects, local);
                        change.removed[index] = true;
                    }
                });
                if (_.every(change.removed)) {
                    change.cancel();
                }
                return null;
            });
        });
    },

    /**
     * Inform parent component that database queries could yield new results
     */
    triggerChangeEvent: function() {
        if (this.props.onChange) {
            this.props.onChange({
                type: 'change',
                target: this,
            });
        }
    },

    /**
     * Trigger the onAuthorization handler so user credentials can be saved
     *
     * @param  {Object} session
     */
    triggerAuthorizationEvent: function(session) {
        if (this.props.onAuthorization) {
            this.props.onAuthorization({
                type: 'authorization',
                target: this,
                session,
            });
        }
    },

    /**
     * Inform parent component that a session is no longer valid
     *
     * @param  {Object} session
     */
    triggerExpirationEvent: function(session) {
        if (this.props.onExpiration) {
            this.props.onExpiration({
                type: 'expiration',
                target: this,
                session,
            });
        }
    },

    /**
     * Inform parent component that an access violation has occurred
     *
     * @param  {String} address
     * @param  {String} schema
     */
    triggerViolationEvent: function(address, schema) {
        if (this.props.onViolation) {
            this.props.onViolation({
                type: 'violation',
                target: this,
                address,
                schema,
            });
        }
    },

    /**
     * Inform parent component that query has yield fewer objects than expected
     *
     * @param  {Object} query
     * @param  {Array<Object>} results
     */
    triggerStupefactionEvent: function(query, results) {
        if (this.props.onStupefaction) {
            this.props.onStupefaction({
                type: 'stupefaction',
                target: this,
                query,
                results,
            });
        }
    },

    /**
     * Inform parent component about active searches
     *
     * @param  {Boolean} searching
     */
    triggerSearchEvent: function(searching) {
        if (this.props.onSearch) {
            this.props.onSearch({
                type: 'search',
                target: this,
                searching
            });
        }
    },

    /**
     * Look for a recent search that has the same criteria
     *
     * @param  {Search} newSearch
     *
     * @return {Search|null}
     */
    findExistingSearch: function(newSearch) {
        var index = _.findIndex(this.recentSearchResults, (existingSearch) => {
            return newSearch.match(existingSearch);
        });
        if (index !== -1) {
            // move the matching search to the top
            var existingSearch = this.recentSearchResults[index];
            existingSearch.prefetching = true;
            this.updateList('recentSearchResults', (before) => {
                var after = _.slice(before);
                after.splice(index, 1);
                after.unshift(existingSearch);
                return after;
            });
            return existingSearch;
        } else {
            return null;
        }
    },

    /**
     * @param  {Search} newSearch
     *
     * @return {Search}
     */
    addSearch: function(newSearch) {
        // save the search
        this.updateList('recentSearchResults', (before) => {
            var after = _.slice(before);
            after.unshift(newSearch);
            while (after.length > 1024) {
                after.pop();
            }
            return after;
        });
        return newSearch;
    },

    /**
     * Add storage to list
     *
     * @param  {Storage} newStorage
     *
     * @return {Storage}
     */
    addStorage: function(newStorage) {
        this.updateList('recentStorageResults', (before) => {
            var after = _.slice(before);
            after.unshift(newStorage);
            _.remove(after, { canceled: true });
            while (after.length > 32) {
                after.pop();
            }
            return after;
        });
        return newStorage;
    },

    /**
     * Add removal operation to list
     *
     * @param  {Removal} newRemoval
     *
     * @return {Removal}
     */
    addRemoval: function(newRemoval) {
        this.updateList('recentRemovalResults', (before) => {
            var after = _.clone(before);
            after.unshift(newRemoval);
            while (after.length > 32) {
                after.pop();
            }
            return after;
        });
        return newRemoval;
    },

    /**
     * Perform a search on the server sude
     *
     * @param  {Search} search
     * @param  {Boolean} background
     *
     * @return {Promise<Boolean>}
     */
    searchRemoteDatabase: function(search, background) {
        if (search.isLocal()) {
            return Promise.resolve(false);
        }
        if (!this.props.online) {
            // don't search remotely when there's no connection
            return Promise.resolve(false);
        }

        var wasUpdating = search.updating;
        search.updating = true;
        if (!this.searching) {
            if (!background) {
                this.searching = true;
                this.triggerSearchEvent(true);
            }
        }
        if (wasUpdating) {
            return Promise.resolve(false);
        }
        var location = search.getLocation();
        var criteria = search.criteria;
        search.start();
        return this.discoverRemoteObjects(location, criteria).then((discovery) => {
            return this.searchLocalCache(search, discovery).return(discovery);
        }).then((discovery) => {
            // use the list of ids and gns (generation number) to determine
            // which objects have changed and which have gone missing
            var ids = discovery.ids;
            var gns = discovery.gns;
            var idsUpdated = getUpdateList(ids, gns, search.results);
            var idsRemoved = getRemovalList(ids, gns, search.results);
            if (!_.isEmpty(idsUpdated)) {
                // retrieve the updated (or new) objects from server
                return this.retrieveRemoteObjects(location, idsUpdated, background).then((retrieval) => {
                    // then add them to the list and remove missing ones
                    var newObjects = retrieval;
                    var newResults = insertObjects(search.results, newObjects);
                    newResults = removeObjects(newResults, idsRemoved);

                    // wait for any storage operation currently in flight to finish so
                    // we don't end up with both the committed and the uncommitted copy
                    var includeUncommitted = _.get(this.props.discoveryFlags, 'include_uncommitted');
                    if (includeUncommitted) {
                        var relatedChanges = _.filter(this.changeQueue, (change) => {
                            if (change.dispatched && !change.committed) {
                                if (change.matchLocation(location)) {
                                    return true;
                                }
                            }
                        });
                        if (!_.isEmpty(relatedChanges)) {
                            var promises = _.map(relatedChanges, 'promise');
                            return Promise.all(promises).reflect().then(() => {
                                return newResults;
                            });
                        }
                    }
                    return newResults;
                });
            } else if (!_.isEmpty(idsRemoved)) {
                // update the result set by removing objects
                var newResults = removeObjects(search.results, idsRemoved);
                return newResults;
            } else {
                return null;
            }
        }).then((newResults) => {
            search.finish(newResults);

            // update recentSearchResults to force rerender
            this.updateList('recentSearchResults', (before) => {
                return _.slice(before);
            });

            // save to cache
            this.updateLocalCache(search);
            return !!newResults;
        }).finally(() => {
            search.updating = false;

            setTimeout(() => {
                if (this.searching) {
                    var stillActive = _.some(this.recentSearchResults, {
                        updating: true,
                        background: false,
                    });
                    if (!stillActive) {
                        this.searching = false;
                        this.triggerSearchEvent(false);
                    }
                }
            }, 50);
        });
    },

    /**
     * Discover objects that meet the criteria specified in the query. Will
     * produce an array of ids and generation numbers.
     *
     * @param  {Object} location
     * @param  {Object} criteria
     *
     * @return {Promise<Array<Object>>}
     */
    discoverRemoteObjects: function(location, criteria) {
        return this.performRemoteAction(location, 'discovery', criteria);
    },

    /**
     * Retrieve objects that were discovered
     *
     * @param  {Object} location
     * @param  {Array<Number>} ids
     * @param  {Boolean} background
     *
     * @return {Promise<Array<Object>>}
     */
    retrieveRemoteObjects: function(location, ids, background) {
        return this.performRemoteAction(location, 'retrieval', { ids, background });
    },

    /**
     * Save objects to remote database; results are saved to the storage object
     *
     * @param  {Storage} storage
     *
     * @return {Promise>}
     */
    updateRemoteDatabase: function(storage) {
        var change = new Change(storage.getLocation(), storage.objects, storage.options);
        _.each(this.changeQueue, (earlierOp) => {
            change.merge(earlierOp);
        });
        if (change.noop()) {
            storage.results = storage.objects;
            storage.setFinishTime();
            return Promise.resolve([]);
        }
        change.onDispatch = (change) => {
            var objects = change.deliverables();
            var location = change.location;
            storage.start();
            return this.performRemoteAction(location, 'storage', { objects }).then((objects) => {
                this.saveIDMapping(location, change.objects, objects);
                return objects;
            }).finally(() => {
                this.removeChange(change);
            });
        };
        change.onCancel = (change) => {
            this.removeChange(change);
            return Promise.resolve();
        };
        this.queueChange(change);
        if (this.props.online) {
            // send it if we've connectivity
            change.dispatch();
        }
        this.triggerChangeEvent();
        return change.promise.then((objects) => {
            if (!change.canceled) {
                storage.finish(objects);
            } else {
                storage.canceled = true;
            }
        }).catch((err) => {
            // signal that the change was removed
            this.triggerChangeEvent();
            throw err;
        });
    },

    /**
     * Add an entry to the change queue
     *
     * @param  {Change} change
     */
    queueChange: function(change) {
        this.updateList('changeQueue', (before) => {
            return _.concat(before, change);
        });
    },

    /**
     * Remove an entry from the change queue
     *
     * @param  {Change} change
     */
    removeChange: function(change) {
        this.updateList('changeQueue', (before) => {
            return _.without(before, change);
        });
    },

    /**
     * Save relationships between temporary IDs and database IDs
     *
     * @param  {Object} location
     * @param  {Array<Object>} localObjects
     * @param  {Array<Object>} remoteObjects
     */
    saveIDMapping: function(location, localObjects, remoteObjects) {
        if (localObjects.length !== remoteObjects.length) {
            return;
        }
        var path = [ location.address, location.schema, location.table ];
        var list = _.get(this.idMappings, path);
        if (!list) {
            list = [];
            _.set(this.idMappings, path, list);
        }
        _.each(localObjects, (localObject, index) => {
            if (localObject.id < 1) {
                var remoteObject = remoteObjects[index];
                _.remove(list, { permanent: remoteObject.id });
                list.push({
                    temporary: localObject.id,
                    permanent: remoteObject.id,
                });
            }
        });
    },

    /**
     * Return the tempoprary ID used to reference an object before it
     * was saved
     *
     * @param  {Object} location
     * @param  {Number} permanentID
     *
     * @return {Number|undefined}
     */
    findTemporaryID: function(location, permanentID) {
        var path = [ location.address, location.schema, location.table ];
        var list = _.get(this.idMappings, path);
        var entry = _.find(list, { permanent: permanentID });
        if (entry) {
            return entry.temporary;
        }
    },

    /**
     * Apply uncommitted changes to search results
     *
     * @param  {Search} search
     *
     * @return {Object}
     */
    applyUncommittedChanges: function(search) {
        if (!_.isEmpty(this.changeQueue)) {
            var includeDeleted = _.get(this.props.discoveryFlags, 'include_deleted');
            search = _.clone(search);
            search.results = _.slice(search.results);
            _.each(this.changeQueue, (change) => {
                change.apply(search, includeDeleted);
            });
        }
        return search;
    },

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
    performRemoteAction: function(location, action, payload) {
        var address = location.address;
        var basePath = this.props.basePath;
        var schema = location.schema;
        var table = location.table;
        if (!schema) {
            return Promise.reject(new Error('No schema specified'));
        }
        if (!table) {
            return Promise.reject(new Error('No table specified'));
        }
        var flags;
        if (action === 'retrieval' || action === 'storage') {
            flags = this.props.retrievalFlags;
        } else if (action === 'discovery') {
            flags = _.omit(this.props.discoveryFlags, 'include_uncommitted');
        }
        var url = `${address}${basePath}/${action}/${schema}/${table}/`;
        var session = getSession(address);
        var req = _.assign({}, payload, flags, { auth_token: session.token });
        var options = {
            contentType: 'json',
            responseType: 'json',
        };
        return HTTPRequest.fetch('POST', url, req, options).then((result) => {
            return result;
        }).catch((err) => {
            if (err.statusCode === 401 || err.statusCode == 403) {
                this.clearRecentOperations(address);
                this.clearCachedSchemas(address);
                if (err.statusCode === 401) {
                    destroySession(session);
                    this.triggerExpirationEvent(session);
                } else if (err.statusCode == 403) {
                    this.triggerViolationEvent(address, schema);
                }
                this.triggerChangeEvent();
            }
            throw err;
        });
    },

    /**
     * Store objects in local schema
     *
     * @param  {Storage|Removal} op
     *
     * @return {Promise>}
     */
    updateLocalDatabase: function(op) {
        return Promise.try(() => {
            var cache = this.props.cache;
            var location = op.getLocation();
            op.start();
            if (op instanceof Removal) {
                op.promise = cache.remove(location, op.objects);
            } else {
                op.promise = cache.save(location, op.objects);
            }
            return op.promise.then((objects) => {
                op.finish(objects);
            });
        });
    },

    /**
     * Search local cache
     *
     * @param  {Search} search
     * @param  {Object|undefined} discovery
     *
     * @return {Promise<Boolean>}
     */
    searchLocalCache: function(search, discovery) {
        return Promise.try(() => {
            var cache = this.props.cache;
            if (!discovery) {
                // pre-discovery search of cache
                if (search.remote) {
                    // don't scan cache initially if we must perform the search
                    // on the remote server (i.e. the criteria is too complex)
                    return false;
                }
                var query = search.getQuery();
                return this.validateCache(query.address, query.schema).then(() => {
                    return cache.find(query).then((objects) => {
                        search.results = objects;
                        return true;
                    });
                });
            } else {
                // post discovery loading of cached objects, needed only when
                // we can't search locally
                if (!search.remote) {
                    return false;
                }
                var ids = getFetchList(discovery.ids, search.results);
                if (_.isEmpty(ids)) {
                    return false;
                }
                var query = _.assign({ criteria: { id: ids } }, search.getLocation());
                return this.validateCache(query.address, query.schema).then(() => {
                    return cache.find(query).then((objects) => {
                        search.results = insertObjects(search.results, objects);
                        return true;
                    });
                });
            }
        }).catch((err) => {
            console.error(err);
            return false;
        });
    },

    /**
     * Compare signature stored previous with current signature; if they do
     * not match, clean the cache
     *
     * @param  {String} address
     * @param  {String} schema
     *
     * @return {Promise}
     */
    validateCache: function(address, schema) {
        if (schema === 'local') {
            return Promise.resolve();
        }
        if (!this.props.online) {
            return Promise.resolve();
        }
        var cache = this.props.cache;
        var path = [ address, schema ];
        var promise = _.get(this.cacheValidation, path);
        if (!promise) {
            promise = this.getRemoteSignature(address, schema).then((remoteSignature) => {
                return this.getCacheSignature(address, schema).then((cacheSignature) => {
                    if (cacheSignature) {
                        if (cacheSignature !== remoteSignature) {
                            return this.clearCachedObjects(address, schema).then(() => {
                                return this.setCacheSignature(address, schema, remoteSignature);
                            });
                        }
                    } else {
                        // wait for any cache clearing operation to complete
                        return this.waitForCacheClearing(address, schema).then(() => {
                            return this.setCacheSignature(address, schema, remoteSignature);
                        });
                    }
                });
            }).catch((err) => {
                console.error(err);
                _.unset(this.cacheValidation, path);
            });
            _.set(this.cacheValidation, path, promise);
        }
        return promise;
    },

    /**
     * Clear cached schema at given address
     *
     * @param  {String} address
     *
     * @return {Promise}
     */
    clearCachedSchemas: function(address) {
        // remove all validation results for address
        _.unset(this.cacheValidation, [ address ]);

        // clear the objects first
        return this.clearCachedObjects(address, '*').then(() => {
            // remove the signatures
            var cache = this.props.cache;
            var location = {
                schema: 'local',
                table: 'remote_schema',
            };
            var prefix = `${address}/`;
            return cache.find(location).filter((row) => {
                return _.startsWith(row.key, prefix);
            }).then((rows) => {
                return cache.remove(location, rows);
            })
        });
    },

    /**
     * Fetch signature of schema
     *
     * @param  {String} address
     * @param  {String} schema
     *
     * @return {Promise<String>}
     */
    getRemoteSignature: function(address, schema) {
        var url = `${address}${this.props.basePath}/signature/${schema}`;
        var options = {
            responseType: 'json'
        };
        return HTTPRequest.fetch('GET', url, null, options).then((result) => {
            return _.get(result, 'signature');
        });
    },

    /**
     * Load signature of cached schema
     *
     * @param  {String} address
     * @param  {String} schema
     *
     * @return {Promise<String>}
     */
    getCacheSignature: function(address, schema) {
        var cache = this.props.cache;
        var query = {
            schema: 'local',
            table: 'remote_schema',
            criteria: {
                key: `${address}/${schema}`
            }
        };
        return cache.find(query).get(0).then((result) => {
            return _.get(result, 'signature');
        });
    },

    /**
     * Save signature of cached schema
     *
     * @param  {String} address
     * @param  {String} schema
     * @param  {String} signature
     *
     * @return {Promise}
     */
    setCacheSignature: function(address, schema, signature) {
        var cache = this.props.cache;
        var location = {
            schema: 'local',
            table: 'remote_schema',
        };
        var entry = {
            key: `${address}/${schema}`,
            signature
        };
        return cache.save(location, [ entry ]);
    },

    /**
     * Update objects in local cache with remote copies
     *
     * @param  {Search|Storage|Removal} op
     *
     * @return {Promise<Boolean>}
     */
    updateLocalCache: function(op) {
        return Promise.try(() => {
            var cache = this.props.cache;
            var location = op.getLocation();
            if (op instanceof Search) {
                return cache.save(location, op.results).then(() => {
                    return cache.remove(location, op.missingResults);
                });
            } else if (op instanceof Removal) {
                return cache.remove(location, op.results);
            } else if (op instanceof Storage) {
                return cache.save(location, op.results);
            }
        }).then(() => {
            return true;
        }).catch((err) => {
            console.error(err);
            return false;
        });
    },

    /**
     * Deleted all cached objects originating from given server
     *
     * @param  {String} address
     * @param  {String} schema
     *
     * @return {Promise<Number>}
     */
    clearCachedObjects: function(address, schema) {
        return Promise.try(() => {
            var cache = this.props.cache;
            // see if we're in the middle of clearing everything from address
            var clearingAllPromise = _.get(this.cacheClearing, [ address, '*' ]);
            if (clearingAllPromise) {
                return clearingAllPromise;
            }

            var path = [ address, schema ];
            var clearingSchemaPromise = _.get(this.cacheClearing, path);
            if (!clearingSchemaPromise) {
                clearingSchemaPromise = cache.clean({ address, schema }).then((count) => {
                    _.unset(this.cacheClearing, path);
                    console.log(`Cache entries removed: ${count}`);
                    return count;
                });
                _.set(this.cacheClearing, path, clearingSchemaPromise);
            }
            return clearingSchemaPromise;
        });
    },

    /**
     * If a schema is in the middle of being cleared, return the promise from
     * that operation
     *
     * @param  {String} address
     * @param  {String} schema
     *
     * @return {Promise<Number>}
     */
    waitForCacheClearing: function(address, schema) {
        var clearingAllPromise = _.get(this.cacheClearing, [ address, '*' ]);
        if (clearingAllPromise) {
            return clearingAllPromise;
        }
        var clearingSchemaPromise = _.get(this.cacheClearing, [ address, schema ]);
        if (clearingSchemaPromise) {
            return clearingSchemaPromise;
        }
        return Promise.resolve(0);
    },

    /**
     * Update recent search results; if a storage operation was performed,
     * add any new objects that match the criteria of a search; if a removal
     * was done, take the objects out of the search results
     *
     * @param  {Storage|Removal} op
     */
    updateRecentSearchResults: function(op) {
        var relevantSearches = this.getRelevantRecentSearches(op.getLocation());
        _.each(relevantSearches, (search) => {
            var resultsBefore = search.results;
            var resultsAfter = resultsBefore;
            _.each(op.results, (object) => {
                var index = _.sortedIndexBy(resultsAfter, object, 'id');
                var target = resultsAfter[index];
                var present = (target && target.id === object.id);
                // note: Removal is a subclass of Storage
                if (op instanceof Removal) {
                    if (present) {
                        if (resultsAfter === resultsBefore) {
                            resultsAfter = _.slice(resultsAfter);
                        }
                        resultsAfter.splice(index, 1);
                    }
                } else if (op instanceof Storage) {
                    var match = LocalSearch.match(search.table, object, search.criteria);
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
    },

    /**
     * Return recent searches that were done at the given location
     *
     * @param  {Object} location
     *
     * @return {Array<Object>}
     */
    getRelevantRecentSearches: function(location) {
        return _.filter(this.recentSearchResults, (search) => {
            if (search.matchLocation(location)) {
                return true;
            }
        });
    },

    /**
     * Remove recent search performed on given server
     *
     * @param  {String} address
     */
    clearRecentOperations: function(address) {
        var listNames = [
            'recentSearchResults',
            'recentStorageResults',
            'recentRemovalResults'
        ];
        _.each(listNames, (listName) => {
            this.updateList(listName, (before) => {
                var after = _.filter(before, (op) => {
                    if (op.address === address) {
                        return false;
                    }
                    return true;
                });
                return after;
            });
        });
    },

    /**
     * Creation interval function to check for expiration of sessions
     */
    componentWillMount: function() {
        this.sessionCheckTimeout = setInterval(() => {
            var soon = Moment().add(5, 'minute').toISOString();
            var expired = findSessions((session) => {
                if (session.etime < soon) {
                    return true;
                }
            });
            if (!_.isEmpty(expired)) {
                _.each(expired, (session) => {
                    if (!session.token) {
                        // recreate session if we haven't gain authorization yet
                        destroySession(session);
                    }
                });
                this.triggerChangeEvent();
            }
        }, 60 * 1000);
    },

    /**
     * Signal that the component is ready
     */
    componentDidMount: function() {
        this.triggerChangeEvent();
    },

    /**
     * Monitor connectivity
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (!this.props.online && nextProps.online) {
            // reconcile changes and invalidate all searches
            this.invalidate().then(() => {
                // send pending changes
                _.each(this.changeQueue, (change) => {
                    change.dispatch();
                });
            });
        }
    },

    /**
     * Clear session check interval function
     */
    componentWillUnmount: function() {
        clearInterval(this.sessionExpirationCheckInterval);
        this.stopPrefetch();
    },

    /**
     * Start updating recent searches that are dirty
     *
     * @param  {String} address
     */
    schedulePrefetch: function(address) {
        this.stopPrefetch();

        var prefetchTimeout = this.prefetchTimeout = setTimeout(() => {
            var dirtySearches = _.filter(this.recentSearchResults, (search) => {
                if (!address || search.address === address) {
                    if (search.dirty) {
                        return true;
                    }
                }
            });
            var fetched = [];
            Promise.map(dirtySearches, (search) => {
                // prefetching was cancelled
                if (this.prefetchTimeout !== prefetchTimeout) {
                    return false;
                }
                if (!search.dirty) {
                    return false;
                }
                if (!search.prefetching) {
                    return false;
                }
                // don't prefetch a search if the same component has done a
                // search with the same shape more recently
                var shape = search.getCriteriaShape();
                var similar = _.find(fetched, (f) => {
                    if (_.includes(search.by, f.component)) {
                        if (_.isEqual(shape, f.shape)) {
                            return true;
                        }
                    }
                });
                if (similar) {
                    return false;
                }
                return this.searchRemoteDatabase(search, true).then(() => {
                    _.each(search.by, (component) => {
                        fetched.push({ component, shape });
                    });
                });
            }, { concurrency: 4 });
        }, 200);
    },

    /**
     * Stop updating recent searches
     */
    stopPrefetch: function() {
        if (this.prefetchTimeout) {
            clearTimeout(this.prefetchTimeout);
            this.prefetchTimeout = null;
        }
    },

    /**
     * Render diagnostics
     *
     * @return {ReactElement}
     */
    render: function() {
        var searches = this.state.recentSearchResults;
        var stores = this.state.recentStorageResults;
        var removals = this.state.recentRemovalResults;
        return (
            <Diagnostics type="remote-data-source">
                <DiagnosticsSection label="Recent searches">
                    <RecentSearchTable searches={searches} />
                </DiagnosticsSection>
                <DiagnosticsSection label="Recent storage" hidden={_.isEmpty(stores)}>
                    <RecentStorageTable stores={stores} />
                </DiagnosticsSection>
                <DiagnosticsSection label="Recent removal" hidden={_.isEmpty(removals)}>
                    <RecentStorageTable stores={removals} />
                </DiagnosticsSection>
            </Diagnostics>
        );
    },
});

var authCache = {};

/**
 * Given a list of ids, return the ids that are missing from the list of objects
 *
 * @param  {Array<Number>} ids
 * @param  {Array<Object>} objects
 *
 * @return {Array<Number>}
 */
function getFetchList(ids, objects) {
    var updated = [];
    _.each(ids, (id, i) => {
        var index = _.sortedIndexBy(objects, { id }, 'id');
        var object = (objects) ? objects[index] : null;
        if (!object || object.id !== id) {
            updated.push(id);
        }
    });
    return updated;
}

/**
 * Given lists of ids and gns (generation numbers), return the ids that
 * either are missing from the list of objects or the objects' gns are
 * different from the ones provided
 *
 * @param  {Array<Number>} ids
 * @param  {Array<Number>} gns
 * @param  {Array<Object>} objects
 *
 * @return {Array<Number>}
 */
function getUpdateList(ids, gns, objects) {
    var updated = [];
    _.each(ids, (id, i) => {
        var gn = gns[i];
        var index = _.sortedIndexBy(objects, { id }, 'id');
        var object = (objects) ? objects[index] : null;
        if (!object || object.id !== id || object.gn !== gn) {
            updated.push(id);
        }
    });
    return updated;
}

/**
 * Return ids of objects that aren't found in the list provided
 *
 * @param  {Array<Number>} ids
 * @param  {Array<Number>} gns
 * @param  {Array<Object>} objects
 *
 * @return {Array<Number>}
 */
function getRemovalList(ids, gns, objects) {
    var removal = [];
    _.each(objects, (object) => {
        if (!_.includes(ids, object.id)) {
            removal.push(object.id);
        }
    });
    return removal;
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
        var index = _.sortedIndexBy(objects, { id }, 'id');
        var object = (objects) ? objects[index] : null;
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
        var index = _.sortedIndexBy(objects, newObject, 'id');
        var object = objects[index];
        if (object && object.id === newObject.id) {
            objects[index] = newObject;
        } else {
            objects.splice(index, 0, newObject);
        }
    });
    return objects;
}

var sessions = [];

/**
 * Obtain object where authorization info for a server is stored
 *
 * @param  {String} address
 * @param  {String|undefined} type
 *
 * @return {Object}
 */
function getSession(address, type) {
    if (!type) {
        type = 'primary';
    }
    var session = _.find(sessions, { address, type });
    if (!session) {
        session = { address, type };
        sessions.push(session);
    }
    return session;
}

/**
 * Return list of sessions
 *
 * @param  {*} predicate
 *
 * @return {Array<Object>}
 */
function findSessions(predicate) {
    return _.filter(sessions, predicate);
}

/**
 * Remove authorization to a server
 *
 * @param  {Object} session
 */
function destroySession(session) {
    _.pull(sessions, session);
}
