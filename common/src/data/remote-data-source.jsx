var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Moment = require('moment');

var HttpRequest = require('transport/http-request');
var HttpError = require('errors/http-error');
var LocalSearch = require('data/local-search');
var SessionStartTime = require('data/session-start-time');

module.exports = React.createClass({
    displayName: 'RemoteDataSource',
    propTypes: {
        refreshInterval: PropTypes.number,
        basePath: PropTypes.string,
        discoveryFlags: PropTypes.object,
        retrievalFlags: PropTypes.object,
        cache: PropTypes.object,

        onChange: PropTypes.func,
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
        };
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            recentSearchResults: [],
            recentStorageResults: [],
            recentRemovalResults: [],
        };
    },

    getServerAddress: function(location) {
        return location.address;
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
    beginAuthorization: function(location, area) {
        var address = this.getServerAddress(location);
        var session = getSession(address);
        if (!session.authorizationPromise) {
            var url = `${address}/auth/session`;
            var options = { responseType: 'json', contentType: 'json' };
            session.authorizationPromise = HttpRequest.fetch('POST', url, { area }, options).then((res) => {
                session.authentication = res.authentication;
                // return login information to caller
                return {
                    system: res.system,
                    providers: res.providers,
                };
            }).catch((err) => {
                // clear the promise if it fails
                session.authorizationPromise = null;
                throw err;
            });
        }
        return session.authorizationPromise;
    },

    /**
     * Query server to see if authorization has been granted and if so,
     * trigger the onAuthorization event
     *
     * @param  {Object} location
     *
     * @return {Promise<Boolean>}
     */
    checkAuthorizationStatus: function(location) {
        var address = this.getServerAddress(location);
        var session = getSession(address);
        if (!session.authentication) {
            return Promise.resolve(false);
        }
        var token = session.authentication.token;
        var url = `${address}/auth/session/${token}`;
        var options = { responseType: 'json' };
        return HttpRequest.fetch('GET', url, {}, options).then((res) => {
            var authorization = res.authorization;
            if (authorization) {
                session.authorization = authorization;
                this.triggerAuthorizationEvent(address, authorization);
                return true;
            } else {
                return false;
            }
        }).catch((err) => {
            // clear the promise if the session has disappeared
            session.authorizationPromise = null;
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
     * @return {Promise<Boolean>}
     */
    submitPassword: function(location, username, password) {
        var address = this.getServerAddress(location);
        var session = getSession(address);
        if (!session.authentication) {
            return Promise.resolve(false);
        }
        var token = session.authentication.token;
        var url = `${address}/auth/htpasswd`;
        var payload = { token, username, password };
        var options = { responseType: 'json', contentType: 'json' };
        return HttpRequest.fetch('POST', url, payload, options).then((res) => {
            var authorization = res.authorization;
            if (authorization) {
                session.authorization = authorization;
                this.triggerAuthorizationEvent(address, authorization);
                return true;
            } else {
                return false;
            }
        }).catch((err) => {
            // clear the promise if the session has disappeared
            session.authorizationPromise = null;
            throw err;
        });
    },

    /**
     * Remove authorization
     *
     * @param  {Object} location
     *
     * @return {Promise<Boolean>}
     */
    endAuthorization: function(location) {
        var address = this.getServerAddress(location);
        var session = getSession(address);
        if (!session.authorization) {
            return Promise.resolve(false);
        }
        var token = session.authorization.token;
        var url = `${address}/auth/session/${token}/end`;
        var options = { responseType: 'json', contentType: 'json' };
        return HttpRequest.fetch('POST', url, {}, options).then(() => {
            session.authentication = null;
            session.authorizationPromise = null;
            session.authorization = null;
            this.clearRecentSearches(address);
            this.clearCachedObjects(address);
            this.triggerExpirationEvent(address);
            return true;
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
    getOAuthUrl: function(location, oauthServer, type) {
        var address = this.getServerAddress(location);
        var session = getSession(address);
        if (!session.authorization) {
            return '';
        }
        var token = session.authorization.token;
        var query = `sid=${oauthServer.id}&token=${token}`;
        if (type === 'activation') {
            query += '&activation=1';
        } else if (type === 'test') {
            query += '&test=1';
        }
        var url = `${address}/auth/${oauthServer.type}?${query}`;
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
        var address = this.getServerAddress(location);
        var session = getSession(address);
        if (session.authorization) {
            return true;
        } else {
            return false;
        }
    },

    /**
     * Add authorization info that was retrieved earlier
     *
     * @param  {Object} location
     * @param  {Object} authorization
     */
    addAuthorization: function(location, authorization) {
        var address = this.getServerAddress(location);
        var session = getSession(address);
        session.authorization = authorization;
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
            var address = this.getServerAddress(location);
            var session = getSession(address);
            if (session.authorization) {
                return session.authorization.user_id;
            } else {
                throw new HttpError(401);
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
            var recentSearchResults = _.slice(this.state.recentSearchResults);
            recentSearchResults.unshift(search);
            while (recentSearchResults.length > 256) {
                recentSearchResults.pop();
            }
            this.setState({ recentSearchResults });
        }
        if (required && query.expected) {
            return search.promise.then((results) => {
                if (results.length < query.expected) {
                    this.triggerStupefactionEvent(query, results);
                    throw new HttpError(404);
                }
                return results;
            });
        } else {
            return search.promise;
        }
    },

    /**
     * Save objects to specified location, which may be the user's computer
     * (if schema is "local") or the remote server.
     *
     * @param  {Object} location
     * @param  {Array<Object>} objects
     *
     * @return {Promise<Array<Object>>}
     */
    save: function(location, objects) {
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
            return this.storeRemoteObjects(location, objects).then((objects) => {
                var endTime = getCurrentTime();
                this.updateCachedObjects(location, objects);
                this.updateRecentSearchResults(location, objects);
                this.triggerChangeEvent();

                var recentStorageResults = _.clone(this.state.recentStorageResults);
                recentStorageResults.unshift({
                    start: startTime,
                    finish: endTime,
                    duration: getTimeElapsed(startTime, endTime),
                    results: objects,
                    by: byComponent,
                });
                while (recentStorageResults.length > 32) {
                    recentStorageResults.pop();
                }
                this.setState({ recentStorageResults });
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
            return this.storeRemoteObjects(location, objects).then((objects) => {
                var endTime = getCurrentTime();
                this.removeCachedObjects(location, objects);
                this.removeFromRecentSearchResults(location, objects);
                this.triggerChangeEvent();

                var recentRemovalResults = _.clone(this.state.recentRemovalResults);
                recentRemovalResults.unshift({
                    start: startTime,
                    finish: endTime,
                    duration: getTimeElapsed(startTime, endTime),
                    results: objects,
                    by: byComponent,
                });
                while (recentRemovalResults.length > 32) {
                    recentRemovalResults.pop();
                }
                this.setState({ recentRemovalResults });
                return objects;
            });
        }
    },

    /**
     * Invalidate queries based on changes
     *
     * @param  {String} address
     * @param  {Object} changes
     *
     * @return {Boolean}
     */
    invalidate: function(address, changes) {
        var changed = false;
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
        if (changed) {
            // tell data consuming components to rerun their queries
            // initially, they'd all get the data they had before
            // another change event will occur if new objects are
            // actually retrieved from the remote server
            this.triggerChangeEvent();
        }
        return changed;
    },

    /**
     * Remove recent searches on schema
     *
     * @param  {String} address
     * @param  {String} schema
     */
    clear: function(address, schema) {
        var recentSearchResults = _.filter(this.state.recentSearchResults, (search) => {
            if (_.isMatch(search, { address, schema })) {
                return false;
            }
            return true;
        });
        this.setState({ recentSearchResults });
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
     * @param  {String} address
     * @param  {Object} credentials
     */
    triggerAuthorizationEvent: function(address, credentials) {
        if (this.props.onAuthorization) {
            this.props.onAuthorization({
                type: 'authorization',
                target: this,
                address,
                credentials,
            });
        }
    },

    /**
     * Inform parent component that saved credentials are no longer valid
     *
     * @param  {String} address
     */
    triggerExpirationEvent: function(address) {
        if (this.props.onExpiration) {
            this.props.onExpiration({
                type: 'expiration',
                target: this,
                address,
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
                type: 'missingobject',
                target: this,
                query,
                results,
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
        var index = _.findIndex(this.state.recentSearchResults, (search) => {
            var searchQuery = getSearchQuery(search);
            return _.isEqual(query, searchQuery);
        });
        if (index !== -1) {
            // move the matching search to the top
            var searchResultsAfter = _.slice(this.state.recentSearchResults);
            var search = searchResultsAfter[index];
            searchResultsAfter.splice(index, 1);
            searchResultsAfter.unshift(search);
            this.setState({ recentSearchResults: searchResultsAfter });
            return search;
        } else {
            return null;
        }
    },

    /**
     * Perform a search on the server sude
     *
     * @param  {Object} search
     *
     * @return {Promise<Boolean>}
     */
    searchRemoteDatabase: function(search) {
        if (search.schema === 'local') {
            return Promise.resolve(false);
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
                return this.retrieveRemoteObjects(location, idsUpdated).then((retrieval) => {
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

            // update this.state.recentSearchResults
            var recentSearchResults = _.slice(this.state.recentSearchResults);
            this.setState({ recentSearchResults });

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
     *
     * @return {Promise<Array<Object>>}
     */
    retrieveRemoteObjects: function(location, ids) {
        return this.performRemoteAction(location, 'retrieval', { ids });
    },

    /**
     * Save objects to remote database
     *
     * @param  {Object} location
     * @param  {Array<Object>} objects
     *
     * @return {Promise<Array<Object>>}
     */
    storeRemoteObjects: function(location, objects) {
        return this.performRemoteAction(location, 'storage', { objects });
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
        var address = this.getServerAddress(location);
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
        if (session.authorization) {
            payload.token = session.authorization.token;
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
        return HttpRequest.fetch('POST', url, payload, options).then((result) => {
            return result;
        }).catch((err) => {
            if (err.statusCode === 401) {
                clearSession(address);
                this.clearRecentSearches(address);
                this.clearCachedObjects(address);
                this.triggerExpirationEvent(address);
                this.triggerChangeEvent();
            } else if (err.statusCode == 403) {
                this.clearRecentSearches(address);
                this.clearCachedObjects(address);
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
     * @return {Promise<Array<Object>>}
     */
    searchLocalCache: function(search) {
        var cache = this.props.cache;
        if (!cache) {
            return false;
        }
        var query = getSearchQuery(search);
        return cache.find(search).then((objects) => {
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
        return cache.clean({ address });
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
                if (match) {
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
        return _.filter(this.state.recentSearchResults, (search) => {
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
        var recentSearchResults = _.filter(this.state.recentSearchResults, (search) => {
            if (search.address === address) {
                return false;
            }
            return true;
        });
        this.setState({ recentSearchResults });
    },

    /**
     * Creation interval function to check for session expiration
     */
    componentWillMount: function() {
        this.sessionCheckTimeout = setInterval(() => {
            var expiredSessions = getExpiredSessions();
            if (!_.isEmpty(expiredSessions)) {
                _.forIn(expiredSessions, (session, address) => {
                    clearSession(address);
                });
                this.triggerChangeEvent();
            }
        }, 5 * 60 * 1000);
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
     * Clear session check interval function
     */
    componentWillUnmount: function() {
        clearInterval(this.sessionExpirationCheckInterval);
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
    return _.pick(search, 'address', 'schema', 'table', 'criteria', 'minimum', 'expected');
}

var sessions = {};

/**
 * Obtain object where authorization info for a server is stored
 *
 * @param  {String} address
 *
 * @return {Object}
 */
function getSession(address) {
    var session = sessions[address];
    if (!session) {
        session = sessions[address] = {};
    }
    return session;
}

/**
 * Return sessions that hasn't been granted authorization and have expired
 *
 * @return {Object}
 */
function getExpiredSessions() {
    var now = Moment().toISOString();
    return _.pickBy(sessions, (session) => {
        if (session && !session.authorization) {
            if (session.authentication && session.authentication.expire < now) {
                return true;
            }
        }
    });
}

/**
 * Remove authorization to a server
 *
 * @param  {String} address
 */
function clearSession(address) {
    sessions[address] = null;
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
