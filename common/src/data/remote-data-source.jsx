var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;

var HttpRequest = require('transport/http-request');

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
        onChange: PropTypes.func,
        onAuthRequest: PropTypes.func,
    },
    components: ComponentRefs({
        cache: LocalCache,
        notifier: Notifier,
    }),

    getDefaultProps: function() {
        return {
            refreshInterval: 15 * 60,
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
        };
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
            var server = getServerName(location);
            if (!server) {
                throw new Error('No server specified');
            }
            var authCacheEntry = authCache[server];
            if (authCacheEntry) {
                return authCacheEntry.user_id;
            }
            return this.triggerAuthRequest(server).then((credentials) => {
                // use the cached authorization token
                if (credentials.user_id && credentials.token) {
                    return credentials;
                } else {
                    return this.authorizeUser(location, credentials).then((authorization) => {
                        authCache[server] = authorization;
                        return authorization;
                    });
                }
            }).then((authorization) => {
                var notifier = this.components.notifier;
                if (notifier) {
                    var protocol = getProtocol(server);
                    notifier.connect(protocol, server, authorization.token);
                }
                return authorization.user_id;
            });
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
        var recentSearch = this.findRecentSearch(query);
        if (recentSearch) {
            this.checkSearchFreshness(recentSearch);
            return recentSearch.promise;
        } else {
            var newSearch = this.addSearch(query);
            return newSearch.promise;
        }
    },

    save: function(location, objects) {
        var rtime = getCurrentTime();
        return this.storeRemoteObjects(location, objects).then((objects) => {
            _.each(objects, (object) => {
                object.rtime = rtime;
            });
            this.updateCachedObjects(location, objects);
            return objects;
        });
    },

    remove: function(location, objects) {
        objects = _.map(objects, (object) => {
            object = _.clone(object);
            object.deleted = true;
            return object;
        });
        return this.storeRemoteObjects(location, objects).then((objects) => {
            this.removeCachedObjects(location, objects);
            return objects;
        });
    },

    triggerChangeEvent: function() {
        if (this.props.onChange) {
            this.props.onChange({
                type: 'change',
                target: this,
            });
        }
    },

    /**
     * Trigger the onAuthRequest handler in order to obtain user
     * authentication info from parent component
     *
     * @param  {String} server
     *
     * @return {Promise<Object>}
     */
    triggerAuthRequest: function(server) {
        if (this.props.onAuthRequest) {
            return this.props.onAuthRequest({
                type: 'auth_request',
                target: this,
                server: server
            });
        } else {
            return Promise.reject(new Error('onAuthRequest is not set'));
        }
    },

    findRecentSearch: function(query) {
        // remove "by"
        var baseQuery = getSearchQuery(query);
        var index = _.findIndex(this.state.recentSearchResults, (search) => {
            var searchQuery = getSearchQuery(search);
            return _.isEqual(baseQuery, searchQuery);
        });
        if (index !== -1) {
            // move the matching search to the top
            var searchResultsAfter = _.slice(this.state.recentSearchResults);
            var search = searchResultsAfter[index];
            // add the component to the "by" array so we can figure out
            // who requested the data
            var byComponent = _.get(query, 'by.constructor.displayName',)
            if (byComponent) {
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

    replaceRecentSearch: function(before, after) {
        var searchResultsAfter = _.slice(this.state.recentSearchResults);
        var index = (before) ? _.indexOf(searchResultsAfter, before) : -1;
        if (index !== -1) {
            searchResultsAfter[index] = after;
        } else {
            searchResultsAfter.unshift(after);
        }
        while (searchResultsAfter.length > 256) {
            searchResultsAfter.pop();
        }
        this.setState({ recentSearchResults: searchResultsAfter });
    },

    addSearch: function(query) {
        var search = _.extend({}, query, {
            start: null,
            finish: null,
            results: null,
            promise: null,
            by: [],
            dirty: false,
        });
        var byComponent = _.get(query, 'by.constructor.displayName',)
        if (byComponent) {
            search.by.push(byComponent);
        }
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
        this.replaceRecentSearch(null, search);
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
            var interval = this.props.refreshInterval * 1000;
            var rtimes = _.map(search.results, 'rtime');
            var minRetrievalTime = _.min(rtimes);
            var elapsed = getTimeElapsed(minRetrievalTime, new Date);
            if (elapsed > interval) {
                searchRemotely = true;
            } else {
                search.finish = minRetrievalTime;
                searchRemotely = false;
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
        //console.log('checkSearchValidity: true');
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
            this.replaceRecentSearch(search, _.clone(search));

            // update retrieval time and save to cache
            var rtime = search.finish;
            _.each(search.results, (object) => {
                object.rtime = rtime;
            });
            this.updateCachedObjects(location, search.results);
            return !!newResults;
        });
    },

    authorizeUser: function(location, credentials) {
        var server = getServerName(location);
        var protocol = getProtocol(server);
        var url = `${protocol}://${server}/api/authorization/`;
        var payload = credentials;
        var options = {
            contentType: 'json',
            responseType: 'json',
        };
        return HttpRequest.fetch('POST', url, credentials, options).then((result) => {
            console.log(result);
            return result;
        });
    },

    discoverRemoteObjects: function(query) {
        var server = getServerName(query);
        var protocol = getProtocol(server);
        var schema = query.schema;
        var table = query.table;
        var url = `${protocol}://${server}/api/discovery/${schema}/${table}/`;
        var payload = _.clone(query.criteria);
        payload.token = getAuthToken(server);
        var options = {
            contentType: 'json',
            responseType: 'json',
        };
        //console.log(`Discovery: ${table}`);
        return HttpRequest.fetch('POST', url, payload, options).then((result) => {
            return result;
        });
    },

    retrieveRemoteObjects: function(location, ids) {
        var server = getServerName(location);
        var protocol = getProtocol(server);
        var schema = location.schema;
        var table = location.table;
        var url = `${protocol}://${server}/api/retrieval/${schema}/${table}/`;
        var payload = { ids };
        payload.token = getAuthToken(server);
        var options = {
            contentType: 'json',
            responseType: 'json',
        };
        //console.log(`Retrieval: ${table}`);
        return HttpRequest.fetch('POST', url, payload, options).then((result) => {
            return result;
        });
    },

    storeRemoteObjects: function(location, objects) {
        var server = getServerName(location);
        var protocol = getProtocol(server);
        var schema = location.schema;
        var table = location.table;
        var url = `${protocol}://${server}/api/storage/${schema}/${table}/`;
        var payload = { objects };
        payload.token = getAuthToken(server);
        var options = {
            contentType: 'json',
            responseType: 'json',
        };
        //console.log(`Storage: ${table}`);
        return HttpRequest.fetch('POST', url, payload, options).then((result) => {
            return result;
        });
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
                ref: setters.cache
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
            var schema = parts[0];
            var table = parts[1];
            _.each(this.state.recentSearchResults, (search) => {
                if (search.schema === schema && search.table === table) {
                    if (search.results) {
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
                    }
                    if (dirty) {
                        search.dirty = true;
                        changed = true;
                    }
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
        var object = objects[index];
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
        var object = objects[index];
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
    return _.pick(search, 'server', 'schema', 'table');
}

function getSearchQuery(search) {
    return _.pick(search, 'server', 'schema', 'table', 'criteria');
}

/**
 * Return auth token for server, saved earlier
 *
 * @param  {String} server
 *
 * @return {String|undefined}
 */
function getAuthToken(server) {
    var authCacheEntry = authCache[server];
    if (authCacheEntry) {
        return authCacheEntry.token;
    }
}

/**
 * Get the domain name or ip address from a location object
 *
 * @param  {Object} location
 *
 * @return {String}
 */
function getServerName(location) {
    if (location.server === '~') {
        return window.location.hostname;
    } else {
        return location.server;
    }
}

/**
 * Return 'http' if server is localhost, 'https' otherwise
 *
 * @param  {String} server
 *
 * @return {String}
 */
function getProtocol(server) {
    return /^localhost\b/.test(server) ? 'http' : 'https'    ;
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
