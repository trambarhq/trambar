var _ = require('lodash');

module.exports = {
    join,
    set,
    attach,
    multilingual,
};

/**
 * Attach a link to an external object to the object
 *
 * @param  {ExternalData} object
 * @param  {Object} link
 *
 * @return {Object}
 */
function join(object, link) {
    var links = object.external;
    if (!links) {
        links = object.external = [];
    }
    // if the object has a link attached already, return that
    var existing = _.find(links, link);
    if (existing) {
        return existing;
    }
    link = _.clone(link);
    links.push(link);
    return link;
}

/**
 * Reacquire previously imported values (stored inside link)
 *
 * @param  {ExternalData} object
 * @param  {Object} link
 *
 * @return {[type]}
 */
function reacquire(object, link) {
    var existingLink = _.find(links, link);
    var imported = existingLink.imported;
    if (!imported) {
        imported = existingLink.imported = {};
    }
    return imported;
}

/**
 * Set a property of the object
 *
 * @param {Object} object
 * @param {String} path
 * @param {*} value
 * @param {Object|undefined} options
 */
function set(object, path, value, options) {
    if (options && options.overwrite) {
        var previousImportedValues = options.overwrite;
        var currentValue = _.get(object, path);
        var previousImportedValue = _.get(previousImportedValues, path);
        if (currentValue === previousImportedValue) {
            // the value has not changed from the imported value
            // that means we aren't overwriting a change made by the user
            _.set(object, path, value);
            _.set(previousImportedValues, path, value);
        }
    } else {
        _.set(object, path, value);
    }
}

/**
 * Add or replace a resource
 *
 * @param  {ExternalData} object
 * @param  {String} type
 * @param  {Object} resource
 */
function attach(object, type, resource) {
    // attach profile image
    if (resource) {
        var res = _.extend({ type }, resource);
        var resources = getResources(object);
        var index = _.findIndex(resources, { type });
        if (index !== -1) {
            resources[index] = res;
        } else {
            resources.push(res);
        }
    }
}

function getResources(object) {
    var resources = _.get(object, 'details.resources');
    if (!resources) {
        resources = [];
        _.set(object, 'details.resources', resources);
    }
    return resources;
}

/**
 * Return a multilingual text object from a text string, assuming its language
 * matches that of the system locale
 *
 * @param  {String} langText
 *
 * @return {Object}
 */
function multilingual(langText) {
    var text = {};
    text[lang] = langText;
    return text;
}

var lang = (process.env.LANG || 'en-US').substr(0, 2);
