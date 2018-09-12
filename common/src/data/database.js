import _ from 'lodash';
import Promise from 'bluebird';
import HTTPERror from 'errors/http-error';

class Database {
    constructor(remoteDataSource, context) {
        this.context = context || {};
        this.remoteDataSource = remoteDataSource;
    }

    /**
     * Look for objects matching given query, merged with context, which might
     * contain the location (i.e. server, schema)
     *
     * @param  {Object} query
     *
     * @return {Promise<Array<Object>>}
     */
    find(query) {
        query = merge(this.context, query);
        return this.remoteDataSource.find(query);
    }

    /**
     * Look for one object
     *
     * @param  {Object} query
     *
     * @return {Promise<Object>}
     */
    findOne(query) {
        query = _.extend({ expected: 1 }, query);
        return this.find(query).then((objects) => {
            return objects[0] || null;
        });
    }

    /**
     * Save objects to specified location, which may be the user's computer
     * (if schema is "local") or the remote server.
     *
     * @param  {Object} location
     * @param  {Array<Object>} objects
     * @param  {Object} options
     *
     * @return {Promise<Array<Object>>}
     */
    save(location, objects, options) {
        if (process.env.NODE_ENV !== 'production') {
            if (!_.isArray(objects) || !_.every(objects, _.isObject)) {
                throw new Error('save() expects an array of objects');
            }
        }
        location = merge(this.context, location);
        return this.remoteDataSource.save(location, objects, options);
    }

    /**
     * Save one object
     *
     * @param  {Object} location
     * @param  {Object} object
     * @param  {Object} options
     *
     * @return {Promise<Object>}
     */
    saveOne(location, object, options) {
        if (process.env.NODE_ENV !== 'production') {
            if (!_.isObject(object)) {
                throw new Error('saveOne() expects an object');
            }
        }
        return this.save(location, [ object ], options).then((objects) => {
            return (objects.length > 0) ? objects[0] : null;
        });
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
        if (process.env.NODE_ENV !== 'production') {
            if (!_.isArray(objects) || !_.every(objects, _.isObject)) {
                throw new Error('remove() expects an array of objects');
            }
        }
        location = merge(this.context, location);
        return this.remoteDataSource.remove(location, objects);
    }

    /**
     * Remove one object
     *
     * @param  {Object} location
     * @param  {Object} object
     *
     * @return {Promise<Object>}
     */
    removeOne(location, object) {
        if (process.env.NODE_ENV !== 'production') {
            if (!_.isObject(object)) {
                throw new Error('removeOne() expects an object');
            }
        }
        return this.remove(location, [ object ]).then((objects) => {
            return (objects.length > 0) ? objects[0] : null;
        });
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
        location = merge(this.context, location);
        return this.remoteDataSource.await(location, object, timeout);
    }

    /**
     * Force server check on one object
     *
     * @param  {Object} location
     * @param  {Object} object
     *
     * @return {Promise<Boolean>}
     */
    refresh(location, object) {
        location = merge(this.context, location);
        return this.remoteDataSource.refresh(location, object);
    }

    /**
     * Create a new Database object with contextual variables (e.g. server, schema)
     * that are automatically added to every query or storage operation
     *
     * @param  {...Object} varSets
     *
     * @return {Database}
     */
    use(...varSets) {
        var newContext = {};
        _.assign(newContext, this.context);
        _.each(varSets, (varSet) => {
            _.assign(newContext, varSet);
        });
        return new Database(this.remoteDataSource, newContext);
    }

    /**
     * Gain authorization to data source at given location (which might be set
     * by use() earlier) then return the user id
     *
     * @param  {Object|undefined} location
     *
     * @return {Promise<Number>}
     */
    start(location) {
        location = merge(this.context, location);
        return this.remoteDataSource.start(location);
    }

    /**
     * Create a session and retrieve information about the remote server,
     * including a list of OAuth providers
     *
     * @param  {String} area
     *
     * @return {Promise<Object>}
     */
    beginSession(area) {
        return this.remoteDataSource.beginSession(this.context, area);
    }

    /**
     * Query server to see if authorization has been granted
     *
     * @return {Promise<Boolean>}
     */
    checkSession() {
        return this.remoteDataSource.checkSession(this.context);
    }

    /**
     * Return true if the current user has access to the remote database
     *
     * @return {Boolean}
     */
    hasAuthorization() {
        return this.remoteDataSource.hasAuthorization(this.context);
    }


    /**
     * Authenticate user through username and password
     *
     * @param  {Object} credentials
     *
     * @return {Promise<Boolean>}
     */
    authenticate(credentials) {
        return this.remoteDataSource.authenticate(this.context, credentials);
    }

    /**
     * Remove authorization
     *
     * @return {Promise<Boolean>}
     */
    endSession() {
        return this.remoteDataSource.endSession(this.context);
    }

    /**
     * Create a session for a mobile device (on browser)
     *
     * @return {Promise<String>}
     */
    beginMobileSession() {
        return this.remoteDataSource.beginMobileSession(this.context);
    }

    /**
     * Acquired a session created earlier through a web-browser (on mobile device)
     *
     * @param  {String} handle
     *
     * @return {Promise<Number>}
     */
    acquireMobileSession(handle) {
        return this.remoteDataSource.acquireMobileSession(this.context, handle);
    }

    /**
     * Release the session created for a mobile device (on browser)
     *
     * @return {Promise}
     */
    releaseMobileSession() {
        return this.remoteDataSource.releaseMobileSession(this.context);
    }

    /**
     * Remove authorization from mobile device
     *
     * @param  {String} handle
     */
    endMobileSession(handle) {
        return this.remoteDataSource.endMobileSession(this.context, handle);
    }

    /**
     * Return an URL for testing OAuth integration or gaining API access
     *
     * @param  {Object} oauthServer
     * @param  {String} type
     *
     * @return {String}
     */
    getOAuthURL(oauthServer, type) {
        return this.remoteDataSource.getOAuthURL(this.context, oauthServer, type);
    }

    /**
     * Return the temporary used to reference an object prior to it being saved
     *
     * @param  {Object} location
     * @param  {Number} id
     *
     * @return {Number|undefined}
     */
    findTemporaryID(location, id) {
        location = merge(this.context, location);
        return this.remoteDataSource.findTemporaryID(location, id);
    }

    /**
     * Return the permanent ID assigned to an object after saving
     *
     * @param  {Object} location
     * @param  {Number} id
     *
     * @return {Number|undefined}
     */
    findPermanentID(location, id) {
        location = merge(this.context, location);
        return this.remoteDataSource.findPermanentID(location, id);
    }
}

function merge(context, query) {
    return _.assign({}, context, query);
}

export {
    Database as default,
    Database,
};
