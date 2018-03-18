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
        hasConnection: PropTypes.bool,
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
            hasConnection: true,
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
        return this.props.hasConnection;
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
            _.assign(session, res.session);
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
                this.clearRecentSearches(address);
                this.clearCachedObjects(address);
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
        if (!session.promise) {
            var url = `${address}/srv/session/`;
            var options = { responseType: 'json', contentType: 'json' };
            session.promise = HTTPRequest.fetch('GET', url, { handle }, options).then((res) => {
                session.handle = handle;
                _.assign(session, res.session);
                if (session.token) {
                    this.triggerAuthorizationEvent(session);
                    return session.user_id;
                } else {
                    throw new HTTPError(session.error);
                }
            }).catch((err) => {
                session.promise = null;
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
        var byComponent = _.get(query, 'by.constructor.displayName');
        var required = query.required;
        var committed = query.committed;
        var blocking = query.blocking;
        var search;
        var newSearch = new Search(query);
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
                    if (this.props.hasConnection) {
                        this.searchRemoteDatabase(existingSearch).then((changed) => {
                            if (changed) {
                                // data returned earlier wasn't entirely correct
                                // trigger a new search through a onChange event
                                this.triggerChangeEvent();
                                return null;
                            }
                        });
                    }
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
                // if we have the right number of objects and they were
                // retrieved recently, then don't perform server check
                if (newSearch.isMeetingExpectation()) {
                    if (newSearch.isSufficientlyRecent(this.props.refreshInterval)) {
                        return newSearch.results;
                    }
                }

                // don't search remotely when there's no connection
                if (!this.props.hasConnection) {
                    return newSearch.results;
                }

                // perform search on remote server
                var remoteSearchPromise = this.searchRemoteDatabase(newSearch).then((changed) => {
                    if (changed) {
                        this.triggerChangeEvent();
                        return null;
                    }
                });

                if (search.remote) {
                    // remote only search always block
                    blocking = true;
                } else if (blocking === undefined) {
                    // if blocking is not specified, then we don't block
                    // when there're certain number of cached records
                    // (i.e. the minimum is met--see constructor of Search)
                    blocking = !newSearch.isSufficientlyCached();
                }

                if (!blocking) {
                    // return cached results immediately, without waiting for
                    // the remote search to finish
                    //
                    // if the remote search yield new data, an onChange event will
                    // trigger a new search
                    return newSearch.results;
                } else {
                    // wait for remote search to finish
                    return remoteSearchPromise.then(() => {
                        return newSearch.results;
                    });
                }
            });
            search = newSearch;
        }
        return search.promise.then((results) => {
            if (required && query.expected) {
                if (results.length < query.expected) {
                    this.triggerStupefactionEvent(query, results);
                    throw new HTTPError(404);
                }
            }
            var includeUncommitted = _.get(this.props.discoveryFlags, 'include_uncommitted');
            if (includeUncommitted && committed !== true) {
                // apply changes that haven't been saved yet
                search = this.applyUncommittedChanges(search);
            }
            return search.results;
        });
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
            return this.storeLocalObjects(storage).then(() => {
                this.updateRecentSearchResults(storage);
                this.triggerChangeEvent();
                return storage.results;
            });
        } else {
            return this.storeRemoteObjects(storage).then(() => {
                if (storage.cancelled) {
                    return [];
                }
                this.updateCachedObjects(storage);
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
            return this.storeLocalObjects(removal).then(() => {
                this.removeFromRecentSearchResults(removal);
                this.triggerChangeEvent();
                return removal.results;
            });
        } else {
            if (process.env.NODE_ENV !== 'production') {
                if (_.get(this.props.discoveryFlags, 'include_deleted')) {
                    console.warn('remove() should not be used when deleted objects are not automatically filtered out');
                }
            }
            return this.storeRemoteObjects(removal).then(() => {
                this.removeCachedObjects(removal);
                this.removeFromRecentSearchResults(removal);
                this.triggerChangeEvent();
                return removal.results;
            });
        }
    },

    /**
     * Remove recent searches on schema
     *
     * @param  {String|undefined} address
     * @param  {String|undefined} schema
     */
    clear: function(address, schema) {
        this.updateList('recentSearchResults', (before) => {
            var after;
            if (address && schema) {
                after = _.filter(before, (search) => {
                    if (_.isMatch(search, { address, schema })) {
                        return false;
                    }
                    return true;
                });
            } else if (address) {
                after = _.filter(before, (search) => {
                    if (_.isMatch(search, { address })) {
                        return false;
                    }
                    return true;
                });
            } else {
                after = [];
            }
            return after;
        });
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
                // tell data consuming components to rerun their queries
                // initially, they'd all get the data they had before
                // another change event will occur if new objects are
                // actually retrieved from the remote server
                this.triggerChangeEvent();

                // update recent searches that aren't being used currently
                if (this.props.prefetching) {
                    if (this.props.inForeground) {
                        this.schedulePrefetch(address);
                    }
                }
            }
            return changed;
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
            while (after.length > 256) {
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
     * @param  {Boolean|undefined} background
     *
     * @return {Promise<Boolean>}
     */
    searchRemoteDatabase: function(search, background) {
        if (search.isLocal()) {
            return Promise.resolve(false);
        }
        var wasUpdating = search.updating;
        search.updating = true;
        search.background = background || false;
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
        search.setStartTime();
        return this.discoverRemoteObjects(location, criteria).then((discovery) => {
            // use the list of ids and gns (generation number) to determine
            // which objects have changed and which have gone missing
            var ids = discovery.ids;
            var gns = discovery.gns;
            var idsUpdated = getUpdateList(ids, gns, search.results);
            var idsRemoved = getRemovalList(ids, gns, search.results);
            if (!_.isEmpty(idsRemoved)) {
                // if an object that we found before is no longer there, then
                // it's either deleted or changed in such a way that it longer
                // meets the criteria; in both scenarios, the local copy has
                // become stale
                var objectsRemoved = pickObjects(search.results, idsRemoved);
                this.removeCachedObjects(search, objectsRemoved);
            }
            if (!_.isEmpty(idsUpdated)) {
                // retrieve the updated (or new) objects from server
                return this.retrieveRemoteObjects(location, idsUpdated, background).then((retrieval) => {
                    // then add them to the list and remove missing ones
                    var newObjects = retrieval;
                    var newResults = insertObjects(search.results, newObjects);
                    newResults = removeObjects(newResults, idsRemoved);
                    search.lastRetrieved = newObjects.length;

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
                search.lastRetrieved = 0;
                return newResults;
            } else {
                search.lastRetrieved = 0;
                return null;
            }
        }).then((newResults) => {
            if (newResults) {
                search.results = newResults;
                search.promise = Promise.resolve(newResults);
            }
            search.setFinishTime();
            search.dirty = false;

            // update recentSearchResults
            this.updateList('recentSearchResults', (before) => {
                return _.slice(before);
            });

            // update retrieval time and save to cache
            var rtime = search.finish;
            _.each(search.results, (object) => {
                object.rtime = rtime;
            });
            this.updateCachedObjects(search);
            return !!newResults;
        }).finally(() => {
            search.updating = false;
            search.background = false;

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
     * Discover objects that mean the criteria specified in the query. Will
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
     * Save objects to remote database
     *
     * @param  {Storage} storage
     * @param  {Object|undefined} options
     *
     * @return {Promise<Array<Object>>}
     */
    storeRemoteObjects: function(storage) {
        var change = new Change(storage.getLocation(), storage.objects, storage.options);
        _.each(this.changeQueue, (earlierOp) => {
            change.merge(earlierOp);
        });
        if (change.noop()) {
            storage.setFinishTime();
            storage.results = storage.objects;
            return Promise.resolve();
        }
        change.onDispatch = (change) => {
            var objects = change.deliverables();
            var location = change.location;
            storage.setStartTime();
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
        if (this.props.hasConnection) {
            // send it if we've connectivity
            change.dispatch();
        }
        this.triggerChangeEvent();
        return change.promise.then((objects) => {
            if (!change.canceled) {
                storage.setFinishTime();
                storage.results = objects;
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
            this.clearRecentSearches(address);
            this.clearCachedObjects(address);
            if (err.statusCode === 401) {
                destroySession(session);
                this.triggerExpirationEvent(session);
                this.triggerChangeEvent();
            } else if (err.statusCode == 403) {
                this.triggerViolationEvent(address, schema);
                this.triggerChangeEvent();
            }
            throw err;
        });
    },

    /**
     * Store objects in local schema
     *
     * @param  {Storage} storage
     *
     * @return {Promise<Array<Object>>}
     */
    storeLocalObjects: function(storage) {
        var cache = this.props.cache;
        if (!cache) {
            return Promise.reject(new Error('No local cache'));
        }
        if (storage instanceof Removal) {
            storage.promise = cache.remove(storage.getLocation(), storage.objects);
        } else {
            storage.promise = cache.save(storage.getLocation(), storage.objects);
        }
        return storage.promise.then((objects) => {
            storage.setFinishTime();
            storage.results = objects;
        });
    },

    /**
     * Search local cache
     *
     * @param  {Search} search
     *
     * @return {Promise<Boolean>}
     */
    searchLocalCache: function(search) {
        var cache = this.props.cache;
        if (!cache) {
            return Promise.resolve(false);
        }
        if (search.remote || this.cleaningCache) {
            // don't scan cache if query is designed as remote
            // and if the cache is currently being cleaned
            return Promise.resolve(true);
        }
        return cache.find(search.getQuery()).then((objects) => {
            search.results = objects;
            return true;
        }).catch((err) => {
            console.error(err);
            return false;
        });
    },

    /**
     * Update objects in local cache with remote copies
     *
     * @param  {Search|Storage} storage
     *
     * @return {Promise<Boolean>}
     */
    updateCachedObjects: function(storage) {
        var cache = this.props.cache;
        if (!cache) {
            return Promise.resolve(false);
        }
        return cache.save(storage.getLocation(), storage.results).then((objects) => {
            return true;
        }).catch((err) => {
            console.error(err);
            return false;
        });
    },

    /**
     * Remove cached objects
     *
     * @param  {Removal} removal
     *
     * @return {Promise<Boolean>}
     */
    removeCachedObjects: function(removal) {
        var cache = this.props.cache;
        if (!cache) {
            return Promise.resolve(false);
        }
        return cache.remove(removal.getLocation(), removal.results).then((objects) => {
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
     *
     * @return {Promise<Number>}
     */
    clearCachedObjects: function(address) {
        var cache = this.props.cache;
        if (!cache) {
            return Promise.resolve(0);
        }
        this.cleaningCache = true;
        return cache.clean({ address }).then(() => {
            this.cleaningCache = false;
            console.log('Cache entries removed');
        });
    },

    /**
     * Insert new objects into recent search results if the objects match the
     * criteria
     *
     * @param  {Storage} storage
     */
    updateRecentSearchResults: function(storage) {
        var relevantSearches = this.getRelevantRecentSearches(storage.getLocation());
        _.each(relevantSearches, (search) => {
            var changed = false;
            _.each(storage.results, (object) => {
                // local objects have string key and not id
                var keyName = storage.isLocal() ? 'key' : 'id';
                var index = _.sortedIndexBy(search.results, object, 'id');
                var target = search.results[index];
                var present = (target && target.id === object.id);
                var match = LocalSearch.match(search.table, object, search.criteria);
                if (match || present) {
                    // create new array so memoized functions won't return old results
                    if (!changed) {
                        search.results = _.slice(search.results);
                        search.promise = Promise.resolve(search.results);
                        changed = true;
                    }
                    if (match && present) {
                        // update the object with new one
                        search.results[index] = object;
                    } else if (match && !present) {
                        // insert a new object
                        search.results.splice(index, 0, object);
                        LocalSearch.limit(search.table, search.results, search.criteria)
                    } else if (!match && present) {
                        // remove object from the list as it no longer
                        // meets the criteria
                        search.results.splice(index, 1);
                    }
                }
            });
        });
    },

    /**
     * Remove objects from recent search results (because they've been deleted)
     *
     * @param  {Removal} removal
     */
    removeFromRecentSearchResults: function(removal) {
        var relevantSearches = this.getRelevantRecentSearches(removal.getLocation());
        _.each(relevantSearches, (search) => {
            var changed = false;
            _.each(removal.results, (object) => {
                var keyName = removal.isLocal() ? 'key' : 'id';
                var index = _.sortedIndexBy(search.results, object, keyName);
                var target = search.results[index];
                var present = (target && target.id === object.id);
                if (present) {
                    // remove object from the list as it no longer exists
                    if (!changed) {
                        search.results = _.slice(search.results);
                        search.promise = Promise.resolve(search.results);
                        changed = true;
                    }
                    search.results.splice(index, 1);
                }
            });
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
    clearRecentSearches: function(address) {
        this.updateList('recentSearchResults', (before) => {
            var after = _.filter(before, (search) => {
                if (search.address === address) {
                    return false;
                }
                return true;
            });
            return after;
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
        if (!this.props.hasConnection && nextProps.hasConnection) {
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
                console.log('Prefetching', search.getQuery());
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
 * Return objects matching a list of ids from a sorted array
 *
 * @param  {Array<Object>} objects
 * @param  {Array<Number>} ids
 *
 * @return {Array<Object>}
 */
function pickObjects(objects, ids) {
    var list = [];
    _.each(ids, (id) => {
        var index = _.sortedIndexBy(objects, { id }, 'id');
        var object = objects[index];
        if (object && object.id === id) {
            list.push(object);
        }
    });
    return list;
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
