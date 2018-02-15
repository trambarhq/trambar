var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Moment = require('moment');

var HTTPRequest = require('transport/http-request');
var HTTPError = require('errors/http-error');
var LocalSearch = require('data/local-search');
var SessionStartTime = require('data/session-start-time');
var RemoteDataChange = require('data/remote-data-change');

module.exports = React.createClass({
    displayName: 'RemoteDataSource',
    propTypes: {
        refreshInterval: PropTypes.number,
        basePath: PropTypes.string,
        discoveryFlags: PropTypes.object,
        retrievalFlags: PropTypes.object,
        committedResultsOnly: PropTypes.bool,
        hasConnection: PropTypes.bool,
        inForeground: PropTypes.bool,
        cache: PropTypes.object,

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
            refreshInterval: 15 * 60,   // 15 minutes
            basePath: '',
            hasConnection: true,
            committedResultsOnly: true,
            inForeground: true,
        };
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        this.searching = false;
        var lists = {
            recentSearchResults: [],
            recentStorageResults: [],
            recentRemovalResults: [],
            changeQueue: [],
            activeSearches: [],
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
            var url = `${address}/session/`;
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
                setTimeout(this.triggerChangeEvent, 5000);
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
        var url = `${address}/session/`;
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
        var url = `${address}/session/htpasswd/`;
        var payload = { handle, username, password };
        var options = { responseType: 'json', contentType: 'json' };
        return HTTPRequest.fetch('POST', url, payload, options).then((res) => {
            _.assign(session, res.session);
            if (session.token) {
                this.triggerAuthorizationEvent(session);
                return null;
            } else {
                throw new HTTPError(session.error);
            }
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
            return Promise.resolve(false);
        }
        return Promise.resolve(session.promise).then(() => {
            var url = `${address}/session/`;
            var options = { responseType: 'json', contentType: 'json' };
            return HTTPRequest.fetch('DELETE', url, { handle }, options).then(() => {
                destroySession(session);
                this.clearRecentSearches(address);
                this.clearCachedObjects(address);
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
            var url = `${address}/session/`;
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
            var url = `${address}/session/`;
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
        var url = `${address}/session/`;
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
        var url = `${address}/session/${oauthServer.type}?${query}`;
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
        // within render()
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
        var byComponent = _.get(query, 'by.constructor.displayName',)
        var required = query.required;
        query = getSearchQuery(query);
        var search = this.findRecentSearch(query);
        if (search) {
            if (byComponent) {
                // add the component to the "by" array so we can figure out
                // who requested the data
                if (!_.includes(search.by, byComponent)) {
                    search.by.push(byComponent);
                }
            }
            if (search.promise.isFulfilled()) {
                if (!isFresh(search)) {
                    // search is perhaps out-of-date--indicate that the data
                    // is speculative and check with the server
                    if (!search.updating) {
                        if (this.props.hasConnection) {
                            search.updating = true;
                            this.searchRemoteDatabase(search).then((changed) => {
                                search.updating = false;
                                if (changed) {
                                    // data returned earlier wasn't entirely correct
                                    // trigger a new search through a onChange event
                                    this.triggerChangeEvent();
                                    return null;
                                }
                            });
                        }
                    }
                }
            } else if (search.promise.isRejected()) {
                search.promise = this.searchRemoteDatabase(search).then((changed) => {
                    if (changed) {
                        this.triggerChangeEvent();
                        return null;
                    }
                    return search.results;
                });
            }
        } else {
            search = _.extend({}, query, {
                start: null,
                finish: null,
                results: null,
                promise: null,
                by: byComponent ? [ byComponent ]: [],
                dirty: false,
                updating: false,
            });

            // look for records in cache first
            var localSearchPromise = this.searchLocalCache(search).then(() => {
                // don't search remotely when there's no connection
                if (!this.props.hasConnection) {
                    return true;
                }
                // if we have the right number of objects and they were
                // retrieved recently, then don't perform server check
                if (isMeetingExpectation(search)) {
                    if (isSufficientlyRecent(search, this.props.refreshInterval)) {
                        return true;
                    }
                }
                return false;
            });
            var remoteSearchPromise = localSearchPromise.then((localDataValid) => {
                if (localDataValid) {
                    return false;
                }
                return this.searchRemoteDatabase(search).then((changed) => {
                    if (changed) {
                        this.triggerChangeEvent();
                        return null;
                    }
                });
            });
            search.promise = localSearchPromise.then((localDataValid) => {
                if (localDataValid) {
                    return search.results;
                }
                // if there're enough cached records, return them immediately,
                // without waiting for the remote search to finish
                //
                // if the remote search yield new data, an onChange event will
                // trigger a new search
                if (isSufficientlyCached(search)) {
                    return search.results;
                }
                return remoteSearchPromise.then(() => {
                    return search.results;
                });
            });

            // save the search
            this.updateList('recentSearchResults', (before) => {
                var after = _.slice(before);
                after.unshift(search);
                while (after.length > 256) {
                    after.pop();
                }
                return after;
            });
        }
        return search.promise.then((results) => {
            if (required && query.expected) {
                if (results.length < query.expected) {
                    this.triggerStupefactionEvent(query, results);
                    throw new HTTPError(404);
                }
            }
            if (!this.props.committedResultsOnly && !search.committed) {
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
        var startTime = getCurrentTime();
        var byComponent = _.get(location, 'by.constructor.displayName',)
        location = getSearchLocation(location);
        if (location.schema === 'local') {
            return this.storeLocalObjects(location, objects).then((objects) => {
                this.updateRecentSearchResults(location, objects);
                this.triggerChangeEvent();
                return objects;
            });
        } else {
            // storeRemoteObjects() will trigger change event
            return this.storeRemoteObjects(location, objects, options).then((objects) => {
                var endTime = getCurrentTime();
                this.updateCachedObjects(location, objects);
                this.updateRecentSearchResults(location, objects);

                this.updateList('recentStorageResults', (before) => {
                    var after = _.slice(before);
                    after.unshift({
                        start: startTime,
                        finish: endTime,
                        duration: getTimeElapsed(startTime, endTime),
                        results: objects,
                        by: byComponent,
                    });
                    while (after.length > 32) {
                        after.pop();
                    }
                    return after;
                });
                return objects;
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
        var startTime = getCurrentTime();
        var byComponent = _.get(location, 'by.constructor.displayName',)
        location = getSearchLocation(location);
        if (location.schema === 'local') {
            return this.removeLocalObjects(location, objects).then((objects) => {
                this.removeFromRecentSearchResults(location, objects);
                this.triggerChangeEvent();
                return objects;
            });
        } else {
            if (process.env.NODE_ENV !== 'production') {
                if (_.get(this.props.discoveryFlags, 'include_deleted')) {
                    console.warn('remove() should not be used when deleted objects are not automatically filtered out');
                }
            }
            // set the deleted flag
            objects = _.map(objects, (object) => {
                // only the id is needed--no point in sending the other properties
                return { id: object.id, deleted: true };
            });
            // storeRemoteObjects() will trigger change event
            return this.storeRemoteObjects(location, objects).then((objects) => {
                var endTime = getCurrentTime();
                this.removeCachedObjects(location, objects);
                this.removeFromRecentSearchResults(location, objects);

                this.updateList('recentRemovalResults', (before) => {
                    var after = _.clone(before);
                    after.unshift({
                        start: startTime,
                        finish: endTime,
                        duration: getTimeElapsed(startTime, endTime),
                        results: objects,
                        by: byComponent,
                    });
                    while (after.length > 32) {
                        after.pop();
                    }
                    return after;
                });
                return objects;
            });
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
                _.forIn(changes, (idList, name) => {
                    var parts = _.split(name, '.');
                    var location = {
                        address: address,
                        schema: parts[0],
                        table: parts[1]
                    };
                    var relevantSearches = this.getRelevantRecentSearches(location);
                    _.each(relevantSearches, (search) => {
                        var dirty = false;
                        var expectedCount = getExpectedObjectCount(search);
                        if (expectedCount === search.results.length) {
                            // see if the ids show up in the results
                            _.each(idList, (id) => {
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
                        var searchLocation = getSearchLocation(search);
                        if (!address || searchLocation.address === address) {
                            search.dirty = true;
                            changed = true;
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
                if (this.props.inForeground) {
                    this.schedulePrefetch(address);
                }
            }
            return changed;
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
                        var idList = changes[name];
                        if (idList) {
                            // look for changed objects that were changed remotely
                            affectedIds = _.filter(idList, (id, index) => {
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
     * Remove recent searches on schema
     *
     * @param  {String} address
     * @param  {String} schema
     */
    clear: function(address, schema) {
        this.updateList('recentSearchResults', (before) => {
            var after = _.filter(before, (search) => {
                if (_.isMatch(search, { address, schema })) {
                    return false;
                }
                return true;
            });
            return after;
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
     * @param  {Object} query
     *
     * @return {Object|null}
     */
    findRecentSearch: function(query) {
        var index = _.findIndex(this.recentSearchResults, (search) => {
            var searchQuery = getSearchQuery(search);
            return _.isEqual(query, searchQuery);
        });
        if (index !== -1) {
            // move the matching search to the top
            var search = this.recentSearchResults[index];
            this.updateList('recentSearchResults', (before) => {
                var after = _.slice(before);
                after.splice(index, 1);
                after.unshift(search);
                return after;
            });
            return search;
        } else {
            return null;
        }
    },

    /**
     * Perform a search on the server sude
     *
     * @param  {Object} search
     * @param  {Boolean|undefined} background
     *
     * @return {Promise<Boolean>}
     */
    searchRemoteDatabase: function(search, background) {
        if (search.schema === 'local') {
            return Promise.resolve(false);
        }
        if (!background) {
            this.updateList('activeSearches', (before) => {
                return _.union(before, [ search ]);
            });
        }

        var location = getSearchLocation(search);
        var query = getSearchQuery(search);
        search.start = getCurrentTime();
        return this.discoverRemoteObjects(query).then((discovery) => {
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
            if (newResults) {
                search.results = newResults;
                search.promise = Promise.resolve(newResults);
            }
            search.finish = getCurrentTime();
            search.duration = getTimeElapsed(search.start, search.finish);
            search.dirty = false;

            // update activeSearches unless search is done in the background
            if (!background) {
                this.updateList('activeSearches', (before) => {
                    return _.without(this.state.activeSearches, search);
                });
            }
            // update recentSearchResults
            this.updateList('recentSearchResults', (before) => {
                return _.slice(before);
            });

            // update retrieval time and save to cache
            var rtime = search.finish;
            _.each(search.results, (object) => {
                object.rtime = rtime;
            });
            this.updateCachedObjects(location, search.results);
            return !!newResults;
        });
    },

    /**
     * Discover objects that mean the criteria specified in the query. Will
     * produce an array of ids and generation numbers.
     *
     * @param  {Object} query
     *
     * @return {Promise<Array<Object>>}
     */
    discoverRemoteObjects: function(query) {
        var location = getSearchLocation(query);
        return this.performRemoteAction(location, 'discovery', query.criteria);
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
     * @param  {Object} location
     * @param  {Array<Object>} objects
     * @param  {Object|undefined} options
     *
     * @return {Promise<Array<Object>>}
     */
    storeRemoteObjects: function(location, objects, options) {
        var change = new RemoteDataChange(location, objects, options);
        _.each(this.changeQueue, (earlierOp) => {
            change.merge(earlierOp);
        });
        change.onDispatch = (change) => {
            var objects = change.deliverables();
            var location = change.location;
            return this.performRemoteAction(location, 'storage', { objects }).then((objects) => {
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
        return change.promise;
    },

    /**
     * Add an entry to the change queue
     *
     * @param  {RemoteDataChange} change
     */
    queueChange: function(change) {
        this.updateList('changeQueue', (before) => {
            return _.concat(before, change);
        });
    },

    /**
     * Remove an entry from the change queue
     *
     * @param  {RemoteDataChange} change
     */
    removeChange: function(change) {
        this.updateList('changeQueue', (before) => {
            return _.without(before, change);
        });
    },

    /**
     * Apply uncommitted changes to search results
     *
     * @param  {Object} search
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
        var prefix = this.props.basePath;
        var schema = location.schema;
        var table = location.table;
        if (!schema) {
            return Promise.reject(new Error('No schema specified'));
        }
        if (!table) {
            return Promise.reject(new Error('No table specified'));
        }
        var url = `${address}${prefix}/data/${action}/${schema}/${table}/`;
        var session = getSession(address);
        payload = _.clone(payload) || {};
        if (session.token) {
            payload.auth_token = session.token;
        }
        if (action === 'retrieval' || action === 'storage') {
            _.assign(payload, this.props.retrievalFlags);
        } else if (action === 'discovery') {
            _.assign(payload, this.props.discoveryFlags);
        }
        var options = {
            contentType: 'json',
            responseType: 'json',
        };
        return HTTPRequest.fetch('POST', url, payload, options).then((result) => {
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
     * @param  {Object} location
     * @param  {Array<Object>} objects
     *
     * @return {Promise<Array<Object>>}
     */
    storeLocalObjects: function(location, objects) {
        var cache = this.props.cache;
        if (!cache) {
            return Promise.reject(new Error('No local cache'));
        }
        return cache.save(location, objects);
    },

    /**
     * Remove objects from local schema
     *
     * @param  {Object} location
     * @param  {Array<Object>} objects
     *
     * @return {Promise<Array<Object>>}
     */
    removeLocalObjects: function(location, objects) {
        var cache = this.props.cache;
        if (!cache) {
            return Promise.reject(new Error('No local cache'))
        }
        return cache.remove(location, objects);
    },

    /**
     * Search local cache
     *
     * @param  {Object} search
     *
     * @return {Promise<Boolean>}
     */
    searchLocalCache: function(search) {
        var cache = this.props.cache;
        if (!cache) {
            return Promise.resolve(false);
        }
        var query = getSearchQuery(search);
        if (search.remote || this.cleaningCache) {
            // don't scan cache if query is designed as remote
            // and if the cache is currently being cleaned
            search.results = [];
            return Promise.resolve(true);
        }
        return cache.find(search).then((objects) => {
            search.results = objects;
            return true;
        }).catch((err) => {
            console.error(err);
            search.results = [];
            return false;
        });
    },

    /**
     * Update objects in local cache with remote copies
     *
     * @param  {Object} location
     * @param  {Array<Object>} objects
     *
     * @return {Promise<Boolean>}
     */
    updateCachedObjects: function(location, objects) {
        var cache = this.props.cache;
        if (!cache) {
            return Promise.resolve(false);
        }
        return cache.save(location, objects).then((objects) => {
            return true;
        }).catch((err) => {
            console.error(err);
            return false;
        });
    },

    /**
     * Remove cached objects
     *
     * @param  {Object} location
     * @param  {Array<Object>} objects
     *
     * @return {Promise<Boolean>}
     */
    removeCachedObjects: function(location, objects) {
        var cache = this.props.cache;
        if (!cache) {
            return Promise.resolve(false);
        }
        return cache.remove(location, objects).then((objects) => {
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
     * Insert new objects into recent search results (if the objects match the
     * criteria)
     *
     * @param  {Object} location
     * @param  {Array<Object>} objects
     */
    updateRecentSearchResults: function(location, objects) {
        var relevantSearches = this.getRelevantRecentSearches(location);
        var remote = (location.schema !== 'local');
        _.each(relevantSearches, (search) => {
            var changed = false;
            _.each(objects, (object) => {
                var index;
                if (remote) {
                    // remote objects are sorted by id
                    index = _.sortedIndexBy(search.results, object, 'id');
                } else {
                    // local objects have string key and not id
                    index = _.findIndex(search.results, { key: object.key });
                    if (index === -1) {
                        index = search.results.length;
                    }
                }
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
     * @param  {Object} location
     * @param  {Array<Object>} objects
     */
    removeFromRecentSearchResults: function(location, objects) {
        var relevantSearches = this.getRelevantRecentSearches(location);
        var remote = (location.schema !== 'local');
        _.each(relevantSearches, (search) => {
            var changed = false;
            _.each(objects, (object) => {
                var index;
                if (remote) {
                    index = _.sortedIndexBy(search.results, object, 'id');
                } else {
                    index = _.findIndex(search.results, { key: object.key });
                }
                var target = search.results[index];
                var present = (target && target.id === object.id);
                if (present) {
                    // remove object from the list as it no longer
                    // meets the criteria
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
            var searchLocation = getSearchLocation(search);
            if (search.results && _.isEqual(location, searchLocation)) {
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
     * Creation interval function to check for expiration of
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
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        return <div />
    },

    /**
     * Signal that the component is ready
     */
    componentDidMount: function() {
        this.triggerChangeEvent();
    },

    /**
     * Monitor changes to active searches and connectivity
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate: function(prevProps, prevState) {
        if (prevState.changeQueue !== this.state.changeQueue) {
            this.triggerChangeEvent();
        }
        if (prevState.activeSearches !== this.state.activeSearches) {
            // since a search can start immediately after another one has ended,
            // use a timeout function to reduce the freqeuncy of events
            if (this.searchingTimeout) {
                clearTimeout(this.searchingTimeout);
            }
            this.searchingTimeout = setTimeout(() => {
                var searchingNow = !_.isEmpty(this.state.activeSearches);
                if (this.searching !== searchingNow) {
                    this.searching = searchingNow;
                    this.triggerSearchEvent(searchingNow);
                }
                this.searchingTimeout = null;
            }, 50);
        }
        if (!prevProps.hasConnection && this.props.hasConnection) {
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
            Promise.map(dirtySearches, (search) => {
                // prefetching was cancelled
                if (this.prefetchTimeout !== prefetchTimeout) {
                    return false;
                }
                if (!search.dirty) {
                    return false;
                }
                console.log('Prefetching', getSearchQuery(search));
                return this.searchRemoteDatabase(search, true);
            }, { concurrency: 4 });
        }, 1000);
    },

    /**
     * Stop updating recent searches
     */
    stopPrefetch: function() {
        if (this.prefetchTimeout) {
            clearTimeout(this.prefetchTimeout);
            this.prefetchTimeout = null;
        }
    }
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

/**
 * Return the current time as a ISO string
 *
 * @return {String}
 */
function getCurrentTime() {
    var now = new Date;
    return now.toISOString();
}

/**
 * Get the difference between two time in milliseconds
 *
 * @param  {Date|String|null} start
 * @param  {Date|String|null} end
 *
 * @return {Number}
 */
function getTimeElapsed(start, end) {
    if (!start) {
        return Infinity;
    }
    if (!end) {
        return 0;
    }
    var s = (typeof(start) === 'string') ? new Date(start) : start;
    var e = (typeof(end) === 'string') ? new Date(end) : end;
    return (e - s);
}

/**
 * Obtain a location object from a search object
 *
 * @param  {Object} search
 *
 * @return {Object}
 */
function getSearchLocation(search) {
    if (search.schema === 'local') {
        return _.pick(search, 'schema', 'table');
    } else {
        return _.pick(search, 'address', 'schema', 'table');
    }
}

/**
 * Obtain a query object from a search object
 *
 * @param  {Object} search
 *
 * @return {Object}
 */
function getSearchQuery(search) {
    return _.pick(search, 'address', 'schema', 'table', 'criteria', 'minimum', 'expected', 'remote', 'committed');
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

/**
 * Check if a recent search is fresh
 *
 * @param  {Object} search
 * @param  {Number} refreshInterval
 *
 * @return {Boolean}
 */
function isFresh(search, refreshInterval) {
    if (search.schema === 'local') {
        return true;
    }
    // we received a notification earlier indicate changes might have occurred
    if (search.dirty) {
        return false;
    }
    // the result hasn't been invalidated via notification
    // still, we want to check with the server once in a while
    var elapsed = getTimeElapsed(search.finish, new Date) * (1 / 1000);
    if (elapsed > refreshInterval) {
        return false;
    }
    return true;
}

/**
 * Check if there're enough cached records to warrant displaying them
 * while a remote search at takes place
 *
 * @param  {Object} search
 *
 * @return {Boolean}
 */
function isSufficientlyCached(search) {
    var minimum = search.minimum;
    if (minimum === undefined) {
        // use the expected object count
        minimum = getExpectedObjectCount(search);
    }
    if (minimum === undefined) {
        minimum = 1;
    }
    var count = search.results.length;
    if (count < minimum) {
        return false;
    }
    return true;
}

/**
 * Check if the number of object retrieved from cache meet expectation
 *
 * @param  {Object}  search
 *
 * @return {Boolean}
 */
function isMeetingExpectation(search) {
    var expected = getExpectedObjectCount(search);
    var count = search.results.length;
    if (count < expected) {
        return false;
    }
    return true;
};

/**
 * Check if cached objects are retrieved so long enough ago that a
 * server-side search is advisable
 *
 * @param  {Object} search
 * @param  {Number} refreshInterval
 *
 * @return {Boolean}
 */
function isSufficientlyRecent(search, refreshInterval) {
    if (search.schema === 'local') {
        return true;
    }
    var rtimes = _.map(search.results, 'rtime');
    var minRetrievalTime = _.min(rtimes);
    if (minRetrievalTime < SessionStartTime) {
        // one of the objects was retrieved in an earlier session
        return false;
    }
    // see how much time has elapsed
    var elapsed = getTimeElapsed(minRetrievalTime, new Date) * (1 / 1000);
    if (elapsed > refreshInterval) {
        return false;
    }
    // use the retrieval time of the oldest object as the search's finish
    // time
    search.finish = minRetrievalTime;
    return true;
}

/**
 * Return the number of object expected
 *
 * @param  {Object} search
 *
 * @return {Number|undefined}
 */
function getExpectedObjectCount(search) {
    if (typeof(search.expected) === 'number') {
        return search.expected;
    }
    if (search.criteria) {
        return countCriteria(search.criteria, 'id')
            || countCriteria(search.criteria, 'filters');
    }
}

/**
 * Count criteria of a given type
 *
 * @param  {Object} criteria
 * @param  {String} name
 *
 * @return {Number|undefined}
 */
function countCriteria(criteria, name) {
    var value = criteria[name];
    if (value != undefined) {
        if (value instanceof Array) {
            return value.length;
        } else {
            return 1;
        }
    }
}

/**
 * Return a temporary id that can be used to identify an uncommitted object
 *
 * @return {Number}
 */
function getTemporaryId() {
    var newTemporaryId = lastTemporaryId + 0.000000001;
    lastTemporaryId = newTemporaryId;
    return newTemporaryId;
}

var lastTemporaryId = 0;
