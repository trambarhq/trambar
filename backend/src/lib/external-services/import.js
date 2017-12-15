var _ = require('lodash');

module.exports = {
    join,
    reacquire,
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
 * Return the previously imported values stored in the link object, adding the
 * link where there isn't one
 *
 * @param  {ExternalData} object
 * @param  {Object} link
 * @param  {String} objectName
 *
 * @return {Object}
 */
function reacquire(object, link, objectName) {
    var attachedLink = join(object, link);
    var object = attachedLink[objectName];
    if (!object) {
        throw new Error(`Link does not contain ${objectName}`);
    }
    var imported = object.imported;
    if (!imported) {
        imported = object.imported = {};
    }
    return imported;
}

/**
 * Set object property if its current value is the same as previously imported
 * (if not, then it was changed)
 *
 * @param  {ExternalData} object
 * @param  {Object} imported
 * @param  {String} name
 * @param  {*} value
 *
 * @return {[type]}
 */
function set(object, imported, path, value) {
    var currentValue = _.get(object, path);
    var importedValue = _.get(imported, path);
    if (_.isEqual(currentValue, importedValue)) {
        _.set(object, path, value);
        _.set(imported, path, value);
    } else {
        _.set(imported, path, value);
    }
}

/**
 * Add or replace a resource if was previously imported
 *
 * @param  {ExternalData} object
 * @param  {Object} imported
 * @param  {String} type
 * @param  {Object} resource
 */
function attach(object, imported, type, resource) {
    // attach profile image
    if (resource) {
        var res = _.extend({ type }, resource);
        var currentResources = getResources(object);
        var importedResources = getResources(imported);
        var currentIndex = _.findIndex(currentResources, { type });
        var importedIndex = _.findIndex(importedResources, { type });
        if (currentIndex !== -1) {
            var currentRes = currentResources[currentIndex];
            var importedRes = importedResources[importedIndex];
            if (_.isEqual(currentRes, importedRes)) {
                currentResources[currentIndex] = res;
                importedResources[importedIndex] = res;
            } else {
                if (importedIndex !== -1) {
                    importedResources[importedIndex] = res;
                } else {
                    importedResources.push(res);
                }
            }
        } else {
            currentResources.push(res);
            importedResources.push(res);
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
