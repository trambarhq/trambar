var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;

var HttpRequest = require('transport/http-request');
var HttpError = require('errors/http-error');
var LocalSearch = require('data/local-search');
var Locale = require('locale/locale');

var IndexedDBCache = (process.env.PLATFORM === 'browser') ? require('data/indexed-db-cache') : null;
var SQLiteCache = (process.env.PLATFORM === 'cordova') ? require('data/sqlite-cache') : null;
var LocalCache = IndexedDBCache || SQLiteCache;

var WebsocketNotifier = (process.env.PLATFORM === 'browser') ? require('transport/websocket-notifier') : null;
var PushNotifier = (process.env.PLATFORM === 'cordova') ? require('transport/push-notifier') : null;
var Notifier = WebsocketNotifier || PushNotifier;

var ComponentRefs = require('utils/component-refs');

module.exports = React.createClass({
    displayName: 'RemoteDataSource',
    propTypes: {
        refreshInterval: PropTypes.number,
        cacheName: PropTypes.string.isRequired,
        urlPrefix: PropTypes.string,
        retrievalFlags: PropTypes.object,
        locale: PropTypes.instanceOf(Locale),
        onChange: PropTypes.func,
        onAuthorization: PropTypes.func,
        onExpiration: PropTypes.func,
        onAlertClick: PropTypes.func,
    },
    components: ComponentRefs({
        cache: LocalCache,
        notifier: Notifier,
    }),

    getDefaultProps: function() {
        return {
            refreshInterval: 15 * 60,
            urlPrefix: '',
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

    beginAuthorization: function(location, area) {
        var session = getSession(location.server);
        if (!session.authorizationPromise) {
            var server = location.server;
            var protocol = location.protocol;
            var url = `${protocol}//${server}/auth/session`;
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

    checkAuthorizationStatus: function(location) {
        var session = getSession(location.server);
        var token = session.authentication.token;
        var server = location.server;
        var protocol = location.protocol;
        var url = `${protocol}//${server}/auth/session/${token}`;
        var options = { responseType: 'json' };
        return HttpRequest.fetch('GET', url, {}, options).then((res) => {
            var authorization = res.authorization;
            if (authorization) {
                session.authorization = authorization;
                this.triggerAuthorizationEvent(server, authorization);
                return true;
            } else {
                return false;
            }
        }).catch((err) => {
            // clear the promise if the session has disappeared
            session.authorizationPromise = null;
            throw err;
        });;
    },

    getActivationLink: function(location, oauthServerType, oauthServerId) {
        var session = getSession(location.server);
        var token = session.authorization.token;
        var server = location.server;
        var protocol = location.protocol;
        var query = `activation=1&sid=${oauthServerId}&token=${token}`;
        var url = `${protocol}//${server}/auth/${oauthServerType}?${query}`;
        return url;
    },

    hasAuthorization: function(server, schema) {
        var session = getSession(server);
        if (session.authorization) {
            if (schema) {
                return _.includes(session.authorization.scope, schema);
            } else {
                return true;
            }
        }
        return false;
    },

    addAuthorization: function(server, authorization) {
        var session = getSession(server);
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
            var session = getSession(location.server);
            if (session.authorization) {
                var notifier = this.components.notifier;
                if (notifier) {
                    var protocol = location.protocol;
                    var server = location.server;
                    var token = session.authorization.token;
                    notifier.connect(protocol, server, token).catch((err) => {
                        console.error(`Unable to establish WebSocket connection: ${server}`);
                    });
                }
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
        query = getSearchQuery(query);
        var recentSearch = this.findRecentSearch(query, byComponent);
        if (recentSearch) {
            this.checkSearchFreshness(recentSearch);
            return recentSearch.promise;
        } else {
            var newSearch = this.addSearch(query, byComponent);
            return newSearch.promise;
        }
    },

    save: function(location, objects) {
        var startTime = getCurrentTime();
        var byComponent = _.get(location, 'by.constructor.displayName',)
        location = getSearchLocation(location);
        if (location.schema === 'local') {
            return this.storeLocalObjects(location, objects);
        } else {
            return this.storeRemoteObjects(location, objects).then((objects) => {
                var endTime = getCurrentTime();
                _.each(objects, (object) => {
                    object.startTime = startTime;
                });
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

    remove: function(location, objects) {
        var startTime = getCurrentTime();
        var byComponent = _.get(location, 'by.constructor.displayName',)
        location = getSearchLocation(location);
        if (location.schema === 'local') {
            this.removeLocalObjects(location, objects);
        } else {
            // set the deleted flag
            objects = _.map(objects, (object) => {
                object = _.clone(object);
                object.deleted = true;
                return object;
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
     * @param  {String} server
     * @param  {Object} credentials
     */
    triggerAuthorizationEvent: function(server, credentials) {
        if (this.props.onAuthorization) {
            return this.props.onAuthorization({
                type: 'authorization',
                target: this,
                server: server,
                credentials: credentials,
            });
        }
    },

    /**
     * Inform parent component that saved credentials are no longer valid
     *
     * @param  {String} server
     */
    triggerExpirationEvent: function(server) {
        if (this.props.onExpiration) {
            return this.props.onExpiration({
                type: 'expiration',
                target: this,
                server: server,
            });
        }
    },

    /**
     * Look for a recent search that has the same criteria
     *
     * @param  {Object} query
     * @param  {String} byComponent
     *
     * @return {Object|null}
     */
    findRecentSearch: function(query, byComponent) {
        var index = _.findIndex(this.state.recentSearchResults, (search) => {
            var searchQuery = getSearchQuery(search);
            return _.isEqual(query, searchQuery);
        });
        if (index !== -1) {
            // move the matching search to the top
            var searchResultsAfter = _.slice(this.state.recentSearchResults);
            var search = searchResultsAfter[index];
            if (byComponent) {
                // add the component to the "by" array so we can figure out
                // who requested the data
                if (!_.includes(search.by, byComponent)) {
                    search.by.push(byComponent);
                }
            }
            searchResultsAfter.splice(index, 1);
            searchResultsAfter.unshift(search);
            this.setState({ recentSearchResults: searchResultsAfter });
            return search;
        } else {
            return null;
        }
    },

    /**
     * Add search to list of recent searches
     *
     * @param  {Objet} query
     * @param  {String} byComponent
     *
     * @return {Object}
     */
    addSearch: function(query, byComponent) {
        var search = _.extend({}, query, {
            start: null,
            finish: null,
            results: null,
            promise: null,
            by: byComponent ? [ byComponent ] : [],
            dirty: false,
        });
        search.promise = this.searchLocalCache(search).then(() => {
            if (this.checkSearchValidity(search)) {
                // there are enough records to warrent the immediate display
                // of locally cached results
                return search.results;
            } else {
                // not enough cached data--wait for what we'll get from the server
                return this.searchRemoteDatabase(search).then(() => {
                    return search.results;
                });
            }
        });
        // save the search
        var recentSearchResults = _.slice(this.state.recentSearchResults);
        recentSearchResults.unshift(search);
        while (recentSearchResults.length > 256) {
            recentSearchResults.pop();
        }
        this.setState({ recentSearchResults });
        return search;
    },

    checkSearchFreshness: function(search) {
        if (search.schema === 'local') {
            return true;
        }
        if (!search.dirty) {
            // the result hasn't been invalidated via notification
            // still, we want to check with the server once in a while
            var elapsed = getTimeElapsed(search.finish, new Date);
            var interval = this.props.refreshInterval * 1000;
            if (!(elapsed > interval)) {
                //console.log('checkSearchFreshness: true');
                return true;
            }
        }
        // need to check the server
        this.searchRemoteDatabase(search).then((changed) => {
            if (changed) {
                this.triggerChangeEvent();
            }
        });
        //console.log('checkSearchFreshness: false');
        return false;
    },

    checkSearchValidity: function(search) {
        if (search.schema === 'local') {
            return true;
        }
        var minimum = search.minimum || 1;
        var expected = getExpectedObjectCount(search.criteria);
        if (minimum < expected) {
            minimum = expected;
        }
        var count = search.results.length;
        if (count < minimum) {
            //console.log('checkSearchValidity: false');
            return false;
        }
        // we have the minimum number of objects requested
        // now see if we can omit a check with at server
        var searchRemotely = false;
        if (count === expected) {
            // we have the right number of objects, see if any of them is
            // retrieved so long enough ago that a server-side search is advisable
            // (in the event that notification is malfunctioning)
            var interval = this.props.refreshInterval * 1000;
            var rtimes = _.map(search.results, 'rtime');
            var minRetrievalTime = _.min(rtimes);
            if (minRetrievalTime < sessionStartTime) {
                // one of the objects was retrieved in an earlier session
                searchRemotely = true;
            } else {
                // see how much time has elapsed
                var elapsed = getTimeElapsed(minRetrievalTime, new Date);
                if (elapsed > interval) {
                    searchRemotely = true;
                } else {
                    search.finish = minRetrievalTime;
                    searchRemotely = false;
                }
            }
        } else {
            searchRemotely = true;
        }
        if (searchRemotely) {
            this.searchRemoteDatabase(search).then((changed) => {
                if (changed) {
                    this.triggerChangeEvent();
                }
            });
        }
        return true;
    },

    searchRemoteDatabase: function(search) {
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

    discoverRemoteObjects: function(query) {
        var location = getSearchLocation(query);
        return this.performRemoteAction(location, 'discovery', query.criteria);
    },

    retrieveRemoteObjects: function(location, ids) {
        return this.performRemoteAction(location, 'retrieval', { ids });
    },

    storeRemoteObjects: function(location, objects) {
        return this.performRemoteAction(location, 'storage', { objects });
    },

    performRemoteAction: function(location, action, payload) {
        var server = location.server;
        var protocol = location.protocol;
        var prefix = this.props.urlPrefix;
        var schema = location.schema;
        var table = location.table;
        var url = `${protocol}//${server}${prefix}/data/${action}/${schema}/${table}/`;
        var session = getSession(location.server);
        payload = _.clone(payload);
        payload.token = session.authorization.token;
        if (action === 'retrieval' || action === 'storage') {
            _.assign(payload, this.props.retrievalFlags);
        }
        var options = {
            contentType: 'json',
            responseType: 'json',
        };
        return HttpRequest.fetch('POST', url, payload, options).then((result) => {
            return result;
        }).catch((err) => {
            if (err.statusCode === 403) {
                this.triggerExpirationEvent(location.server);
            }
            throw err;
        });
    },

    storeLocalObjects: function(location, objects) {
        var cache = this.components.cache;
        if (!cache) {
            throw new Error('No local cache');
        }
        return cache.save(location, objects);
    },

    removeLocalObjects: function(location, objects) {
        var cache = this.components.cache;
        if (!cache) {
            throw new Error('No local cache');
        }
        return cache.remove(location, objects);
    },

    searchLocalCache: function(search) {
        var cache = this.components.cache;
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

    updateCachedObjects: function(location, objects) {
        var cache = this.components.cache;
        if (!cache) {
            return false;
        }
        return cache.save(location, objects).then((objects) => {
            return true;
        }).catch((err) => {
            console.error(err);
            return false;
        });
    },

    removeCachedObjects: function(location, objects) {
        var cache = this.components.cache;
        if (!cache) {
            return false;
        }
        return cache.remove(location, objects).then((objects) => {
            return true;
        }).catch((err) => {
            console.error(err);
            return false;
        });
    },

    updateRecentSearchResults: function(location, objects) {
        var relevantSearches = this.getRelevantRecentSearches(location);
        _.each(relevantSearches, (search) => {
            _.each(objects, (object) => {
                var index = _.sortedIndexBy(search.results, object, 'id');
                var target = search.results[index];
                var present = (target && target.id === object.id);
                var match = LocalSearch.match(search.table, object, search.criteria);
                if (target || match) {
                    // create new array so memoized functions won't return old results
                    search.results = _.slice(search.results);
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
                    search.promise = Promise.resolve(search.results);
                }
            });
        });
    },

    removeFromRecentSearchResults: function(location, objects) {
        var relevantSearches = this.getRelevantRecentSearches(location);
        _.each(relevantSearches, (search) => {
            _.each(objects, (object) => {
                var index = _.sortedIndexBy(search.results, object, 'id');
                var target = search.results[index];
                var present = (target && target.id === object.id);
                if (present) {
                    // remove object from the list as it no longer
                    // meets the criteria
                    search.results = _.slice(search.results);
                    search.results.splice(index, 1);
                    search.promise = Promise.resolve(search.results);
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

    render: function() {
        return (
            <div>
                {this.renderLocalCache()}
                {this.renderNotifier()}
            </div>
        );
    },

    renderLocalCache: function() {
        var setters = this.components.setters;
        if (LocalCache.isAvailable()) {
            var cacheProps = {
                ref: setters.cache,
                databaseName: this.props.cacheName,
            };
            return <LocalCache {...cacheProps} />;
        }
    },

    renderNotifier: function() {
        var setters = this.components.setters;
        if (Notifier.isAvailable()) {
            var notifierProps = {
                ref: setters.notifier,
                locale: this.props.locale,
                onNotify: this.handleChangeNotification,
                onAlertClick: this.props.onAlertClick,
            };
            return <Notifier {...notifierProps} />;
        }
    },

    componentDidMount: function() {
        this.triggerChangeEvent();
    },

    handleChangeNotification: function(evt) {
        var changed = false;
        _.forIn(evt.changes, (idList, name) => {
            var parts = _.split(name, '.');
            var location = {
                protocol: evt.protocol,
                server: evt.server,
                schema: parts[0],
                table: parts[1]
            };
            var relevantSearches = this.getRelevantRecentSearches(location);
            _.each(relevantSearches, (search) => {
                var dirty = false;
                var expectedCount = getExpectedObjectCount(search.criteria);
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
                    // we can't tell if new objects won't sudden show up
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
    },
});

var authCache = {};

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

function getRemovalList(ids, gns, objects) {
    var removal = [];
    _.each(objects, (object) => {
        if (!_.includes(ids, object.id)) {
            removal.push(object.id);
        }
    });
    return removal;
}

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

function getCurrentTime() {
    var now = new Date;
    return now.toISOString();
}

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

function getSearchLocation(search) {
    return _.pick(search, 'protocol', 'server', 'schema', 'table');
}

function getSearchQuery(search) {
    return _.pick(search, 'protocol', 'server', 'schema', 'table', 'criteria');
}

var sessions = {};

function getSession(server) {
    var session = sessions[server];
    if (!session) {
        session = sessions[server] = {};
    }
    return session;
}

function getExpectedObjectCount(criteria) {
    if (criteria.hasOwnProperty('id')) {
        var ids = criteria.id;
        if (ids instanceof Array) {
            return ids.length;
        } else if (typeof(ids) === 'number') {
            return ids > 0 ? 1 : 0;
        }
    }
}

var sessionStartTime = (new Date).toISOString();
